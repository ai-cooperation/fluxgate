# FluxGate

FluxGate 是一個 Cloudflare-native 的 AI 生圖閘道：把白話意圖轉成 FLUX-ready prompt，呼叫 Workers AI 生成圖片，並透過 REST / MCP 讓網站或 agent 使用。

FluxGate is a Cloudflare-native image generation gateway: it turns plain-language intent into FLUX-ready prompts, generates images with Workers AI, and exposes the workflow through REST and MCP.

## Features / 功能

- REST API: `POST /generate`
- MCP endpoint for Claude / agent tools: `/sse` and `/mcp`
- Workers AI routing: intent classification + FLUX prompt composition
- Optional R2 image storage served by the Worker at `/i/<key>`
- KV-backed API keys, usage counters, anonymous cooldowns and MCP jobs
- Homepage demo with example prompts in Chinese and English
- Editorial personal-brand prompt profile for Instagram carousel covers and presentation concept visuals

## Architecture / 架構

```text
intent / 使用者意圖
  -> resolveTier: Firebase / API key / anonymous
  -> checkLimits: KV quota or anonymous cooldown
  -> route: Workers AI Llama -> { style, subject }
  -> compose: subject + locked style profile
  -> flux: Workers AI FLUX.1-schnell
  -> R2: store image bytes
  -> response: image_url, prompt, style, dimensions
```

Generated images use date-prefixed R2 keys such as `YYYY-MM-DD/<uuid>.jpg`.
The scheduled cleanup removes old generated images after `RETENTION_DAYS` days.
Homepage examples use `examples/...` keys and are intentionally retained.

產出的圖片預設使用 `YYYY-MM-DD/<uuid>.jpg` 這類 R2 key，排程會依 `RETENTION_DAYS` 清除舊圖。
首頁範例圖使用 `examples/...`，不會被日期清理邏輯刪除。

## Production Topology / 正式部署架構（維護前必讀）

正式站是**雙帳號雙 worker**，不是單一部署：

| Worker | 帳號 | 部署方式 |
|---|---|---|
| 本體（本 repo 根目錄） | 生圖帳號（Workers AI / KV / R2 / secrets 都在這） | 登入生圖帳號 → `npx wrangler deploy -c wrangler.aicooperation.jsonc`（該檔不入 git） |
| 公網轉發器 [`forwarder/`](forwarder/) | cooperation.tw zone 所在帳號 | 登入 zone 帳號 → `cd forwarder && npx wrangler deploy` |

`fluxgate.cooperation.tw` 綁在轉發器上；為什麼要拆兩個帳號、三處必要改寫、
部署驗證清單、踩雷史，全部在 [`forwarder/README.md`](forwarder/README.md)——**改架構前先讀它**。
行為契約（endpoints / 分級額度 / 錯誤碼 / invariants）see [`SPEC.md`](SPEC.md)——**改行為前先讀它**。

## Manual Setup Checklist / 手動設定清單

These steps cannot be fully automated because they depend on the Cloudflare account owner.

以下步驟需要帳號擁有者手動完成，不能只靠程式碼自動處理。

| item | 中文說明 | English |
|---|---|---|
| Cloudflare authorization | 執行 `npx wrangler login`，在瀏覽器授權正確的 Cloudflare 帳號。 | Run `npx wrangler login` and authorize the correct Cloudflare account in the browser. |
| Workers AI | 確認帳號可使用 Workers AI；FluxGate 需要 `env.AI` binding。 | Ensure Workers AI is available; FluxGate needs the `env.AI` binding. |
| KV namespace | 建立 KV，填入 `wrangler.jsonc` 的 `KV` id。 | Create KV and place the namespace id in `wrangler.jsonc`. |
| R2 storage | 若要回傳可分享圖片 URL 或支援 MCP，請開啟 R2 並建立 `fluxgate-images`。 | Enable R2 and create `fluxgate-images` if you need shareable image URLs or MCP usage. |
| workers.dev subdomain | 新帳號第一次部署時需註冊 `<subdomain>.workers.dev`。 | New Cloudflare accounts must register a workers.dev subdomain before publishing. |
| Secrets | Firebase / Telegram 是選配，只在登入會員與告警需要。 | Firebase / Telegram secrets are optional and only needed for login tiers and alerts. |

## Agent Quick Deploy / Agent 快速部署

The committed `wrangler.jsonc` is an agent-readable deployment template.
Account-specific files such as `wrangler.production.jsonc` should stay local and out of Git.

Repo 內的 `wrangler.jsonc` 是給 agent 快速理解與部署用的範本。
正式帳號設定檔，例如 `wrangler.production.jsonc`，應留在本機或 CI secret 管理，不要 commit。

```bash
# 1. Install dependencies / 安裝依賴
npm install

# 2. Authorize Cloudflare / 授權 Cloudflare
npx wrangler login

# 3. Create storage / 建立儲存資源
npx wrangler kv namespace create KV
npx wrangler r2 bucket create fluxgate-images

# 4. Put the returned KV id into wrangler.jsonc
# 4. 把 KV id 填入 wrangler.jsonc

# 5. Deploy / 部署
npx wrangler deploy

# 6. Verify / 驗證
curl https://<your-worker>.workers.dev/health
```

