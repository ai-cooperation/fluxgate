# FluxGate Worker

白話意圖 → FLUX 專用 prompt（自動套 skill 工藝）→ 生圖 → R2 → 回 URL。
全程 Cloudflare 原生（無瀏覽器、無 VM）。REST + MCP 雙介面。內部 + 教學用，不取代 GemGate。

## 架構

```
intent → Worker
  1. resolveTier (X-API-Key → KV → anonymous/member/vip) + 每日限額 (KV 計數)
  2. route:   AI.run(llama-3.3-70b, ROUTER_SYSTEM) → {style, subject}
  3. compose: subject + STYLE_PROFILES[style].suffix  (鎖定槽，永不污染)
  4. flux:    AI.run(flux-1-schnell, {prompt, width, height})
  5. R2 存圖 → 回 {image_url, flux_prompt, ...}
cron 每日清空舊圖（RETENTION_DAYS）
```

檔案：`expander.js`(風格槽+合成) / `auth.js`(權限+限額) / `ai.js`(llama+flux) / `storage.js`(R2) / `mcp.js`(MCP) / `index.js`(路由)。

## 三級權限（解析度 + 每日額）

| tier | key 前綴 | 解析度(16:9 / 1:1) | 每日額 |
|---|---|---|---|
| anonymous | 無 key | 1024×576 / 768² | 20 |
| member | mk_ | 1376×768 / 1024² | 100 |
| vip | vk_ | 1920×1080 / 1152² | 200 |

## 一次性建置（reset 後 deploy 前）

```bash
cd fluxgate-poc/worker
npm install

# 1. 建 R2 bucket
npx wrangler r2 bucket create fluxgate-images

# 2. 建 KV namespace → 把回傳的 id 填進 wrangler.jsonc 的 REPLACE_WITH_KV_ID
npx wrangler kv namespace create KV

# 3. 派 key（範例）
npx wrangler kv key put --binding=KV "key:mk_demo123" '{"tier":"member","label":"老師"}' --remote
npx wrangler kv key put --binding=KV "key:vk_vip456"  '{"tier":"vip","label":"VIP"}'   --remote

# 4. 部署
npx wrangler deploy
```

## 用法

```bash
# REST（匿名）
curl -X POST https://fluxgate.<account>.workers.dev/generate \
  -H 'Content-Type: application/json' -d '{"intent":"高山湖泊日出"}'

# REST（會員）
curl -X POST https://fluxgate.<account>.workers.dev/generate \
  -H 'X-API-Key: mk_demo123' -H 'Content-Type: application/json' \
  -d '{"intent":"資料中心 AI 核心","ratio":"16:9"}'
```

MCP：把 `https://fluxgate.<account>.workers.dev/mcp` 註冊為 remote MCP server，工具 `generate_image`。
（claude.ai 若需 SSE 串流，reset 驗證後再補 streamable-http 版。）

## 待辦（reset 後）
- [ ] 真 deploy + 跑 ../validation_prompts.json 的 9 個意圖端到端驗圖
- [ ] 確認 flux 回傳格式（base64 image 欄位）+ R2 serve content-type 正確
- [ ] MCP 用 claude.ai 實連測（必要時加 SSE）
- [ ] 視需要：custom domain、R2 public bucket（目前由 Worker /i/ 自服務）
