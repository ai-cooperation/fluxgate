// MCP 用的 job 佇列（KV 存）。generate_image 立刻回 job_id（不生圖）；
// check_job 第一次被呼叫時「同步」把圖生出來（~8 秒），可靠完成 —— 不靠 ctx.waitUntil（best-effort 會偶爾被砍致卡 running）。
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
  const next = { ...cur, ...patch };
  await env.KV.put(`job:${id}`, JSON.stringify(next), { expirationTtl: TTL });
  return next;
}

// 推進 job：queued → 同步生成 → done/failed。回最新 job。已 running/done/failed 則直接回。
// 由 check_job 呼叫 —— 生成在「這個 request」內同步完成，保證有結果（不依賴 waitUntil）。
export async function driveJob(env, id) {
  const job = await getJob(env, id);
  if (!job) return null;
  if (job.status !== "queued") return job;
  await patchJob(env, id, { status: "running" }); // 佔位，避免併發重複生
  try {
    const out = await runPipeline(env, { intent: job.intent, tier: job.tier, ratio: job.ratio });
    const key = await store(env, out.bytes, out.contentType);
    if (job.uid) await recordUsage(env, job.uid, job.email);
    return patchJob(env, id, { status: "done", image_url: `${job.origin}/i/${key}`, style: out.style, width: out.width, height: out.height });
  } catch (e) {
    return patchJob(env, id, { status: "failed", error: String(e?.message || e) });
  }
}
