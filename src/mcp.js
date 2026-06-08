// MCP endpoint — HTTP+SSE transport（claude.ai custom connector 用此模式，照 agent-kb 實作）。
//   GET  /sse           -> 開 SSE 流，回 `event: endpoint` 告訴 client 往哪 POST
//   POST /mcp/messages  -> JSON-RPC（initialize / tools.list / tools.call）
//   POST /mcp           -> 也接受直接 JSON-RPC（Cursor / curl 等）
// 認證：key 走 URL ?key=（claude.ai connector URL 含 key）或 X-API-Key / Bearer。
import { resolveTier, checkLimits } from "./auth.js";
import { createJob, getJob, processJob } from "./jobs.js";

// 兩個工具：generate_image（提交 job，立刻回 job_id）+ check_job（poll 結果）。
// 非同步避免同步阻塞 6-15 秒導致 claude.ai SSE session terminated。
const TOOLS = [
  {
    name: "generate_image",
    description: "提交一張 AI 生圖工作（非同步）。FluxGate 自動套 FLUX 專用 prompt 工藝（風格分類 + 物理光照鏈 + 大師引用）。立刻回 job_id；接著用 check_job(job_id) 查詢結果（約 10-20 秒，poll 每 3-5 秒一次）。",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", description: "白話生圖意圖，任何語言，例如「高山湖泊日出」「可愛的橘貓」「資料中心 AI 核心」" },
        ratio: { type: "string", enum: ["16:9", "1:1"], description: "可選，強制長寬比；省略則由風格決定" },
      },
      required: ["intent"],
    },
  },
  {
    name: "check_job",
    description: "查詢 generate_image 提交的生圖工作狀態。queued/running=還在跑請繼續 poll；done=回圖片 URL；failed=含錯誤。",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string", description: "generate_image 回的 job_id" } },
      required: ["job_id"],
    },
  },
];

const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
const toolText = (text, isError) => ({ ...(isError ? { isError: true } : {}), content: [{ type: "text", text }] });

// GET /sse — 開 SSE 流，告訴 client 往哪個 URL POST JSON-RPC
export function handleMcpSSE(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const msgUrl = `${url.origin}/mcp/messages${key ? `?key=${encodeURIComponent(key)}` : ""}`;
  const enc = new TextEncoder();
  let hb = null;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`event: endpoint\ndata: ${msgUrl}\n\n`));
      hb = setInterval(() => {
        try { c.enqueue(enc.encode(`: keepalive\n\n`)); }
        catch { if (hb) clearInterval(hb); }
      }, 15000);
    },
    cancel() { if (hb) clearInterval(hb); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST — JSON-RPC dispatcher（ctx 用來 waitUntil 背景生圖）
export async function handleMcpRpc(request, env, ctx) {
  if (request.method !== "POST") return new Response("MCP: POST only", { status: 405 });
  let msg;
  try { msg = await request.json(); } catch { return Response.json(rpcErr(null, -32700, "parse error")); }
  const { id, method, params } = msg;

  if (method === "initialize") {
    return Response.json(rpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fluxgate", version: "0.2.0" },
      instructions: "用 generate_image(intent) 提交生圖（非同步，立刻回 job_id），再用 check_job(job_id) poll 結果（每 3-5 秒一次，約 10-20 秒完成）。",
    }));
  }
  if (method === "notifications/initialized") return new Response(null, { status: 202 });
  if (method === "tools/list") return Response.json(rpc(id, { tools: TOOLS }));

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    // check_job：poll 結果
    if (name === "check_job") {
      const job = await getJob(env, args.job_id);
      if (!job) return Response.json(rpc(id, toolText(`查無此 job_id（可能已過期，請重新 generate_image）`, true)));
      if (job.status === "done") return Response.json(rpc(id, toolText(`完成（${job.style}, ${job.width}x${job.height}）\n${job.image_url}`)));
      if (job.status === "failed") return Response.json(rpc(id, toolText(`生成失敗：${job.error}`, true)));
      return Response.json(rpc(id, toolText(`狀態：${job.status}（還在跑，請 3-5 秒後再 check_job）`)));
    }

    // generate_image：提交 job，立刻回 job_id；背景 waitUntil 生圖
    if (name === "generate_image") {
      const intent = args.intent;
      if (!intent) return Response.json(rpcErr(id, -32602, "intent required"));
      const who = await resolveTier(request, env);
      const gate = await checkLimits(request, env, who);
      if (!gate.ok) return Response.json(rpc(id, toolText(
        who.tier === "anonymous" ? "MCP 需帶 API key（連接器 URL 加 ?key=你的key）。免費取得：https://fluxgate.cooperation.tw" : gate.error, true)));

      const origin = new URL(request.url).origin;
      const jobId = await createJob(env, { intent, tier: who.tier, ratio: args.ratio || null, uid: who.uid, email: who.email, origin });
      const p = processJob(env, jobId, { intent, tier: who.tier, ratio: args.ratio || null, uid: who.uid, email: who.email, origin });
      if (ctx && ctx.waitUntil) ctx.waitUntil(p); else p.catch(() => {});
      const rem = gate.remaining == null ? "" : `（今日剩 ${gate.remaining} 張）`;
      return Response.json(rpc(id, toolText(`已排隊生圖${rem}。job_id=${jobId}\n約 10-20 秒，請用 check_job("${jobId}") 查結果（每 3-5 秒 poll 一次）。`)));
    }

    return Response.json(rpcErr(id, -32601, `unknown tool: ${name}`));
  }
  return Response.json(rpcErr(id, -32601, `unknown method: ${method}`));
}
