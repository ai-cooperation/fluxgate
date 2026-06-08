// 自助發 key（仿 GemGate POST /register）。預設給 member key（mk_）。
// VIP（vk_）由老師後台手動發，不自助。匿名(無 key)免註冊即可用最低畫質。
const today = () => new Date().toISOString().slice(0, 10);

export async function register(request, env) {
  let body = {};
  try { body = await request.json(); } catch { /* allow empty */ }
  const label = String(body.label || body.email || "guest").trim().slice(0, 60) || "guest";

  // 防濫用：同 IP 每日最多發 5 把
  const ip = request.headers.get("CF-Connecting-IP") || "anon";
  const rk = `reg:${ip}:${today()}`;
  let n = 0;
  try { n = parseInt((await env.KV.get(rk)) || "0", 10) || 0; } catch { /* ignore */ }
  if (n >= 5) return Response.json({ error: "今日註冊次數已達上限，請明日再試或聯絡老師升級 VIP" }, 429);

  const key = "mk_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const rec = { tier: "member", label, created: new Date().toISOString() };
  await env.KV.put(`key:${key}`, JSON.stringify(rec));
  try { await env.KV.put(rk, String(n + 1), { expirationTtl: 172800 }); } catch { /* ignore */ }

  const origin = new URL(request.url).origin;
  return Response.json({
    api_key: key,
    connector_url: `${origin}/mcp?key=${key}`, // 直接貼 claude.ai Remote MCP server URL
    tier: "member", quota: 100, label,
  });
}
