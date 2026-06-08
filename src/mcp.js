// MCP endpoint — HTTP+SSE transport（claude.ai custom connector 用此模式，照 agent-kb 實作）。
//   GET  /sse           -> 開 SSE 流，回 `event: endpoint` 告訴 client 往哪 POST
//   POST /mcp/messages  -> JSON-RPC（initialize / tools.list / tools.call）
//   POST /mcp           -> 也接受直接 JSON-RPC（Cursor / curl 等）
// 認證：key 走 URL ?key=（claude.ai connector URL 含 key）或 X-API-Key / Bearer。
import { runPipeline } from "./ai.js";
import { store } from "./storage.js";
import { resolveTier, checkLimits } from "./auth.js";
import { recordUsage } from "./firestore.js";

const TOOL = {
  name: "generate_image",
  description: "用白話意圖生成一張圖。FluxGate 自動套 FLUX 專用 prompt 工藝（風格分類 + 物理光照鏈 + 大師引用），回傳圖片 URL。",
  inputSchema: {
    type: "object",
    properties: {
      intent: { type: "string", description: "白話生圖意圖，任何語言，例如「高山湖泊日出」「可愛的橘貓」「資料中心 AI 核心」" },
      ratio: { type: "string", enum: ["16:9", "1:1"], description: "可選，強制長寬比；省略則由風格決定" },
    },
    required: ["intent"],
  },
};

const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

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

// POST — JSON-RPC dispatcher
export async function handleMcpRpc(request, env) {
  if (request.method !== "POST") return new Response("MCP: POST only", { status: 405 });
  let msg;
  try { msg = await request.json(); } catch { return Response.json(rpcErr(null, -32700, "parse error")); }
  const { id, method, params } = msg;

  if (method === "initialize") {
    return Response.json(rpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fluxgate", version: "0.2.0" },
      instructions: "用白話意圖呼叫 generate_image 生圖；FluxGate 會自動套 FLUX 專業 prompt（風格分類 + 物理光照鏈）。回傳的是圖片 URL。",
    }));
  }
  if (method === "notifications/initialized") return new Response(null, { status: 202 });
  if (method === "tools/list") return Response.json(rpc(id, { tools: [TOOL] }));

  if (method === "tools/call") {
    if (params?.name !== "generate_image") return Response.json(rpcErr(id, -32601, "unknown tool"));
    const intent = params?.arguments?.intent;
    if (!intent) return Response.json(rpcErr(id, -32602, "intent required"));
    const ratio = params?.arguments?.ratio || null;

    const who = await resolveTier(request, env);
    const gate = await checkLimits(request, env, who);
    if (!gate.ok) return Response.json(rpc(id, {
      isError: true,
      content: [{ type: "text", text: who.tier === "anonymous" ? "MCP 需帶 API key（在連接器 URL 加 ?key=你的key）。免費取得：https://fluxgate.cooperation.tw" : gate.error }],
    }));

    try {
      const out = await runPipeline(env, { intent, tier: who.tier, ratio });
      const key = await store(env, out.bytes, out.contentType);
      if (who.uid) await recordUsage(env, who.uid, who.email);
      const u = `${new URL(request.url).origin}/i/${key}`;
      const rem = gate.remaining == null ? "" : `，今日剩 ${gate.remaining} 張`;
      return Response.json(rpc(id, {
        content: [{ type: "text", text: `已生成（${out.style}, ${out.width}x${out.height}${rem}）\n${u}` }],
      }));
    } catch (e) {
      return Response.json(rpc(id, { isError: true, content: [{ type: "text", text: `生成失敗：${e.message}` }] }));
    }
  }
  return Response.json(rpcErr(id, -32601, `unknown method: ${method}`));
}
