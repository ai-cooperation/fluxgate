import assert from "node:assert/strict";
import test from "node:test";

import { createManualKey, createManualKeyRecord } from "../src/manual-key.js";

test("manual keys use the tier prefix and contain no separators", () => {
  assert.match(createManualKey("member", "0123456789abcdef"), /^mk_[a-z0-9]+$/);
  assert.match(createManualKey("vip", "fedcba9876543210"), /^vk_[a-z0-9]+$/);
});

test("manual key records are compatible with resolveTier records", () => {
  assert.deepEqual(
    createManualKeyRecord("member", "teaching-demo", "2026-08-28T00:00:00.000Z"),
    { tier: "member", label: "teaching-demo", via: "manual", created: "2026-08-28T00:00:00.000Z" },
  );
});

test("manual key creation rejects unsupported tiers and unsafe labels", () => {
  assert.throws(() => createManualKey("anonymous", "0123456789abcdef"), /tier/);
  assert.throws(() => createManualKeyRecord("member", ""), /label/);
  assert.throws(() => createManualKeyRecord("member", "x".repeat(81)), /label/);
});
