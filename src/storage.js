// R2 圖床：存圖 + 由 Worker 自己服務（不需 R2 public bucket 設定）+ cron 清空。
const EXT = { "image/png": "png", "image/jpeg": "jpg" };

// 存進 R2，key = YYYY-MM-DD/<uuid>.<ext>，回 key
export async function store(env, bytes, contentType) {
  const date = new Date().toISOString().slice(0, 10);
  const key = `${date}/${crypto.randomUUID()}.${EXT[contentType] || "png"}`;
  await env.IMAGES.put(key, bytes, { httpMetadata: { contentType } });
  return key;
}

// GET /i/<key> -> 從 R2 回圖
export async function serve(env, key) {
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// cron：刪除超過 RETENTION_DAYS 天的圖（key 前綴 YYYY-MM-DD 比對）
export async function purgeOld(env) {
  const days = parseInt(env.RETENTION_DAYS || "7", 10);
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  let cursor, deleted = 0;
  do {
    const list = await env.IMAGES.list({ cursor, limit: 1000 });
    const old = list.objects.filter((o) => o.key.slice(0, 10) < cutoff).map((o) => o.key);
    for (let i = 0; i < old.length; i += 1000) await env.IMAGES.delete(old.slice(i, i + 1000));
    deleted += old.length;
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  return deleted;
}
