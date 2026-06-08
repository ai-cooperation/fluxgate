// 最小 MCP endpoint（JSON-RPC 2.0 over HTTP POST）。
// 提供 generate_image 工具。供 claude.ai / codex / agy 等 agent 呼叫。
// 註：claude.ai remote MCP 可能要 SSE/streamable-http；此處先做 request/response JSON-RPC，
//     大多 client 的 initialize/tools.list/tools.call 走得通。SSE 串流版 reset 後視需要再加。
import { runPipeline } from "./ai.js";
import { store } from "./storage.js";
import { resolveTier, checkAndCount } from "./auth.js";

const TOOL = {
  name: "generate_image",
  description: "用白話意圖生成一張圖。FluxGate 會自動套 FLUX 專用 prompt 工藝（風格分類 + 物理光照鏈 + 大師引用），回傳圖片 URL。",
  inputSchema: {
    type: "object",
    properties: {
      intent: { type: "string", description: "白話的生圖意圖，任何語言，例如「高山湖泊日出」「可愛的橘貓」「資料中心 AI 核心」" },
      ratio: { type: "string", enum: ["16:9", "1:1"], description: "可選，強制長寬比；省略則由風格決定" },
    },
    required: ["intent"],
  },
};

const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

export async function handleMcp(request, env) {
  if (request.method !== "POST") return new Response("MCP: POST only", { status: 405 });
  let msg;
  try { msg = await request.json(); } catch { return Response.json(rpcErr(null, -32700, "parse error")); }
  const { id, method, params } = msg;

  if (method === "initialize") {
    return Response.json(rpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fluxgate", version: "0.1.0" },
    }));
  }
  if (method === "notifications/initialized") return new Response(null, { status: 202 });
  if (method === "tools/list") return Response.json(rpc(id, { tools: [TOOL] }));

  if (method === "tools/call") {
    if (params?.name !== "generate_image") return Response.json(rpcErr(id, -32601, "unknown tool"));
    const intent = params?.arguments?.intent;
    if (!intent) return Response.json(rpcErr(id, -32602, "intent required"));
    const ratio = params?.arguments?.ratio || null;

    const { tier, id: rid } = await resolveTier(request, env);
    const gate = await checkAndCount(env, rid, tier);
    if (!gate.ok) return Response.json(rpc(id, {
      isError: true,
      content: [{ type: "text", text: `額度已用完（${tier} 每日 ${gate.quota} 張）。明日重置或升級權限。` }],
    }));

    try {
      const out = await runPipeline(env, { intent, tier, ratio });
      const key = await store(env, out.bytes, out.contentType);
      const url = `${new URL(request.url).origin}/i/${key}`;
      return Response.json(rpc(id, {
        content: [
          { type: "text", text: `已生成（${out.style}, ${out.width}x${out.height}, ${tier} 剩 ${gate.remaining} 張）\n${url}\n\nprompt: ${out.flux_prompt}` },
        ],
      }));
    } catch (e) {
      return Response.json(rpc(id, { isError: true, content: [{ type: "text", text: `生成失敗：${e.message}` }] }));
    }
  }
  return Response.json(rpcErr(id, -32601, `unknown method: ${method}`));
}
