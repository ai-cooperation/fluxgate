// Firestore admin 存取（用 service account 簽 OAuth token + REST）。讀 Firebase tier、寫用量。
// SA JSON 存 wrangler secret env.FB_SERVICE_ACCOUNT。純 Web Crypto，無 firebase-admin（Workers 不支援）。
import { firebaseProjectId } from "./firebase-auth.js";

function firebaseProject(env) {
  const configured = firebaseProjectId(env);
  if (configured) return configured;
  try {
    const projectId = JSON.parse(env.FB_SERVICE_ACCOUNT || "").project_id;
    if (typeof projectId === "string" && projectId.trim()) return projectId.trim();
  } catch { /* optional Firebase integration is not configured */ }
  throw new Error("FIREBASE_PROJECT_ID or service-account project_id is required for Firebase integration");
}

const firestoreBase = (projectId) => `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

let tokCache = { tok: null, exp: 0 };

function pemToPkcs8(pem) {
  const b = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s/g, "");
  const bin = atob(b);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a.buffer;
}
const strB64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bytesB64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken(env) {
  const now = Date.now();
  if (tokCache.tok && tokCache.exp > now) return tokCache.tok;
  const sa = JSON.parse(env.FB_SERVICE_ACCOUNT);
  const iat = Math.floor(now / 1000), exp = iat + 3600;
  const unsigned = strB64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    strB64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: sa.token_uri, iat, exp }));
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${bytesB64url(sig)}`;
  const r = await fetch(sa.token_uri, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("SA token failed: " + JSON.stringify(d).slice(0, 200));
  tokCache = { tok: d.access_token, exp: now + (d.expires_in - 300) * 1000 };
  return d.access_token;
}

// 讀使用者在 FluxGate 的有效 tier（無 membership → defaultTier 'member'；VIP 過期 → 降 member）
export async function getMemberTier(env, uid) {
  const tok = await accessToken(env);
  const r = await fetch(`${firestoreBase(firebaseProject(env))}/users/${uid}`, { headers: { Authorization: `Bearer ${tok}` } });
  if (r.status === 404) return "member";
  if (!r.ok) throw new Error(`Firestore read ${r.status}`);
  const d = await r.json();
  const m = d.fields?.memberships?.mapValue?.fields?.fluxgate?.mapValue?.fields;
  if (!m) return "member";
  const tier = m.tier?.stringValue || "member";
  if (tier === "vip") {
    const exp = m.expiresAt?.timestampValue;
    if (exp && new Date(exp).getTime() < Date.now()) return "member";
  }
  return tier === "guest" ? "guest" : tier;
}

// 記用量 + upsert 使用者 doc：set email、fluxgateUsage.total +1、lastAt=now。
// 用 SA 全權寫，admin / Firebase console 用 email 找得到人 + 看次數。
export async function recordUsage(env, uid, email) {
  try {
    const tok = await accessToken(env);
    const projectId = firebaseProject(env);
    const docName = `projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const write = {
      updateMask: { fieldPaths: [] },
      updateTransforms: [
        { fieldPath: "fluxgateUsage.total", increment: { integerValue: "1" } },
        { fieldPath: "fluxgateUsage.lastAt", setToServerValue: "REQUEST_TIME" },
      ],
      update: { name: docName, fields: {} },
    };
    if (email) { write.update.fields.email = { stringValue: email }; write.updateMask.fieldPaths.push("email"); }
    await fetch(`${firestoreBase(projectId)}:commit`, {
      method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes: [write] }),
    });
  } catch { /* 用量寫失敗不影響生圖 */ }
}

// 由 email 查 uid（grant 後找 uid 用；走 runQuery）
export async function uidByEmail(env, email) {
  const tok = await accessToken(env);
  const r = await fetch(`${firestoreBase(firebaseProject(env))}:runQuery`, {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
        limit: 1,
      },
    }),
  });
  const d = await r.json();
  const doc = Array.isArray(d) ? d.find((x) => x.document) : null;
  return doc ? doc.document.name.split("/").pop() : null;
}
