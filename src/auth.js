// 三級權限 + 額度（KV）。仿 GemGate 派 key。陳老師定 2026-06-08：
//   匿名(無 key)：縮圖、只能在網站試、同 IP 每 5 分鐘 1 張、擋直接 API
//   會員(mk_)   ：720p、每日 20 張
//   VIP(vk_)    ：FHD、每日 50 張
// key 資料存 KV：key:<apikey> -> {"tier":"member","label":"..."}
// 計數：count:<id>:<YYYY-MM-DD>（TTL 2 天）；匿名冷卻：cool:<ip>（TTL 300s）

export const TIER_QUOTA = { anonymous: 0, member: 20, vip: 50 };
const ANON_COOLDOWN = 300; // 秒

const today = () => new Date().toISOString().slice(0, 10);

// 解析來訪者 tier + 計數 id。key 來源：X-API-Key / Authorization Bearer / ?key=。
export async function resolveTier(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = request.headers.get("X-API-Key") || bearer || new URL(request.url).searchParams.get("key");
  if (!key) {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    return { tier: "anonymous", id: `ip:${ip}`, ip, key: null };
  }
  let rec = null;
  try { rec = await env.KV.get(`key:${key}`, "json"); } catch { /* ignore */ }
  const tier = rec?.tier && rec.tier in TIER_QUOTA && rec.tier !== "anonymous" ? rec.tier : "anonymous";
  const ip = request.headers.get("CF-Connecting-IP") || "anon";
  return { tier, id: `key:${key}`, ip, key, label: rec?.label };
}

// 請求是否來自 FluxGate 網站本身（擋匿名直接打 API）
function sameSite(request) {
  const host = new URL(request.url).host;
  const o = request.headers.get("Origin") || request.headers.get("Referer") || "";
  try { return new URL(o).host === host; } catch { return false; }
}

// 檢查額度 / 冷卻並計數。回 {ok, status?, error?, remaining?}。
export async function checkLimits(request, env, who) {
  const { tier, id, ip } = who;
  if (tier === "anonymous") {
    if (!sameSite(request)) {
      return { ok: false, status: 403, error: "匿名僅限在 FluxGate 網站試用；請先免費取得 API key 再用 API。" };
    }
    const ck = `cool:${ip}`;
    let hot = null;
    try { hot = await env.KV.get(ck); } catch { /* ignore */ }
    if (hot) return { ok: false, status: 429, error: "匿名每 5 分鐘只能生 1 張，請稍候，或免費註冊（會員每日 20 張、720p）。" };
    try { await env.KV.put(ck, "1", { expirationTtl: ANON_COOLDOWN }); } catch { /* ignore */ }
    return { ok: true, remaining: null };
  }
  // 會員 / VIP：每日配額
  const quota = TIER_QUOTA[tier] ?? 0;
  const k = `count:${id}:${today()}`;
  let used = 0;
  try { used = parseInt((await env.KV.get(k)) || "0", 10) || 0; } catch { /* ignore */ }
  if (used >= quota) return { ok: false, status: 429, error: `今日額度已用完（${tier} 每日 ${quota} 張），明日重置。` };
  try { await env.KV.put(k, String(used + 1), { expirationTtl: 172800 }); } catch { /* ignore */ }
  return { ok: true, remaining: quota - used - 1 };
}
