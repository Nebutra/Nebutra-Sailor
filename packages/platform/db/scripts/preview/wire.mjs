// =============================================================================
// A Postgres wire endpoint over one in-process PGlite — for local preview only.
// =============================================================================
// PGlite is one Postgres backend in WASM: one session, one transaction at a
// time. Everything in this repo talks to Postgres through `pg` + Prisma's
// `@prisma/adapter-pg`, so the preview database speaks the wire protocol and
// the application code does not change at all — it gets a DATABASE_URL.
//
// Why not @electric-sql/pglite-socket:
//   - 0.0.x (what @prisma/dev ships) serves ONE connection at a time and holds
//     it until the client disconnects. A `pg.Pool` keeps idle connections
//     open, so a second pool — the gateway next to the web app — waits until
//     the first one idles out, then times out.
//   - 0.2.x multiplexes, but switches between connections per MESSAGE unless
//     an explicit BEGIN is open. The extended protocol (Parse/Bind/Execute/Sync
//     — what `pg` sends for every parameterised query) keeps the unnamed
//     statement and portal in the one shared session, so two concurrent
//     queries can bind each other's statements.
//
// This server switches connections only at a safe point: when the engine's
// answer ends in ReadyForQuery with status Idle — no auth exchange, unsynced
// extended-protocol exchange or transaction block of that connection is still
// open. Until then the connection that started holds the engine; everyone
// else queues, first come first served. That is what makes N processes with
// N pools correct against one single-session engine.
//
// Session state is shared by construction (one backend). Transaction-local
// settings — `SET LOCAL ROLE`, `set_config(..., true)`, `SET LOCAL
// statement_timeout`, which is all getTenantDb uses — end with their
// transaction and cannot leak. A session-level `SET` from one connection is
// visible to the next; nothing in this repo's runtime issues one.
// =============================================================================

import { createServer } from "node:net";

const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;
const CANCEL_REQUEST = 80877102;
const PROTOCOL_3 = 196608;

const SYNC = 0x53; // 'S'
const QUERY = 0x51; // 'Q'
const TERMINATE = 0x58; // 'X'

const READY_FOR_QUERY = 0x5a; // 'Z'
const IDLE = 0x49; // 'I'

/**
 * True when the engine's answer ends in ReadyForQuery with status Idle — the
 * one point where no statement, portal, auth exchange or transaction of this
 * connection is still open, so another connection may take the engine.
 */
function idleAfter(reply) {
  const n = reply.length;
  return n >= 6 && reply[n - 6] === READY_FOR_QUERY && reply[n - 2] === 5 && reply[n - 1] === IDLE;
}

/** FIFO ownership of the engine, handed directly to the next waiter. */
class Gate {
  owner = null;
  #waiters = [];

  acquire(conn) {
    if (this.owner === conn) return Promise.resolve();
    if (!this.owner) {
      this.owner = conn;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.#waiters.push({ conn, resolve }));
  }

  release(conn) {
    if (this.owner !== conn) return;
    const next = this.#waiters.shift();
    this.owner = next?.conn ?? null;
    next?.resolve();
  }

  drop(conn) {
    this.#waiters = this.#waiters.filter((w) => w.conn !== conn);
  }

  get queued() {
    return this.#waiters.length;
  }
}

/**
 * @param {import("@electric-sql/pglite").PGlite} db
 * @param {{ idleInTransactionMs?: number, onConnectionCountChange?: (n: number) => void }} [options]
 */
export function createWireServer(db, options = {}) {
  const idleInTransactionMs = options.idleInTransactionMs ?? 60_000;
  const gate = new Gate();
  const sockets = new Set();

  /** Leave the engine at a clean safe point after a connection vanished mid-flight. */
  async function recover() {
    // A Sync ends any half-sent extended-protocol exchange (and clears the
    // error state Postgres enters after a failed Parse/Bind/Execute).
    await db.execProtocolRaw(new Uint8Array([SYNC, 0, 0, 0, 4])).catch(() => undefined);
    if (db.isInTransaction()) await db.exec("ROLLBACK").catch(() => undefined);
  }

  function handle(socket) {
    socket.setNoDelay(true);
    sockets.add(socket);
    options.onConnectionCountChange?.(sockets.size);

    const conn = { socket };
    let buffer = Buffer.alloc(0);
    let started = false;
    let closed = false;
    let chain = Promise.resolve();
    let idleTimer;

    const armIdleTimer = () => {
      clearTimeout(idleTimer);
      if (gate.owner === conn && idleInTransactionMs > 0) {
        idleTimer = setTimeout(() => socket.destroy(), idleInTransactionMs);
        idleTimer.unref?.();
      }
    };

    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(idleTimer);
      sockets.delete(socket);
      options.onConnectionCountChange?.(sockets.size);
      gate.drop(conn);
      chain = chain.then(async () => {
        if (gate.owner === conn) {
          await recover();
          gate.release(conn);
        }
      });
    };

    /** Run complete messages; hand the engine back only at a safe point. */
    async function pump() {
      while (!closed) {
        if (!started) {
          if (buffer.length < 8) return;
          const length = buffer.readInt32BE(0);
          const code = buffer.readInt32BE(4);
          if (code === SSL_REQUEST || code === GSSENC_REQUEST) {
            buffer = buffer.subarray(8);
            socket.write("N");
            continue;
          }
          if (code === CANCEL_REQUEST) {
            socket.destroy();
            return;
          }
          if (buffer.length < length) return;
          if (code !== PROTOCOL_3) {
            socket.destroy();
            return;
          }
          const startup = buffer.subarray(0, length);
          buffer = buffer.subarray(length);
          await gate.acquire(conn);
          // PGlite answers with a cleartext-password request; the connection
          // keeps the engine until the exchange ends in ReadyForQuery.
          const reply = await db.execProtocolRaw(new Uint8Array(startup));
          if (!closed) socket.write(reply);
          if (idleAfter(reply)) gate.release(conn);
          started = true;
          continue;
        }

        // Collect every complete message up to (and including) the first
        // safe-point message, so one exchange is one engine call.
        let end = 0;
        let terminate = false;
        while (buffer.length - end >= 5) {
          const type = buffer[end];
          const length = buffer.readInt32BE(end + 1);
          if (buffer.length - end < 1 + length) break;
          if (type === TERMINATE) {
            terminate = true;
            break;
          }
          end += 1 + length;
          if (type === SYNC || type === QUERY) {
            break;
          }
        }

        if (end > 0) {
          const batch = buffer.subarray(0, end);
          buffer = buffer.subarray(end);
          await gate.acquire(conn);
          clearTimeout(idleTimer);
          const reply = await db.execProtocolRaw(new Uint8Array(batch));
          if (!closed && reply.length) socket.write(reply);
          if (idleAfter(reply)) gate.release(conn);
          armIdleTimer();
        }

        if (terminate) {
          socket.end();
          close();
          return;
        }
        if (end === 0) return;
      }
    }

    socket.on("data", (chunk) => {
      buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
      chain = chain.then(pump).catch((error) => {
        process.stderr.write(`[preview-db] connection error: ${error?.message ?? error}\n`);
        socket.destroy();
      });
    });
    socket.on("close", () => close());
  }

  const servers = [];

  return {
    gate,
    get connections() {
      return sockets.size;
    },
    /** Listen on host:port (port 0 = any free port). Resolves the bound port. */
    listen(port, host = "127.0.0.1") {
      const server = createServer(handle);
      servers.push(server);
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : port);
        });
      });
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await Promise.all(
        servers.map((server) => new Promise((resolve) => server.close(() => resolve()))),
      );
    },
  };
}
