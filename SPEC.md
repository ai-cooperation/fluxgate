# FluxGate SPEC — 行為契約（2026-07-17 對齊現況）

> **以程式碼為準**：本檔記錄意圖與契約，數字類每項標注來源檔。
> 發現本檔與程式碼不一致 = bug（文件漂移或程式改壞），回報處理，不要默默改任一邊。
> 部署拓撲與跨帳號規則見 [forwarder/README.md](forwarder/README.md)（維護前必讀）。

## 1. 定位

白話意圖（任何語言）→ FLUX.1-schnell 生圖 → R2 → 回 URL。全 Cloudflare 原生（無瀏覽器、無 VM）。
定位：內部 pipeline + 教學 + 會員服務；高寫實需求走 GemGate（Gemini Pro），不互相取代。

```
fluxgate.cooperation.tw（zone 帳號，純轉發器）
   → fluxgate.aicooperation.workers.dev（生圖帳號本體：AI/KV/R2/secrets）
```

## 2. Endpoints（src/index.js）

| Method Path | 認證 | 用途 |
|---|---|---|
| `GET /` | 無 | 首頁 UI（試用表單、風格範例、MCP 設定說明） |
| `POST /generate` | 三選一或匿名 | 生圖（同步，~7-15s）。見 §4 |
| `GET /health` | 無 | 健康檢查 |
| `GET /i/<date>/<uuid>.jpg` | 無 | R2 圖片服務 |
| `POST /issue-mcp-key` | Firebase ID token | hub 會員領 mk_/vk_ key（綁 uid，用時讀 live tier） |
| `GET /me` | 同上（可選） | 回 `{tier, email, uid, loggedIn}` |
| `GET /sse` `GET /mcp` | key | MCP SSE 開流 |
| `POST /mcp` `/mcp/messages` `/sse` | key | MCP JSON-RPC（tools: `generate_image`→job_id、`check_job`→首呼同步生成回 URL） |
| ~~`POST /register`~~ | — | **已停用**（email 自助發 key 繞過 hub，2026-06-08 關），會員一律 Google 登入 |

Cron `0 17 * * *`（UTC）：R2 清理，保留 `RETENTION_DAYS=7` 天；`examples/` 前綴永不清（wrangler config + src/storage.js）。

## 3. 認證與分級（src/auth.js）

`resolveTier` 判定順序：
1. `Authorization: Bearer <JWT非mk_/vk_>` → 驗 Firebase ID token → 讀 hub live tier（guest 降匿名）
2. `X-API-Key` / `Bearer mk_|vk_...` / `?key=` → KV `key:<apikey>` → 有 `uid` 讀 hub live tier；無 uid 用 `rec.tier`
3. 皆無 → 匿名

KV key record 格式：`key:<apikey>` → `{"tier":"member"|"vip","label":"...","uid"?:...}`

| tier | 每日額度（`TIER_QUOTA`） | 16:9 解析度（`SIZES`） | 附加限制 |
|---|---|---|---|
| anonymous | 不計日額 | 512×288 | **僅同站**（sameSite：Origin host === request host）+ 每 IP 冷卻 `ANON_COOLDOWN` 5 分鐘 1 張 |
| member (mk_) | 20 | 1280×720 | |
| vip (vk_) | 50 | 1280×720（**刻意不給 FHD**，太燒 neuron，差異只在張數） |
| pipeline 專用 | 走 vip key（`vk_news_*`，label=news-pipeline） | 同 vip | 種 key 必帶 `--remote` |

日額 key：`count:<id>:<YYYY-MM-DD>`，TTL 172800s。1:1=720×720（縮圖 512²）、4:5=512×640、draft 4:5=256×320。

## 4. 生圖引擎（src/expander.js + src/ai.js）

**Hybrid 設計（核心，勿退回單一大 prompt）**：`final = LLM 主體句（隨意圖變）+ 程式碼鎖定風格槽 suffix（永不污染/永不掉）`。

- Router：`@cf/meta/llama-3.3-70b-instruct-fp8-fast`，json_schema 強制、temp 0.4，輸出 `{style, subject}`
- **帶 `style`+`subject` 跳過 router**（省一次 LLM 呼叫；pipeline 建議走此路）
- 生圖：`@cf/black-forest-labs/flux-1-schnell`；steps：預設 4、`personal-brand-editorial` 8、draft 一律 4（`STYLE_STEPS`/`DEFAULT_STEPS`）
- prompt 上限 `MAX_FLUX_PROMPT=2048`，超長截 subject 保 suffix

