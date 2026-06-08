// MCP 用的 async job 佇列（KV 存）。generate_image 立刻回 job_id，背景 waitUntil 生圖，check_job poll。
// 目的：避免 MCP 同步阻塞 6-15 秒導致 claude.ai SSE session terminated。
import { runPipeline } from "./ai.js";
import { store } from "./storage.js";
import { recordUsage } from "./firestore.js";

const TTL = 3600; // job 記錄保留 1 小時

export async function createJob(env, data) {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  await env.KV.put(`job:${id}`, JSON.stringify({ status: "queued", ...data, created: Date.now() }), { expirationTtl: TTL });
  return id;
}

export async function getJob(env, id) {
  try { return await env.KV.get(`job:${id}`, "json"); } catch { return null; }
}

async function patchJob(env, id, patch) {
  const cur = (await getJob(env, id)) || {};
  await env.KV.put(`job:${id}`, JSON.stringify({ ...cur, ...patch }), { expirationTtl: TTL });
}

// 背景執行：生圖 → 寫結果到 job
export async function processJob(env, id, { intent, tier, ratio, uid, email, origin }) {
  try {
    await patchJob(env, id, { status: "running" });
    const out = await runPipeline(env, { intent, tier, ratio });
    const key = await store(env, out.bytes, out.contentType);
    if (uid) await recordUsage(env, uid, email);
    await patchJob(env, id, { status: "done", image_url: `${origin}/i/${key}`, style: out.style, width: out.width, height: out.height });
  } catch (e) {
    await patchJob(env, id, { status: "failed", error: String(e?.message || e) });
  }
}
