// 三級權限 + 額度（KV）。仿 GemGate 派 key。陳老師定 2026-06-08：
//   匿名(無 key)：縮圖、只能在網站試、同 IP 每 5 分鐘 1 張、擋直接 API
//   會員(mk_)   ：720p、每日 20 張
//   VIP(vk_)    ：720p、每日 50 張（額度多，非更高畫質；FHD 太燒 neuron 不給）
// key 資料存 KV：key:<apikey> -> {"tier":"member","label":"..."}
// 計數：count:<id>:<YYYY-MM-DD>（TTL 2 天）；匿名冷卻：cool:<ip>（TTL 300s）

import { firebaseProjectId, verifyIdToken } from "./firebase-auth.js";
import { getMemberTier } from "./firestore.js";

export const TIER_QUOTA = { anonymous: 0, member: 20, vip: 50 };
const ANON_COOLDOWN = 300; // 秒

const today = () => new Date().toISOString().slice(0, 10);

// 解析來訪者 tier + 計數 id。
//   web 登入 → Authorization Bearer = Firebase ID token → 驗證 + 讀選配的 Firebase tier
//   MCP/REST → X-API-Key / Bearer mk_|vk_ / ?key= → KV 查 tier
//   皆無 → 匿名
export async function resolveTier(request, env) {
  const authH = request.headers.get("Authorization") || "";
  const bearer = authH.startsWith("Bearer ") ? authH.slice(7).trim() : null;
  const xkey = request.headers.get("X-API-Key");
  const qkey = new URL(request.url).searchParams.get("key");
  const ip = request.headers.get("CF-Connecting-IP") || "anon";

  // 1) Firebase ID token（web 登入）：是 JWT 且非 mk_/vk_
  if (bearer && bearer.split(".").length === 3 && !/^[mv]k_/.test(bearer)) {
    const u = await verifyIdToken(bearer, firebaseProjectId(env));
    if (u) {
      let tier = "member";
      try { tier = await getMemberTier(env, u.uid); } catch { tier = "member"; }
      if (tier === "guest") tier = "anonymous"; // 被擋 → 等同匿名（縮圖）
      return { tier, id: `uid:${u.uid}`, uid: u.uid, email: u.email, ip, via: "firebase" };
    }
  }
  // 2) API key（MCP / REST）：mk_ / vk_
  const key = xkey || (bearer && /^[mv]k_/.test(bearer) ? bearer : null) || qkey;
  if (key) {
    let rec = null;
    try { rec = await env.KV.get(`key:${key}`, "json"); } catch { /* ignore */ }
    // Firebase 簽發的 key（綁 uid）→ 讀 live tier（VIP 過期/被降即時反映），用量/額度按 uid
    if (rec?.uid) {
      let tier = rec.tier || "member";
      try { tier = await getMemberTier(env, rec.uid); } catch { /* 失敗用 rec.tier */ }
      if (tier === "guest") tier = "anonymous";
      return { tier, id: `uid:${rec.uid}`, ip, key, uid: rec.uid, email: rec.email, via: "firebase-key" };
    }
    // 手動派發的 key（無 uid）→ rec.tier
    const tier = rec?.tier && rec.tier in TIER_QUOTA && rec.tier !== "anonymous" ? rec.tier : "anonymous";
    return { tier, id: `key:${key}`, ip, key, label: rec?.label };
  }
  // 3) 匿名
  return { tier: "anonymous", id: `ip:${ip}`, ip, key: null };
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
