// 登入會員領 MCP key（綁 Firebase uid，之後用 key 時讀 live tier）。需 Firebase ID token。
import { firebaseProjectId, verifyIdToken } from "./firebase-auth.js";
import { getMemberTier } from "./firestore.js";

export async function issueMcpKey(request, env) {
  const authH = request.headers.get("Authorization") || "";
  const bearer = authH.startsWith("Bearer ") ? authH.slice(7).trim() : null;
  const u = bearer ? await verifyIdToken(bearer, firebaseProjectId(env)) : null;
  if (!u) return Response.json({ error: "請先用 Google 登入" }, { status: 401 });

  let tier = "member";
  try { tier = await getMemberTier(env, u.uid); } catch { /* default member */ }
  if (tier === "guest") return Response.json({ error: "你的帳號目前無生圖權限，請聯絡老師" }, { status: 403 });

  const prefix = tier === "vip" ? "vk_" : "mk_";
  const key = prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.KV.put(`key:${key}`, JSON.stringify({
    tier, uid: u.uid, email: u.email, label: u.email, via: "firebase", created: new Date().toISOString(),
  }));
  const origin = new URL(request.url).origin;
  return Response.json({ api_key: key, connector_url: `${origin}/sse?key=${key}`, tier });
}
