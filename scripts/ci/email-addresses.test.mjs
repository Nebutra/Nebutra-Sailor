import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkAddresses, extractAddresses } from "../lint-email-addresses.mjs";

const manifest = {
  domain: "example.org",
  addresses: [
    { local: "legal", kind: "group" },
    { local: "noreply", kind: "send-only" },
  ],
  placeholders: ["user"],
};

test("extracts addresses on the domain, lowercased", () => {
  assert.deepEqual(
    extractAddresses("mail Legal@Example.org or noreply@example.org.", "example.org"),
    ["legal", "noreply"],
  );
});

test("ignores other domains and lookalikes", () => {
  assert.deepEqual(
    extractAddresses("a@example.org.evil.io b@example.com c@example.orgx", "example.org"),
    [],
  );
});

test("listed addresses and placeholders pass", () => {
  const found = new Map([
    ["legal", ["a.md"]],
    ["user", ["b.test.ts"]],
  ]);
  assert.deepEqual(checkAddresses(manifest, found), []);
});

test("an address missing from the manifest fails with its files", () => {
  const found = new Map([["credentails", ["SECURITY.md"]]]);
  assert.deepEqual(checkAddresses(manifest, found), [
    { address: "credentails@example.org", files: ["SECURITY.md"] },
  ]);
});
