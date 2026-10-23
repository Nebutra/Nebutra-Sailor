import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkAddresses, extractAddresses } from "../lint-email-addresses.mjs";

const manifest = {
  domain: "nebutra.com",
  addresses: [
    { local: "legal", kind: "group" },
    { local: "noreply", kind: "send-only" },
  ],
  placeholders: ["user"],
};

test("extracts nebutra.com addresses, lowercased", () => {
  assert.deepEqual(extractAddresses("mail Legal@Nebutra.com or noreply@nebutra.com."), [
    "legal",
    "noreply",
  ]);
});

test("ignores other domains and lookalikes", () => {
  assert.deepEqual(extractAddresses("a@nebutra.com.evil.io b@example.com c@nebutra.comx"), []);
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
    { address: `credentails@${manifest.domain}`, files: ["SECURITY.md"] },
  ]);
});