Production agents should verify:

正式部署 agent 應驗證：

- `npm test`
- `node --check src/index.js`
- `curl /health` returns `status: ok`
- At least one `/i/examples/...jpg` returns `HTTP 200`
- One low-cost `quality: "draft"` generation succeeds before running larger tests

## R2 Storage Strategy / R2 儲存策略

Default mode uses R2 because Claude and other MCP clients work best when the tool returns a normal image URL.

預設模式使用 R2，因為 Claude 與其他 MCP client 最穩定的使用方式，是讓工具回傳一般圖片 URL。

Options:

選項：

| mode | 中文 | English |
|---|---|---|
| R2 enabled | 建議模式。圖片短期暫存，回傳 `/i/<key>` URL，MCP 可直接給 Claude 使用。 | Recommended. Images are temporarily stored and returned as `/i/<key>` URLs for MCP/Claude. |
| R2 with cleanup | 設定 `RETENTION_DAYS=7`，正常產出圖 7 天後清掉，首頁範例圖保留。 | Set `RETENTION_DAYS=7`; generated images expire, homepage examples remain. |
| No R2 / compute-only | 初步構想可關閉 R2，只使用 Workers AI 算力；但此模式應改成 REST 直接回傳 base64 或由呼叫端自行存圖。MCP 若要給 Claude 顯示圖片，仍建議保留 R2 或其他圖床。 | You can design a compute-only mode without R2, but the REST API should return base64 or let the caller store the image. MCP usage for Claude still works best with R2 or another image host. |

## MCP Design For Claude / Claude MCP 設計

FluxGate is designed as a small MCP image tool for early-stage concepting, slide ideation, and presentation visuals.
It is not meant to be a full asset management system.

FluxGate 的 MCP 設計目標，是讓 Claude 在初步構想、簡報生成、課程素材草稿時，可以直接呼叫生圖工具。
它不是完整 DAM 或長期素材管理系統。

Register this SSE endpoint as a remote MCP server:

把以下 SSE endpoint 註冊成 remote MCP server：

```text
https://<your-worker>.workers.dev/sse?key=mk_xxxxx
```

The MCP server exposes:

MCP 工具：

- `generate_image(intent, ratio?)` -> returns `job_id`
- `check_job(job_id)` -> generates on first check and returns the image URL

Recommended Claude workflow:

建議 Claude 工作流：

1. Ask Claude for a concept or slide visual direction.
2. Claude calls `generate_image`.
3. Claude calls `check_job` after a few seconds.
4. Claude receives an image URL and can place it into a draft, slide outline, or visual prompt board.

## Tiers / 權限與解析度

| tier | access | dimensions | limit |
|---|---|---|---|
| anonymous | homepage only | `16:9` 512x288, `1:1` 512x512, `4:5` 512x640 | 1 image per IP per 5 minutes |
| member | Firebase login or `mk_` key | `16:9` 1280x720, `1:1` 720x720, `4:5` 512x640 | 20/day |
| vip | Firebase login or `vk_` key | same dimensions as member | 50/day |

`quality: "draft"` is available for low-cost pose/style checks.
For `4:5`, draft uses 256x320 and 4 FLUX steps.

`quality: "draft"` 可用於低成本測姿勢與風格。
`4:5` draft 目前使用 256x320 與 4 steps。

## Cost And Quota Estimate / 成本與額度估算

Cloudflare Workers AI pricing changes over time. As of the official Workers AI pricing page last checked during this update, Workers AI includes 10,000 free neurons per day, paid usage is priced per 1,000 neurons, and FLUX.1-schnell is priced by 512x512 tile and step.
See Cloudflare's pricing docs: <https://developers.cloudflare.com/workers-ai/platform/pricing/>

Cloudflare Workers AI 計價會變動。更新本文時，官方 pricing 顯示 Workers AI 每日有 10,000 free neurons；付費方案依每 1,000 neurons 計價；FLUX.1-schnell 依 512x512 tile 與 step 估算。
請以 Cloudflare dashboard 與官方 pricing 為準：<https://developers.cloudflare.com/workers-ai/platform/pricing/>

Rough estimator used here:

本文粗估公式：

```text
FLUX neurons ~= (image_area / 512 / 512) * 4.8 + steps * 9.6
```

This estimate does not include the Llama routing call. If you pass `style + subject` directly, FluxGate skips routing and saves LLM neurons.

此估算不包含 Llama 路由成本。若直接傳 `style + subject`，FluxGate 會跳過 router，節省 LLM neurons。

