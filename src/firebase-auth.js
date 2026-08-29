// 驗證部署者設定的 Firebase ID token（RS256 JWT 對 Google 公鑰 JWK）。純 Web Crypto，無 SA、無依賴。
const JWK_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwkCache = { keys: null, exp: 0 };

// Firebase is optional. Support both Cloudflare split vars and a JSON public config.
export function firebaseProjectId(env = {}) {
  if (typeof env.FIREBASE_PROJECT_ID === "string" && env.FIREBASE_PROJECT_ID.trim()) {
    return env.FIREBASE_PROJECT_ID.trim();
  }
  if (typeof env.FIREBASE_CONFIG === "string" && env.FIREBASE_CONFIG.trim()) {
    try {
      const projectId = JSON.parse(env.FIREBASE_CONFIG).projectId;
      if (typeof projectId === "string" && projectId.trim()) return projectId.trim();
    } catch { /* optional public config is invalid or not configured */ }
  }
  return null;
}

function b64urlBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
const b64urlStr = (s) => new TextDecoder().decode(b64urlBytes(s));

async function getJwks() {
  const now = Date.now();
  if (jwkCache.keys && jwkCache.exp > now) return jwkCache.keys;
  const r = await fetch(JWK_URL);
  const data = await r.json();
  const m = (r.headers.get("cache-control") || "").match(/max-age=(\d+)/);
  jwkCache = { keys: data.keys, exp: now + (m ? parseInt(m[1], 10) : 3600) * 1000 };
  return data.keys;
}

// 回 {uid, email, name} 或 null（驗證失敗）
export async function verifyIdToken(token, projectId) {
  if (!token || token.split(".").length !== 3) return null;
  let header, payload;
  try {
    const [h, p] = token.split(".");
    header = JSON.parse(b64urlStr(h));
    payload = JSON.parse(b64urlStr(p));
  } catch { return null; }
  if (header.alg !== "RS256") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof projectId !== "string" || !projectId.trim()) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub || payload.exp <= now || payload.iat > now + 300) return null;

  const jwk = (await getJwks()).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    );
    const [h, p, s] = token.split(".");
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return null;
  } catch { return null; }
  return { uid: payload.sub, email: payload.email || null, name: payload.name || null };
}
