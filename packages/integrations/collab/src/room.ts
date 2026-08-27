/**
 * A single tenant-scoped CRDT room. One `Y.Doc` per (tenant, room). The hub
 * owns the partitioning; this class assumes its `tenantId`/`roomId` are
 * already the partition it belongs to and never reaches outside them.
 *
 * Snapshot persistence is serialized through `withTenantLock(tenantId,
 * roomId, ...)` borrowed from `@nebutra/tenant-store` rather than a
 * hand-rolled mutex — same primitive used by canvas/reel, so a future swap
 * to a distributed lock changes one place.
 */

import { withTenantLock } from "@nebutra/tenant-store";
import * as Y from "yjs";
import { CollabError } from "./errors";
import type { CollabRoom, CollabTransport, SnapshotStore, UpdateListener } from "./types";

/** Origin tag used when applying remote updates so we don't echo them back. */
const REMOTE_ORIGIN = Symbol("collab.remote");

export class Room implements CollabRoom {
  readonly doc: Y.Doc;
  private readonly listeners = new Set<UpdateListener>();
  private readonly unsubTransport: () => void;
  private destroyed = false;

  constructor(
    readonly tenantId: string,
    readonly roomId: string,
    private readonly store: SnapshotStore,
    private readonly transport: CollabTransport,
  ) {
    this.doc = new Y.Doc();

    // Fan local updates out to: registered listeners + the transport. The
    // transport echo is guarded by origin so a remote-applied update is not
    // re-broadcast into a loop.
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      for (const cb of [...this.listeners]) cb(update, origin);
      if (origin !== REMOTE_ORIGIN) {
        void Promise.resolve(this.transport.broadcast(this.tenantId, this.roomId, update)).catch(
          () => {
            // Transport delivery is best-effort; CRDT state stays correct and
            // converges on the next exchanged update. Swallowing here avoids
            // an unhandled rejection from a flaky network adapter.
          },
        );
      }
    });

    // Remote updates for THIS tenant-scoped channel only.
    this.unsubTransport = this.transport.subscribe(this.tenantId, this.roomId, (update) => {
      if (this.destroyed) return;
      Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    });
  }

  applyUpdate(update: Uint8Array, origin?: unknown): void {
    this.assertLive();
    Y.applyUpdate(this.doc, update, origin);
  }

  encodeState(): Uint8Array {
    this.assertLive();
    return Y.encodeStateAsUpdate(this.doc);
  }

  onUpdate(cb: UpdateListener): () => void {
    this.assertLive();
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  async snapshot(): Promise<void> {
    this.assertLive();
    const state = this.encodeState();
    try {
      // Serialize concurrent snapshots of the SAME room; different rooms (or
      // the same room under another tenant) persist in parallel.
      await withTenantLock(this.tenantId, this.roomId, () =>
        this.store.save(this.tenantId, this.roomId, state),
      );
    } catch (cause) {
      throw new CollabError(`Failed to persist snapshot for room "${this.roomId}".`, {
        code: "COLLAB_SNAPSHOT_FAILED",
        suggestion:
          "Verify the configured SnapshotStore is reachable (DB/Redis up, " +
          "credentials valid). The in-memory default never fails; a custom " +
          "adapter likely threw.",
        cause,
      });
    }
  }

  /** Hydrate this doc from persisted state, if any. Internal to the hub. */
  async _restore(): Promise<void> {
    try {
      const persisted = await this.store.load(this.tenantId, this.roomId);
      if (persisted) Y.applyUpdate(this.doc, persisted, REMOTE_ORIGIN);
    } catch (cause) {
      throw new CollabError(`Failed to restore room "${this.roomId}" from snapshot store.`, {
        code: "COLLAB_RESTORE_FAILED",
        suggestion:
          "Check the SnapshotStore adapter's load() — it should resolve " +
          "null (not throw) when no snapshot exists for the tenant+room.",
        cause,
      });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubTransport();
    this.listeners.clear();
    this.doc.destroy();
  }

  private assertLive(): void {
    if (this.destroyed) {
      throw new CollabError(`Room "${this.roomId}" was destroyed and can no longer be used.`, {
        code: "COLLAB_DESTROYED",
        suggestion:
          "Acquire a fresh room via hub.room(tenantId, roomId) instead of " +
          "reusing a destroyed instance.",
      });
    }
  }
}
