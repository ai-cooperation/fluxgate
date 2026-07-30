# FluxGate 開源準備狀態

更新日期：2026-07-30

## 公開產品邊界

開源版的預設產品是單帳號 FluxGate：

- 一支 Cloudflare Worker
- 一個 Workers AI binding
- 一個 KV namespace
- 一個 R2 bucket
- 一個每日清理 Cron Trigger
- REST 與 MCP 共用同一個 Worker URL

`forwarder/` 是現有維護者因正式網域與 Workers AI 帳號分離而使用的進階拓撲，不是一般部署者的必要元件。Firebase Hub、新聞 pipeline 專用風格與 Telegram 告警同樣是選配或維護者擴充。

## 已完成

- [x] MIT 授權
- [x] 可攜式 `wrangler.jsonc`，資源 id 使用 placeholder
- [x] tracked 檔案未包含真實 API key、token、private key 或 account id
- [x] SmallGreen profile／acceptance／maintenance 契約
- [x] SmallGreen conformance workflow
- [x] 跨 CLI `AGENTS.md`
- [x] 單元測試與 dependency audit 基線
- [x] 正式帳號專用設定保持 untracked

## 公開前必須完成

- [ ] 把帳號專用 Wrangler 檔名加入忽略規則，避免未來誤加；修改 `.gitignore` 前需取得專案擁有者明確同意
- [ ] 提供不依賴 Firebase 的部署者 key 簽發 CLI，key 只顯示一次並直接寫入遠端 KV
- [ ] 將首頁預設文案改為一般部署者版本，Firebase 登入 UI 改成選配
- [ ] 把 `SPEC.md` 的正式營運拓撲移到 maintainer 文件；主規格以單帳號模式為準
- [ ] 為 auth、MCP JSON-RPC、storage purge 與 key 簽發補齊測試
- [ ] 本機跑 SmallGreen conformance 全綠並產生 Evidence Pack
- [ ] 在乾淨 Cloudflare 測試帳號完成建立、部署、draft 生圖、MCP 連線、備份與 teardown
- [ ] 人工確認 GitHub 公開樹只含程式碼、合成測試資料與範例設定

## 禁止公開

- 現有正式 API keys 與 KV records
- Firebase service account、Telegram token／chat id
- Cloudflare account id、zone id、真實 KV namespace id
- 帳號專用 Wrangler 設定
- R2 現有圖片、會員 email、uid、用量或 job 紀錄
- 正式服務備份與部署 session

## 發布判定

完成「公開前必須完成」且 Evidence Pack 全綠後，才可建立公開 release。Build 或 deploy 指令成功本身不算驗收完成。