**風格槽 15 個**：landscape / lifestyle / personal-brand-editorial / cute-3d / classical-oil / ink-wash / tech-emissive / corporate-work / architecture / photoreal-portrait / food / illustration / sports-action / **news-ai100 / news-s100**。

news-* 特例（2026-07-17）：
- **不在 ROUTER_SYSTEM 分類清單**——router 永遠選不到，只有明確帶 style 才取用（公開用戶零影響）
- 服務 ai100（抽象電路科技風）與永續100（紀實新聞攝影風）新聞 banner；底部留空白帶給 PIL 疊中文標題
- **FLUX schnell 無負面提示能力（CFG=1）**：suffix 全正面描述；寫「no text/banners」反而誘發亂碼。subject 點名有刻字建物仍會生亂碼字（已接受的取捨：遠景小亂碼換強構圖）

`/generate` 請求：`{intent}` 或 `{style, subject}` + 可選 `ratio`("16:9"|"1:1"|"4:5")、`quality`("standard"|"draft")
回應：`{ok:true, image_url, style, width, height, steps, quality, flux_prompt, subject}`

## 5. 錯誤契約

| HTTP | 情境 | body |
|---|---|---|
| 400 | 無 intent 且無 style+subject / 壞 JSON | `{error}` |
| 403 | 匿名非同站打 API | `{error:"匿名僅限在 FluxGate 網站試用...", tier:"anonymous"}` |
| 429 | 匿名 5 分鐘冷卻 / 會員日額用盡 | `{error}`（訊息含額度說明） |
| 503 | flux 暫時失敗（tab crash 等，quota exhausted 含 "quota"+"exhausted" 字樣） | `{detail}`——呼叫端據此區分重試 vs 放棄 |

## 6. 成本（官方計價，developers.cloudflare.com/workers-ai/platform/pricing）

flux-1-schnell：4.80n / 512² tile + 9.60n / step。720p@4steps ≈ **55n/張**；免費層 10,000n/日 ≈ 180 張/日。
新聞 pipeline 18 張/日 ≈ 10% 免費額。Router llama ≈ 40n/次（bypass 可省）。
neuron 計量是 **rolling 24h 滾動窗**，非曆日重置。

## 7. Invariants（違反即回退到已知壞狀態）

1. news-* 不進 ROUTER_SYSTEM 清單（進了=公開用戶意圖會被導到新聞風格）
2. 轉發器零 binding、Origin/Referer 與回應網址雙向改寫缺一即壞（詳 forwarder/README.md）
3. `wrangler kv` 操作必帶 `--remote`（v4 預設本機 miniflare，2026-07-17 踩雷）
4. MCP `check_job` 首呼**同步** drive 生成——不可改回 `ctx.waitUntil`（best-effort 會被砍，job 卡 running，2026-06-10 踩雷）
5. 風格槽 suffix 由程式碼鎖定，不交給 LLM 展開（打地鼠教訓，2026-06-07）
6. 部署前 `npx wrangler whoami` 確認帳號（三帳號並存，2026-07-17 部署錯帳號燒半天）

## 8. 已知限制（接受中）

- Cloudflare flux NSFW 過濾（error 3030）對泳裝/沙灘類誤判偏敏感，平台硬限
- 匿名冷卻桶經轉發器後全站共用（upstream 見到的是 Workers egress IP）
- FLUX 手指/文字天花板：手藏構圖、文字交 PIL 後製

## 9. 變更紀錄

- 2026-06-07 上線（個人帳號 workers.dev）；6-08 正式域名 + 三級額度定案 + hub 會員接入 + MCP SSE
- 2026-06-10 MCP job 同步 drive 修復
- 2026-06-25 本體搬生圖帳號（aicooperation）——網域/KV/secrets 未跟上
- 2026-07-17 news-ai100/news-s100 上線（d8cdc0b）；搬遷補完：FB_SERVICE_ACCOUNT 入本體、轉發器上線（87408ca）、舊 key 全作廢（老師決策，會員重新領）