| mode | size | steps | FLUX-only rough neurons/image | rough images/day from 10k neurons |
|---|---:|---:|---:|---:|
| draft 4:5 | 256x320 | 4 | ~40 | ~250 |
| anonymous 16:9 | 512x288 | 4 | ~41 | ~240 |
| personal-brand 4:5 | 512x640 | 8 | ~83 | ~120 |
| square member | 720x720 | 4 | ~48 | ~205 |
| widescreen member | 1280x720 | 4 | ~55 | ~180 |
| hypothetical 4:5 high-res | 1024x1280 | 8 | ~101 | ~99 |

Practical routed usage is lower because Llama routing also consumes neurons.
For prompt-heavy routed generation, treat the table as an upper bound and monitor the Workers AI dashboard.

實際可用張數會更少，因為 Llama router 也會消耗 neurons。
若大量使用自然語言路由，請把上表視為上限，並以 Workers AI dashboard 監控實際消耗。

## NSFW And Safety Limits / NSFW 與安全限制

FluxGate is not designed for NSFW generation.

FluxGate 不設計給 NSFW 生圖使用。

Project-level limits:

專案層限制：

- Avoid erotic, pornographic, fetish, explicit nudity, or sexualized minor content.
- Avoid lingerie, bikini, swimsuit styling, transparent clothing, wet transparent clothing, and erotic posing in the `personal-brand-editorial` profile.
- Prefer adult, editorial, fashion, lifestyle, documentary, food, architecture, landscape, illustration, and presentation-safe visuals.
- Provider-side safety filters may reject prompts or produce degraded results when prompts are near the boundary.

## Styles / 風格槽

Supported style keys:

支援風格：

- `landscape`
- `lifestyle`
- `personal-brand-editorial`
- `cute-3d`
- `classical-oil`
- `ink-wash`
- `tech-emissive`
- `corporate-work`
- `architecture`
- `photoreal-portrait`
- `food`
- `illustration`
- `sports-action`

The `personal-brand-editorial` profile is tuned for personal-brand magazine covers:
negative space, low-key editorial lighting, film texture, title-safe composition, and low-detail hands.
Chinese typography should be added in post-processing, not generated by FLUX.

`personal-brand-editorial` 針對個人品牌雜誌封面調整：
留白、低調暗部、底片感、標題安全區、手部低細節。
中文標題應後製加入，不要期待 FLUX 直接生成可讀中文字。

## Setup / 建置

Install dependencies:

安裝依賴：

```bash
npm install
```

Create Cloudflare resources:

建立 Cloudflare 資源：

```bash
npx wrangler login
npx wrangler r2 bucket create fluxgate-images
npx wrangler kv namespace create KV
```

Copy the returned KV namespace id into `wrangler.jsonc`:

把回傳的 KV namespace id 填入 `wrangler.jsonc`：

```jsonc
{
  "kv_namespaces": [
    { "binding": "KV", "id": "REPLACE_WITH_KV_NAMESPACE_ID" }
  ]
}
```

Deploy:

部署：

```bash
npx wrangler deploy
```

For production deployments, keep account-specific config files local and out of Git.
The committed `wrangler.jsonc` is a portable template.

正式部署時，帳號專用設定檔應留在本機或 CI secret 管理，不要 commit。
Repo 內的 `wrangler.jsonc` 是可攜範本。

## Optional Secrets / 選配 Secrets

Firebase / Hub integration:

Firebase / Hub 整合：

- `FB_SERVICE_ACCOUNT`: service account JSON used by `src/firestore.js`

Failure alerting:

失敗告警：

- `TG_TOKEN`
- `TG_CHAT`

Set secrets with:

設定方式：

```bash
npx wrangler secret put FB_SERVICE_ACCOUNT
npx wrangler secret put TG_TOKEN
npx wrangler secret put TG_CHAT
```

If Firebase secrets are not configured, key-based API usage and anonymous homepage trials can still work.

若不設定 Firebase secrets，API key 與匿名首頁試用仍可工作；Google 登入會員功能則需要額外設定。

## REST Usage / REST 用法

Anonymous homepage-style request:

匿名首頁式請求：

```bash
curl -X POST https://<your-worker>.workers.dev/generate \
  -H 'Origin: https://<your-worker>.workers.dev' \
  -H 'Content-Type: application/json' \
  -d '{"intent":"高山湖泊日出"}'
```

API-key request:

API key 請求：

```bash
curl -X POST https://<your-worker>.workers.dev/generate \
  -H 'X-API-Key: mk_xxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"intent":"資料中心 AI 核心","ratio":"16:9"}'
```

Direct style testing:

直接指定風格測試：

```bash
curl -X POST https://<your-worker>.workers.dev/generate \
  -H 'X-API-Key: mk_xxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "style":"personal-brand-editorial",
    "subject":"adult Asian woman seated sideways at a quiet outdoor cafe table, oversized coat over opaque slip dress, looking away, hands below frame, shadowed wall negative space",
    "quality":"draft"
  }'
```

## Development / 開發

Run tests:

執行測試：

```bash
npm test
```

Run local dev:

本機開發：

```bash
npx wrangler dev
```

## License / 授權

MIT
