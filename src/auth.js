// 三級權限 + 每日用量限額（KV）。仿 GemGate 派 key。
// 匿名(無 key)=最低畫質+低額；會員(mk_)=1376；VIP(vk_)=1920。
// key 資料存 KV：  key:<apikey> -> {"tier":"member","label":"..."}
// 用量計數：       count:<id>:<YYYY-MM-DD> -> 整數（TTL 2 天）

export const TIER_QUOTA = { anonymous: 20, member: 100, vip: 200 };

const today = () => new Date().toISOString().slice(0, 10);

// 解析來訪者 tier + 計數 id。無 key -> 依 IP 匿名。
export async function resolveTier(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = request.headers.get("X-API-Key") || bearer || new URL(request.url).searchParams.get("key");
  if (!key) {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    return { tier: "anonymous", id: `ip:${ip}`, key: null };
  }
  let rec = null;
  try { rec = await env.KV.get(`key:${key}`, "json"); } catch { /* ignore */ }
  const tier = rec?.tier && TIER_QUOTA[rec.tier] ? rec.tier : "anonymous";
  return { tier, id: `key:${key}`, key, label: rec?.label };
}

// 檢查並 +1。回 {ok, used, quota, remaining}。
export async function checkAndCount(env, id, tier) {
  const quota = TIER_QUOTA[tier] ?? TIER_QUOTA.anonymous;
  const k = `count:${id}:${today()}`;
  let used = 0;
  try { used = parseInt((await env.KV.get(k)) || "0", 10) || 0; } catch { /* ignore */ }
  if (used >= quota) return { ok: false, used, quota, remaining: 0 };
  try { await env.KV.put(k, String(used + 1), { expirationTtl: 172800 }); } catch { /* ignore */ }
  return { ok: true, used: used + 1, quota, remaining: quota - used - 1 };
}
