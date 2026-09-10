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

  if (await canAssume()) {
    say("already granted", { role: ROLE, changed: false });
  } else if (process.env.CONFIRM !== "GRANT") {
    say("would grant", { statement: `GRANT ${ROLE} TO ${me} WITH SET TRUE`, changed: false });
    console.log("Not confirmed — re-run with confirm=GRANT to apply.");
  } else {
    // `WITH SET TRUE` is the part that matters: in PostgreSQL 16 membership
    // alone stopped conveying SET ROLE, which is why the existing
    // connection -> postgres -> app_user chain does not work.
    await client.query(`grant ${ROLE} to current_user with set true`);
    say("granted", { role: ROLE, to: me });

    if (!(await canAssume())) {
      console.error(`::error::GRANT succeeded but ${ROLE} still cannot be assumed.`);
      process.exitCode = 1;
    } else {
      say("verified", { assumed: ROLE, changed: true });
    }
  }
} finally {
  await client.end();
}
