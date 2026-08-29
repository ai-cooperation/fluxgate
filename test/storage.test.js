import assert from "node:assert/strict";
import test from "node:test";

import { purgeOld, serve, store } from "../src/storage.js";

class MemoryBucket {
  constructor(objects = []) { this.objects = new Map(objects.map((key) => [key, { key }])); this.deleted = []; }
  async put(key, body, options) { this.objects.set(key, { key, body, httpMetadata: options.httpMetadata }); }
  async get(key) {
    const object = this.objects.get(key);
    return object ? { body: object.body, httpMetadata: object.httpMetadata } : null;
  }
  async list() { return { objects: [...this.objects.values()], truncated: false }; }
  async delete(keys) {
    this.deleted.push(...keys);
    for (const key of keys) this.objects.delete(key);
  }
}

test("store writes a dated image object and serve returns its content type", async () => {
  const bucket = new MemoryBucket();
  const key = await store({ IMAGES: bucket }, new Uint8Array([1, 2, 3]), "image/jpeg");
  assert.match(key, /^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.jpg$/);
  const response = await serve({ IMAGES: bucket }, key);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/jpeg");
});

test("purgeOld deletes expired date-prefixed images but keeps examples", async () => {
  const bucket = new MemoryBucket(["2000-01-01/old.jpg", "examples/gallery.jpg"]);
  const deleted = await purgeOld({ IMAGES: bucket, RETENTION_DAYS: "7" });
  assert.equal(deleted, 1);
  assert.deepEqual(bucket.deleted, ["2000-01-01/old.jpg"]);
  assert.equal((await serve({ IMAGES: bucket }, "examples/gallery.jpg")).status, 200);
});
