# fluxgate.cooperation.tw 轉發器（跨帳號網域黏合層）

> 這支 worker 部署在「擁有 cooperation.tw zone 的帳號」（下稱 zone 帳號），
> 唯一工作是把公網流量原樣轉給生圖帳號的本體 worker。
> **動手改任何東西之前，先把本檔讀完**——這裡的每條規則都是踩過雷才寫下的。

## 為什麼存在（2026-07-17 定案）

FluxGate 本體 2026-06-25 從 zone 帳號搬到獨立生圖帳號（隔離 Workers AI neuron 額度，
避免生圖吃掉同帳號其他服務的免費額度）。但公網網域 `fluxgate.cooperation.tw` 搬不過去：

- cooperation.tw zone 在 zone 帳號（實測：生圖帳號綁 `*.cooperation.tw` 回 `Could not find zone`）
- Workers Custom Domain **官方明文不能綁非本帳號的 zone**
- 跨帳號 CNAME 指到 workers.dev 不被支援（1014 類限制）
- 搬整個 zone 會炸掉其他所有 `*.cooperation.tw` 服務的綁定——不考慮

結論：zone 帳號留這支「零 AI、零 KV、零 R2」的轉發器佔住網域，全部運算與儲存在生圖帳號。

```
fluxgate.cooperation.tw   （zone 帳號，本目錄的轉發器，custom domain 綁在它身上）
        │  原樣轉發 + 三處改寫
        ▼
fluxgate.aicooperation.workers.dev   （生圖帳號本體：FLUX、KV、R2、secrets）
```

## 三處改寫，缺一即壞（都在 worker.js，各有行內註解）

| 改寫 | 少了會怎樣 |
|---|---|
| 回應 body：`workers.dev` 網址 → 公網域名 | image_url / 首頁連結洩漏 workers.dev |
| 請求 Origin/Referer → upstream host | **匿名試用全 403**（本體 auth.js 的 sameSite 拿自己 host 比 Origin；2026-07-17 手測抓到） |
| `X-Forwarded-Host: fluxgate.cooperation.tw` | 目前本體未使用，預留 |

## 鐵律（違反 = 把當初要解的問題請回來）

1. **不准給這支 worker 加任何 binding**（AI / KV / R2）——那等於把 production 搬回 zone 帳號、neuron 重新燒錯地方
2. **custom domain 綁定不在 wrangler.jsonc 管**——它掛在 worker 本體上，deploy 不會動它；也不要在 dashboard 亂拆
3. 帳號選擇用 `wrangler login` 的登入態決定：**部署本目錄 = 登入 zone 帳號；部署本體（repo 根目錄 `-c wrangler.aicooperation.jsonc`）= 登入生圖帳號**。部署前 `npx wrangler whoami` 確認，2026-07-17 曾因登錯帳號部署錯 worker 燒掉半天
4. 改 KV 一律帶 `--remote`——wrangler v4 的 kv 指令**預設打本機 miniflare**，種進假 KV 的 key 會讓你以為 worker 壞了（2026-07-17 踩雷 40 分鐘）

## 部署與驗證

```bash
# 部署轉發器（先確認登入 zone 帳號）
cd forwarder && npx wrangler whoami && npx wrangler deploy

# 驗證清單（四項全綠才算完）
curl -s -X POST https://fluxgate.cooperation.tw/generate \
  -H 'Origin: https://fluxgate.cooperation.tw' -H 'Content-Type: application/json' \
  -d '{"intent":"probe","quality":"draft"}' | head -c 200   # 匿名應 200（或 429 冷卻，不可為 403）
curl -s https://fluxgate.cooperation.tw/ | grep -c workers.dev   # 應為 0
# 帶生圖帳號 KV 裡的有效 key 打 /generate → 200 且 image_url 為 cooperation.tw
# 抓回傳的 image_url → 200 JPEG
```

## 已知代價（接受中，未修）

- **匿名冷卻桶全站共用**：本體按 `CF-Connecting-IP` 限匿名 1 張/5 分鐘，但經轉發後看到的
  都是 Workers egress IP → 所有匿名訪客共用一桶。教學現場多人同時匿名試用會排隊。
  修法：本體信任轉發器附帶的真實 IP header + 防偽驗證（需改本體 + 部署生圖帳號），
  等匿名試用量真的成為問題再做。
- 舊 KV keys（2026-07-17 前發的 mk_/vk_）已隨切換全數作廢（老師決策，不搬），
  用戶在網站 Google 登入重新領。

## 事件時間軸

- 2026-06-25：本體搬生圖帳號，但網域/KV/secrets 三塊沒跟上 → 公網流量多燒 zone 帳號 neuron 三週無人發現
- 2026-07-17：查明後補完——FB_SERVICE_ACCOUNT 搬入本體、轉發器上線（v8b53529a）、
  修 sameSite Origin 改寫（v a46d0488）、E2E 四項驗證通過
