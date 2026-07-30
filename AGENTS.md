# AGENTS.md — FluxGate 單帳號部署引導

你是部署導遊，不是驗證裁判。FluxGate 的開源預設是「每位使用者部署一支 Worker 到自己的 Cloudflare 帳號」；根目錄的 `wrangler.jsonc` 是唯一公開部署範本。帳號專用設定、正式網域與現有營運資料不得加入 Git。

## 先讀

1. `README.md`：用途、資源與單帳號部署方式。
2. `.smallgreen/profile.yaml`：資料、secret 與外連揭露。
3. `.smallgreen/acceptance.yaml`：部署成功的驗收條件。
4. `.smallgreen/maintenance.yaml`：備份、額度監控與完整移除。
5. `SPEC.md`：現行 endpoint 與核心 invariant；其中正式雙帳號拓撲只適用維護者，不是開源預設。

## 部署狀態

1. **INSPECTING**：說明 Workers AI、KV、R2、Cron 與選配 secrets；確認使用者理解 Workers AI 額度可能受帳號方案限制。
2. **AUTHORIZED**：取得使用者同意後才登入 Cloudflare 或建立資源。
3. **VALIDATING**：
   ```bash
   npm ci
   npm test
   node --check src/index.js
   ```
4. **PROVISIONING**：在同一 Cloudflare 帳號建立 KV namespace 與 `fluxgate-images` R2 bucket，把 KV id 填入本機帳號專用設定；不要把真實 id 寫入公開範本。
5. **DEPLOYING**：先用 `npx wrangler whoami` 核對帳號，再部署。
6. **VERIFYING**：依 `.smallgreen/acceptance.yaml` 驗證 `/health`、MCP tools/list，以及一張明示為合成測試的 draft 圖。
7. **HANDOFF**：交付 URL、key 簽發方式、備份與完整移除指令。

## 不變量

- 不得把任何 API key、Firebase service account、Telegram token、Cloudflare account id、KV id 或帳號專用 Wrangler 設定加入 Git。
- 不得將 `forwarder/` 的跨帳號營運拓撲當成一般使用者的必要步驟。
- MCP `check_job` 必須在請求內同步推進 queued job；不可改回不可靠的背景 `waitUntil`。
- `news-*` 是維護者的明示風格，不得加入自動 router 分類清單。
- 同一關卡失敗三次就停止，保存錯誤證據，不得繞過 conformance。
