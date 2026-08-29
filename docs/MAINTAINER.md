# FluxGate 維護者運維說明

這份文件只描述維護者的正式部署，不是一般使用者的開源部署路徑。一般使用者應以根目錄 `wrangler.jsonc`、`README.md` 與 `AGENTS.md` 為準。

## 部署拓撲

開源預設是單一 Cloudflare 帳號：同一支 Worker 綁定 Workers AI、KV 與 R2，REST 與 MCP 共用同一個 Worker URL。

維護者的正式服務另使用雙帳號拓撲：

```text
public custom domain
  → forwarder worker (zone account, no AI/KV/R2 bindings)
  → FluxGate worker (image account, AI/KV/R2/secrets)
```

跨帳號轉發器的改寫規則、部署順序、已知代價與事件時間軸見 [`forwarder/README.md`](../forwarder/README.md)。不要把轉發器當成一般部署者的必要元件。

## 維護者部署檢查

1. 先讀 `forwarder/README.md`，確認目標是 zone 帳號還是生圖帳號。
2. 在目標帳號執行 `npx wrangler whoami`；帳號不符就停止。
3. 根目錄本體使用未追蹤的帳號專用 Wrangler 設定；公開的 `wrangler.jsonc` 只保留 placeholder。
4. 轉發器不得新增 AI、KV 或 R2 binding；本體部署後才做 `/health`、MCP `tools/list` 與 draft 圖驗收。
5. KV 操作一律加 `--remote`；更新或移除前依 `.smallgreen/maintenance.yaml` 先匯出資料。

## 發布閘門

公開 release 前必須完成：

- `npm ci`、`npm test` 與 `node --check src/index.js`。
- SmallGreen conformance 全綠。
- 乾淨測試帳號的部署、MCP、draft 生圖、備份與 teardown 證據。
- 人工檢查公開樹沒有 API key、service account、resource ID、現有圖片或會員資料。

任何驗證失敗都保留錯誤證據，不以部署指令成功代替可用性驗收。
