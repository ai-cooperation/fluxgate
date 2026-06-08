// FluxGate Worker — 入口。REST /generate + MCP /mcp + 圖床 /i/* + cron 清空。
import { runPipeline } from "./ai.js";
import { store, serve, purgeOld } from "./storage.js";
import { resolveTier, checkAndCount, TIER_QUOTA } from "./auth.js";
import { handleMcp } from "./mcp.js";
import { register } from "./register.js";
import { PAGE } from "./page.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 首頁（HTML）
    if (path === "/") {
      return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 自助發 key
    if (path === "/register" && request.method === "POST") return register(request, env);

    // 健康檢查（JSON）
    if (path === "/health") {
      return json({
        service: "fluxgate", status: "ok",
        endpoints: { rest: "POST /generate {intent, ratio?}", mcp: "POST /mcp", image: "GET /i/<key>" },
        tiers: TIER_QUOTA,
      });
    }

    // 圖床
    if (path.startsWith("/i/")) return serve(env, decodeURIComponent(path.slice(3)));

    // MCP
    if (path === "/mcp" || path === "/sse") return handleMcp(request, env);

    // REST 生圖
    if (path === "/generate" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "invalid json body" }, 400); }
      const intent = body?.intent;
      // 進階/測試：直接給 style+subject 可跳過 router
      const bypass = body?.style && body?.subject;
      if (!intent && !bypass) return json({ error: "intent required (or style+subject)" }, 400);

      const { tier, id, label } = await resolveTier(request, env);
      const gate = await checkAndCount(env, id, tier);
      if (!gate.ok) return json({ error: "quota exceeded", tier, quota: gate.quota }, 429);

      try {
        const out = await runPipeline(env, { intent, tier, ratio: body?.ratio || null, style: body?.style || null, subject: body?.subject || null });
        const key = await store(env, out.bytes, out.contentType);
        return json({
          ok: true,
          image_url: `${url.origin}/i/${key}`,
          style: out.style, width: out.width, height: out.height,
          flux_prompt: out.flux_prompt, subject: out.subject,
          tier, label, remaining_today: gate.remaining,
        });
      } catch (e) {
        return json({ error: "generation failed", detail: e.message }, 502);
      }
    }

    return json({ error: "not found" }, 404);
  },

  // 每日清空舊圖
  async scheduled(event, env, ctx) {
    ctx.waitUntil(purgeOld(env).then((n) => console.log(`purged ${n} old images`)));
  },
};
