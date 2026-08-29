import assert from "node:assert/strict";
import test from "node:test";

import { checkLimits, resolveTier } from "../src/auth.js";
import { firebaseProjectId } from "../src/firebase-auth.js";

class MemoryKV {
  constructor(entries = {}) { this.entries = new Map(Object.entries(entries)); }
  async get(key, type) {
    const value = this.entries.get(key) ?? null;
    return type === "json" && value ? JSON.parse(value) : value;
  }
  async put(key, value) { this.entries.set(key, String(value)); }
}

test("manual member keys resolve without Firebase", async () => {
  const env = { KV: new MemoryKV({ "key:mk_demo": JSON.stringify({ tier: "member", label: "demo", via: "manual" }) }) };
  const request = new Request("https://example.test/generate", { headers: { "X-API-Key": "mk_demo" } });

  assert.deepEqual(await resolveTier(request, env), {
    tier: "member", id: "key:mk_demo", ip: "anon", key: "mk_demo", label: "demo",
  });
});

test("Firebase project id can be read from either public config shape", () => {
  assert.equal(firebaseProjectId({ FIREBASE_PROJECT_ID: "split-project" }), "split-project");
  assert.equal(firebaseProjectId({
    FIREBASE_CONFIG: JSON.stringify({ projectId: "json-project" }),
  }), "json-project");
  assert.equal(firebaseProjectId({}), null);
});

test("anonymous limits require same-site requests and enforce the cooldown", async () => {
  const env = { KV: new MemoryKV() };
  const sameSite = new Request("https://example.test/generate", {
    method: "POST", headers: { Origin: "https://example.test", "CF-Connecting-IP": "203.0.113.10" },
  });
  const who = await resolveTier(sameSite, env);
  assert.equal((await checkLimits(sameSite, env, who)).ok, true);
  assert.equal((await checkLimits(sameSite, env, who)).status, 429);

  const crossSite = new Request("https://example.test/generate", {
    method: "POST", headers: { Origin: "https://attacker.example", "CF-Connecting-IP": "203.0.113.11" },
  });
  const anonymous = await resolveTier(crossSite, env);
  assert.deepEqual(await checkLimits(crossSite, env, anonymous), {
    ok: false, status: 403, error: "匿名僅限在 FluxGate 網站試用；請先免費取得 API key 再用 API。",
  });
});
