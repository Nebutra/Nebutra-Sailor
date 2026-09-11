#!/usr/bin/env node
/**
 * Let the connection role assume APP_DB_ROLE, so tenant queries run under RLS.
 *
 * `getTenantDb()` issues `SET ROLE app_user`. The router's connection role
 * cannot, so `/v1/limits` returns 500 — and, more quietly, every wallet read
 * that would have been RLS-scoped is not scoped at all.
 *
 * The grant does not widen anything. `app_user` has `rolbypassrls = false`
 * while the connection role has it true, so this lets a privileged role step
 * *down* into the restricted one. Leaving it ungranted is the weaker state,
 * not the safer one.
 *
 * Verifies by actually assuming the role and resetting. A grant that did not
 * take is reported as a failure rather than as success.
 */
import pg from "pg";

const ROLE = "app_user";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const say = (label, value) => console.log(`GRANT ${label}: ${JSON.stringify(value)}`);

async function canAssume() {
  try {
    await client.query(`set role ${ROLE}`);
    await client.query("reset role");
    return true;
  } catch {
    return false;
  }
}

await client.connect();
try {
  const me = (await client.query("select current_user")).rows[0].current_user;
  say("connection role", me);

  // Resolve the target first. Whether *this* connection can already assume the
  // role says nothing about another one, and checking that first is how a run
  // aimed at the app's role short-circuited on the runner's own grant and
  // reported "already granted" while the app stayed broken.
  const target = (process.env.GRANT_TO ?? "").trim();
  if (target && !/^[A-Za-z0-9_.]+$/.test(target)) {
    throw new Error(`GRANT_TO is not a plain role name: ${target}`);
  }
  const other = target !== "" && target !== me;
  const grantee = target ? `"${target}"` : "current_user";

  if (!other && (await canAssume())) {
    say("already granted", { role: ROLE, to: me, changed: false });
  } else if (process.env.CONFIRM !== "GRANT") {
    say("would grant", {
      statement: `GRANT ${ROLE} TO ${target || me} WITH SET TRUE`,
      changed: false,
    });
    console.log("Not confirmed — re-run with confirm=GRANT to apply.");
  } else {
    // `WITH SET TRUE` is the part that matters: in PostgreSQL 16 membership
    // alone stopped conveying SET ROLE, which is why the existing
    // connection -> postgres -> app_user chain does not work.
    //
    // PlanetScale usernames carry a `.<branch-id>` suffix, so the role a runner
    // connects as and the role an app connects as are different roles. The
    // grant has to name the one that is actually failing.
    await client.query(`grant ${ROLE} to ${grantee} with set true`);
    say("granted", { role: ROLE, to: target || me, changed: true });

    if (other) {
      say("not verified here", {
        reason: "this connection cannot SET ROLE as another role",
        verify: "call the endpoint that uses it",
      });
    } else if (!(await canAssume())) {
      console.error(`::error::GRANT succeeded but ${ROLE} still cannot be assumed.`);
      process.exitCode = 1;
    } else {
      say("verified", { assumed: ROLE, changed: true });
    }
  }
} finally {
  await client.end();
}
