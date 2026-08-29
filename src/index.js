// FluxGate Worker — 入口。REST /generate + MCP /mcp + 圖床 /i/* + cron 清空。
import { runPipeline } from "./ai.js";
import { store, serve, purgeOld } from "./storage.js";
import { resolveTier, checkLimits, TIER_QUOTA } from "./auth.js";
import { handleMcpSSE, handleMcpRpc } from "./mcp.js";
import { renderPage } from "./page.js";
import { recordUsage } from "./firestore.js";
import { issueMcpKey } from "./issue.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 首頁（HTML）
    if (path === "/") {
      return new Response(renderPage(env), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 註：舊的 email 自助發 key（/register）已停用；Firebase 會員整合為選配。
    // 登入會員領 MCP key（綁 Firebase uid）
    if (path === "/issue-mcp-key" && request.method === "POST") return issueMcpKey(request, env);
    // 登入者身分（前端顯示 tier）
    if (path === "/me") {
      const who = await resolveTier(request, env);
      return json({ tier: who.tier, email: who.email || null, uid: who.uid || null, loggedIn: !!who.uid });
    }

    // 健康檢查（JSON）
    if (path === "/health") {
      return json({
        service: "fluxgate", status: "ok",
        endpoints: { rest: "POST /generate {intent, ratio?}", mcp: "POST /mcp (SSE)", image: "GET /i/<key>" },
        tiers: {
          anonymous: { res: "512x288 縮圖", limit: "網站試用，每 5 分鐘 1 張" },
          member: { res: "1280x720", limit: `每日 ${TIER_QUOTA.member} 張` },
          vip: { res: "1280x720", limit: `每日 ${TIER_QUOTA.vip} 張` },
        },
      });
    }

    // 圖床
    if (path.startsWith("/i/")) return serve(env, decodeURIComponent(path.slice(3)));

    // MCP — GET 開 SSE 流；POST 走 JSON-RPC（claude.ai HTTP+SSE transport）
    if ((path === "/sse" || path === "/mcp") && request.method === "GET") return handleMcpSSE(request, env);
    if (path === "/mcp" || path === "/mcp/messages" || path === "/sse") return handleMcpRpc(request, env, ctx);

    // REST 生圖
    if (path === "/generate" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "invalid json body" }, 400); }
      const intent = body?.intent;
      // 進階/測試：直接給 style+subject 可跳過 router
      const bypass = body?.style && body?.subject;
      if (!intent && !bypass) return json({ error: "intent required (or style+subject)" }, 400);

      const who = await resolveTier(request, env);
      const gate = await checkLimits(request, env, who);
      if (!gate.ok) return json({ error: gate.error, tier: who.tier }, gate.status || 429);

      try {
        const out = await runPipeline(env, {
          intent,
          tier: who.tier,
          ratio: body?.ratio || null,
          style: body?.style || null,
          subject: body?.subject || null,
          quality: body?.quality || "standard",
        });
        const key = await store(env, out.bytes, out.contentType);
        if (who.uid) ctx.waitUntil(recordUsage(env, who.uid, who.email)); // 用量寫 Firebase Firestore
        return json({
          ok: true,
          image_url: `${url.origin}/i/${key}`,
          style: out.style, width: out.width, height: out.height, steps: out.steps, quality: out.quality,
          flux_prompt: out.flux_prompt, subject: out.subject,
          tier: who.tier, label: who.label, remaining_today: gate.remaining,
        });
      } catch (e) {
        return json({ error: "generation failed", detail: e.message }, 502);
      }
    }

    return json({ error: "not found" }, 404);
  },

  // 每日清空舊圖（失敗發 TG 告警，依 automation 規範。secret 未設則靜默 no-op）
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const n = await purgeOld(env);
        console.log(`purged ${n} old images`);
      } catch (e) {
        console.error("purge failed", e);
        await tgAlert(env, `FluxGate 警告：每日清圖 cron 失敗：${e.message}`);
      }
    })());
  },
};

// Telegram 告警（TG_TOKEN/TG_CHAT 為 wrangler secret/var，未設則不發）
async function tgAlert(env, text) {
  if (!env.TG_TOKEN || !env.TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT, text }),
    });
  } catch { /* 告警失敗不影響主流程 */ }
}
