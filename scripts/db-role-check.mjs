#!/usr/bin/env node
/**
 * Read-only: can the connection role assume APP_DB_ROLE?
 *
 * `/v1/limits` fails with `APP_DB_ROLE="app_user" could not be assumed via SET
 * ROLE`. Whether the answer is a GRANT or a CREATE ROLE changes what the fix
 * should be, and a production privilege change made on a guess is not a fix.
 * Every statement here reads; `set role` is reset immediately.
 */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const say = (label, value) => console.log(`PROBE ${label}: ${JSON.stringify(value)}`);

await client.connect();
try {
  say("connection", (await client.query("select current_user, session_user")).rows[0]);

  say(
    "roles",
    (
      await client.query(
        `select rolname, rolcanlogin, rolbypassrls, rolsuper
           from pg_roles
          where rolname in ('app_user', 'authenticator') or rolname = current_user
          order by rolname`,
      )
    ).rows,
  );

  say(
    "memberships",
    (
      await client.query(
        `select r.rolname as grantee, g.rolname as granted
           from pg_auth_members m
           join pg_roles r on r.oid = m.member
           join pg_roles g on g.oid = m.roleid
          where r.rolname = current_user or g.rolname = 'app_user'`,
      )
    ).rows,
  );

  try {
    await client.query("set role app_user");
    say("set role app_user", {
      ok: true,
      now: (await client.query("select current_user")).rows[0],
    });
    await client.query("reset role");
  } catch (error) {
    say("set role app_user", { ok: false, error: error.message });
  }
} finally {
  await client.end();
}
