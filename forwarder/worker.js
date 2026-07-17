// fluxgate.cooperation.tw -> fluxgate.aicooperation.workers.dev 純轉發器
// 背景：cooperation.tw zone 在個人帳號、FluxGate 本體 2026-06-25 搬到 aicooperation 帳號。
// Cloudflare Custom Domain 不能跨帳號綁（官方明文）、CNAME 跨帳號指 workers.dev 是 1014 禁區，
// 所以個人帳號留這支「零 AI、零 KV、零 R2」的轉發器佔住網域，所有 neuron 從此燒 aicooperation。
// ⚠️ 不要在這支 worker 加回任何 AI/KV/R2 binding —— 那等於把 production 搬回個人帳號。
const UPSTREAM = "fluxgate.aicooperation.workers.dev";
const PUBLIC_HOST = "fluxgate.cooperation.tw";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = UPSTREAM;
    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", PUBLIC_HOST);
    // 匿名試用靠 sameSite 檢查（auth.js：Origin 的 host 必須 === request host）。
    // 經轉發後 request host 變成 UPSTREAM，故把 Origin/Referer 一併改寫成 UPSTREAM，
    // 否則匿名永遠 403（2026-07-17 老師手測抓到）。
    for (const h of ["Origin", "Referer"]) {
      const v = headers.get(h);
      if (v && v.includes(PUBLIC_HOST)) headers.set(h, v.replaceAll(PUBLIC_HOST, UPSTREAM));
    }
    const upstreamResp = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
    const ct = upstreamResp.headers.get("content-type") || "";
    // 文字類回應把 workers.dev 網址改寫回公網網域（image_url、首頁連結、MCP endpoint event）
    if (/json|text|html|javascript|event-stream/.test(ct) && upstreamResp.status !== 101) {
      const body = (await upstreamResp.text()).replaceAll(UPSTREAM, PUBLIC_HOST);
      const h = new Headers(upstreamResp.headers);
      h.delete("content-length");
      return new Response(body, { status: upstreamResp.status, headers: h });
    }
    return upstreamResp; // 圖片等二進位直接串流
  },
};
