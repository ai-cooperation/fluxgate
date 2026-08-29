import assert from "node:assert/strict";
import test from "node:test";

import { handleMcpRpc } from "../src/mcp.js";

class MemoryKV {
  constructor(entries = {}) { this.entries = new Map(Object.entries(entries)); }
  async get(key, type) {
    const value = this.entries.get(key) ?? null;
    return type === "json" && value ? JSON.parse(value) : value;
  }
  async put(key, value) { this.entries.set(key, String(value)); }
}

const rpcRequest = (body, headers = {}) => new Request("https://example.test/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("tools/list exposes the stable FluxGate tool contract", async () => {
  const response = await handleMcpRpc(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }), { KV: new MemoryKV() });
  const payload = await response.json();
  assert.deepEqual(payload.result.tools.map((tool) => tool.name), ["generate_image", "check_job"]);
});

test("generate_image creates a queued job for a manual key", async () => {
  const env = { KV: new MemoryKV({ "key:mk_demo": JSON.stringify({ tier: "member", label: "demo", via: "manual" }) }) };
  const response = await handleMcpRpc(rpcRequest({
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: "generate_image", arguments: { intent: "a synthetic test image" } },
  }, { "X-API-Key": "mk_demo" }), env);
  const payload = await response.json();
  assert.match(payload.result.content[0].text, /job_id=[a-f0-9]{10}/);
  assert.equal(payload.result.isError, undefined);
});
