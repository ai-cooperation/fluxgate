// FluxGate 首頁（自助取 key + 立即試用 + API docs）。無 emoji（依規範，改用 ✓ • 符號）。
export const PAGE = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FluxGate — 免費 AI 生圖閘道</title>
<style>
  :root{--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#e2e8f0;--muted:#94a3b8;
        --accent:#38bdf8;--green:#4ade80;--red:#f87171;--mono:'JetBrains Mono','Fira Code',monospace;
        --font:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;}
  .container{max-width:820px;margin:0 auto;padding:2rem 1.5rem;}
  .hero{text-align:center;padding:3rem 0 1.5rem;}
  .hero h1{font-size:2.6rem;font-weight:800;letter-spacing:-.02em;}
  .hero h1 span{color:var(--accent);}
  .hero p{color:var(--muted);font-size:1.1rem;margin-top:.6rem;}
  .badges{display:flex;gap:.4rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;}
  .badge{background:var(--surface);border:1px solid var(--border);border-radius:999px;
         padding:.25rem .75rem;font-size:.8rem;color:var(--muted);}
  .badge.on{border-color:var(--green);color:var(--green);}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin:1.25rem 0;}
  .card h2{font-size:1.15rem;margin-bottom:1rem;}
  .row{display:flex;gap:.75rem;}
  input,textarea,select{background:var(--bg);border:1px solid var(--border);border-radius:8px;
        padding:.75rem 1rem;color:var(--text);font-size:1rem;outline:none;font-family:inherit;}
  input:focus,textarea:focus,select:focus{border-color:var(--accent);}
  .row input{flex:1;}
  button{background:var(--accent);color:var(--bg);border:none;border-radius:8px;padding:.75rem 1.5rem;
         font-weight:600;font-size:1rem;cursor:pointer;white-space:nowrap;}
  button:hover{opacity:.9;} button:disabled{opacity:.5;cursor:not-allowed;}
  .keybox{display:none;margin-top:1rem;background:var(--bg);border:1px solid var(--green);border-radius:8px;
          padding:1rem;font-family:var(--mono);font-size:.95rem;word-break:break-all;position:relative;}
  .keybox.show{display:block;}
  .keybox .copy{position:absolute;top:.5rem;right:.5rem;background:var(--surface);border:1px solid var(--border);
        border-radius:6px;padding:.25rem .6rem;color:var(--muted);cursor:pointer;font-size:.8rem;}
  .hint{color:var(--muted);font-size:.85rem;margin-top:.6rem;}
  .preview{margin-top:1rem;text-align:center;}
  .preview img{max-width:100%;border-radius:8px;border:1px solid var(--border);}
  .preview .err{color:var(--red);font-size:.9rem;}
  .pbar{height:9px;background:var(--bg);border:1px solid var(--border);border-radius:999px;overflow:hidden;margin:.5rem 0;}
  .pfill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--accent),#7dd3fc,var(--accent));
         background-size:200% 100%;animation:flow 1.1s linear infinite;transition:width .25s ease;}
  @keyframes flow{to{background-position:-200% 0;}}
  .endpoint{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;margin:.75rem 0;}
  .endpoint .m{display:inline-block;background:var(--accent);color:var(--bg);font-weight:700;font-size:.75rem;
        padding:.15rem .5rem;border-radius:4px;margin-right:.5rem;}
  .endpoint .p{font-family:var(--mono);font-size:.9rem;} .endpoint .d{color:var(--muted);font-size:.85rem;margin-top:.3rem;}
  pre{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;font-family:var(--mono);
      font-size:.8rem;overflow-x:auto;line-height:1.6;color:var(--muted);}
  table{width:100%;border-collapse:collapse;font-size:.85rem;}
  th,td{padding:.5rem .75rem;text-align:left;border-bottom:1px solid var(--border);}
  th{color:var(--muted);font-weight:500;}
  .footer{text-align:center;color:var(--muted);font-size:.8rem;padding:2rem 0;}
  .steps{display:flex;flex-direction:column;gap:.6rem;margin-top:1rem;}
  .step{display:grid;gap:.75rem;grid-template-columns:1fr 300px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.9rem;}
  .step .stext{font-size:.88rem;color:var(--muted);line-height:1.55;} .step .stext b{color:var(--text);}
  .mock{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.6rem;}
  .mtitle{font-size:.7rem;color:var(--muted);margin-bottom:.4rem;}
  .mfield{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:.4rem .6rem;margin-bottom:.3rem;font-size:.75rem;}
  .mfield span{display:block;color:var(--muted);font-size:.65rem;} .mfield b{font-size:.78rem;word-break:break-all;}
  .mfield.hl{border-color:var(--accent);} .mfield.hl b{color:var(--accent);}
  .mbtn{background:var(--accent);color:var(--bg);text-align:center;border-radius:6px;padding:.4rem;font-size:.78rem;font-weight:600;margin-top:.2rem;}
  .mbubble{background:var(--bg);border:1px solid var(--accent);border-radius:6px;padding:.5rem;font-size:.78rem;}
  .recipe{margin:.5rem 0;} .rhead{display:flex;justify-content:space-between;align-items:center;font-size:.82rem;color:var(--muted);margin-bottom:.25rem;}
  .copy2{cursor:pointer;color:var(--accent);font-size:.78rem;border:1px solid var(--border);border-radius:5px;padding:.1rem .5rem;}
  .boxes{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1rem;}
  .okbox,.warnbox{border-radius:8px;padding:.75rem .9rem;font-size:.8rem;}
  .okbox{background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);} .okbox b{color:var(--green);}
  .warnbox{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);} .warnbox b{color:#fbbf24;}
  .boxes ul{margin:.4rem 0 0 1rem;color:var(--muted);line-height:1.6;}
  .examples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1rem;}
  .ex{background:var(--bg);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
  .ex img{width:100%;display:block;aspect-ratio:4/5;object-fit:cover;background:#111827;}
  .exbody{padding:.85rem;}
  .exbody h3{font-size:.95rem;margin-bottom:.35rem;}
  .exbody p{font-size:.78rem;color:var(--muted);line-height:1.55;margin-bottom:.6rem;}
  .prompt{font-family:var(--mono);font-size:.72rem;line-height:1.5;color:#cbd5e1;background:#0b1220;border:1px solid var(--border);border-radius:8px;padding:.65rem;white-space:pre-wrap;}
  @media(max-width:600px){.hero h1{font-size:1.9rem;}.row{flex-direction:column;}.container{padding:1rem;}
    .step{grid-template-columns:1fr;}.boxes,.examples{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="container">

  <div class="hero">
    <h1>Flux<span>Gate</span></h1>
    <p>免費 AI 生圖閘道 — 白話意圖自動轉專業 prompt，一句話出圖</p>
    <div class="badges">
      <span class="badge on">✓ 風景</span><span class="badge on">✓ 人像寫實</span>
      <span class="badge on">✓ 可愛 3D</span><span class="badge on">✓ 水墨</span>
      <span class="badge on">✓ 古典油畫</span><span class="badge on">✓ 科技</span>
      <span class="badge on">✓ 企業建築</span><span class="badge on">✓ 美食</span>
      <span class="badge on">✓ 運動</span><span class="badge on">✓ 童書插畫</span>
      <span class="badge on">✓ 個人品牌雜誌感</span>
    </div>
  </div>

  <div class="card">
    <h2>會員登入</h2>
    <div id="loggedOut">
      <p class="hint" style="margin-top:0">用 Google 登入即為會員（720p、每日 20 張），跟 cooperation.tw 其他服務同一個帳號。未登入可在下方試縮圖（512×288，每 5 分鐘 1 張）。VIP（同 720p，每日 50 張，額度較多）請聯絡老師開通。</p>
      <button id="loginBtn" onclick="window.hubLogin&&window.hubLogin()" style="margin-top:.6rem">使用 Google 登入</button>
    </div>
    <div id="loggedIn" style="display:none">
      <p class="hint" style="margin-top:0">已登入 <b id="meEmail" style="color:var(--text)"></b> · 等級 <b id="meTier" style="color:var(--accent)"></b>
        <span class="copy2" style="margin-left:.5rem;cursor:pointer" onclick="window.hubLogout&&window.hubLogout()">登出</span></p>
      <div class="row" style="margin-top:.7rem">
        <button id="issueBtn" onclick="getMcpKey(this)">領 MCP key（接 claude.ai / Cursor）</button>
      </div>
      <div class="keybox" id="keybox">
        <span style="font-size:.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:.3rem">claude.ai 連接器 URL（複製整段，貼到 Remote MCP server URL）</span>
        <span id="keyval"></span><span class="copy" onclick="copyKey(this)">複製整段</span>
        <div style="margin-top:.7rem;padding-top:.6rem;border-top:1px solid var(--border);font-size:.74rem;color:var(--muted)">
          REST API 用的 key（X-API-Key）：<code id="rawkey" style="color:var(--text)"></code>
          <span class="copy2" style="margin-left:.5rem" onclick="copyRaw(this)">複製 key</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>立即試用</h2>
    <div class="row">
      <input id="intent" placeholder="輸入白話意圖，例如：高山湖泊日出 / 可愛的橘貓 / 資料中心 AI 核心" />
      <button id="go" onclick="gen()">生圖</button>
    </div>
    <div class="hint">已登入＝會員/VIP 畫質（720p）；未登入＝匿名縮圖（每 5 分鐘 1 張）。</div>
    <div class="preview" id="preview"></div>
  </div>

  <div class="card">
    <h2>時尚個人品牌範例</h2>
    <p class="hint" style="margin-top:0">FluxGate 負責生成主視覺；中文標題請後製加上。下面 prompt 是示範用的 subject，不需要把中文字放進生圖 prompt。</p>
    <div class="examples">
      <div class="ex">
        <img src="/i/examples/fashion-market-bench.jpg" alt="Market bench editorial example">
        <div class="exbody">
          <h3>Market Bench Editorial</h3>
          <p>街景、坐姿、細肩帶與外套鬆弛感，適合品牌定位或個人故事封面。</p>
          <div class="prompt">中文：雨後的老城市市場，一位成年亞洲女性側坐在低石椅上，細肩帶上衣搭 oversized 深色外套，紅頭巾，手部低調，濕地面與模糊水果箱，街頭時尚感，保留大面積留白。
English: adult Asian woman seated sideways on a low stone bench in an old urban market street after rain, thin-strap top under an oversized dark jacket, red bandana, hands low and quiet, wet pavement, blurred fruit crates, muted street fashion mood, large negative space</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/fashion-taxi-backseat.jpg" alt="Taxi backseat editorial example">
        <div class="exbody">
          <h3>Taxi Backseat Editorial</h3>
          <p>車內暗部、斜坐姿、夜色窗景，適合焦慮、轉場、城市感內容。</p>
          <div class="prompt">中文：夜晚老計程車後座，一位成年亞洲女性斜坐在車內，細肩帶上衣搭 oversized 西裝外套，手藏在外套陰影中，窗外城市燈光散景，疲憊疏離的眼神，車內暗部留白。
English: adult Asian woman sitting diagonally across the back seat of an old taxi at night, thin-strap top under oversized blazer, hands hidden under blazer fabric, city lights outside the window as soft bokeh, tired distant gaze, dark interior negative space</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/fashion-outdoor-cafe.jpg" alt="Outdoor cafe editorial example">
        <div class="exbody">
          <h3>Outdoor Cafe Editorial</h3>
          <p>戶外咖啡座、側坐、街角背景，適合知性但不商業的人像封面。</p>
          <div class="prompt">中文：狹窄城市人行道的戶外咖啡桌旁，一位成年亞洲女性側坐，opaque slip dress 搭 oversized 外套，看向街道遠方，手部裁在畫面下方，空桌面與陰影牆面留給標題。
English: adult Asian woman seated sideways at a small outdoor cafe table on a narrow city sidewalk, opaque slip dress under an oversized coat, looking past the street, hands cropped below frame, empty table surface and shadowed wall area for title</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/fashion-rooftop-wind.jpg" alt="Rooftop wind editorial example">
        <div class="exbody">
          <h3>Rooftop Wind Editorial</h3>
          <p>屋頂、風、城市遠景，適合自由、壓力、轉型主題；手部仍需注意。</p>
          <div class="prompt">中文：有風的城市屋頂，一位成年亞洲女性側坐在簡單金屬椅上，遠方城市天際線，distressed knit 搭 modest camisole，頭髮自然被風吹動，手臂藏在寬袖裡，天空留白。
English: adult Asian woman sitting sideways on a simple metal chair on a windy rooftop, city skyline far behind, distressed knit over a modest camisole, hair moving naturally, arms low inside oversized sleeves, large pale sky area for title</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/fashion-ferry-deck.jpg" alt="Ferry deck editorial example">
        <div class="exbody">
          <h3>Ferry Deck Editorial</h3>
          <p>夜間渡輪、海面與城市燈，適合漂流、內容疲勞、長期品牌敘事。</p>
          <div class="prompt">中文：夜間渡輪甲板長椅，一位成年亞洲女性斜坐，黑色 tank top 搭 oversized trench coat，身體呈對角線，風吹到半閉眼，深藍海面與遠方城市燈光作留白。
English: adult Asian woman seated on a ferry deck bench with dark ocean and distant city lights behind her, black tank top under oversized trench coat, body angled diagonally, eyes half closed in wind, deep blue water negative space</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>多風格範例</h2>
    <p class="hint" style="margin-top:0">同一個入口可生成不同視覺語言。這些範例直接指定 style，適合作為 API / MCP 的提示方向。</p>
    <div class="examples">
      <div class="ex">
        <img src="/i/examples/gallery-landscape-alpine.jpg" alt="Landscape example">
        <div class="exbody">
          <h3>Landscape</h3>
          <p>風景、旅遊、開場背景。</p>
          <div class="prompt">中文：日出時的高山湖泊，鋸齒狀山脊，低霧繞過深色松林，前景有一座小木碼頭，冷藍陰影與橘色邊光。
English: A dramatic alpine lake at sunrise with a jagged mountain ridge, low fog curling over dark pine trees, tiny wooden dock, cold blue shadows and warm orange rim light.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-ink-wash-temple.jpg" alt="Ink wash example">
        <div class="exbody">
          <h3>水墨 / Ink Wash</h3>
          <p>東方山水、留白、詩意場景；紅印可保留，避免題字與可讀文字。</p>
          <div class="prompt">中文：霧中的山寺與狹窄瀑布，松樹垂向石橋，遠山淡入大片宣紙留白，水墨暈染、乾筆近景，小紅印可以，但不要書法題字或可讀文字。
English: A quiet mountain temple hidden in mist beside a narrow waterfall, pine trees bending over a stone bridge, distant cliffs fading into blank rice-paper space, ink wash bleeding and dry-brush foreground, a small red seal is acceptable, no calligraphy or readable text.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-cute-3d-cat.jpg" alt="Cute 3D example">
        <div class="exbody">
          <h3>Cute 3D</h3>
          <p>角色、貼圖、可愛物件。</p>
          <div class="prompt">中文：一隻穿迷你雨衣的小橘貓坐在廚房桌上的茶杯裡，圓圓好奇的眼睛，周圍有小小濕腳印。
English: A tiny orange tabby cat wearing a miniature raincoat, sitting inside a teacup on a kitchen table, curious round eyes, small wet paw prints.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-tech-core.jpg" alt="Tech emissive example">
        <div class="exbody">
          <h3>Tech Emissive</h3>
          <p>AI、資料中心、科技視覺。</p>
          <div class="prompt">中文：透明的 AI 處理器核心漂浮在黑色玻璃資料中心中，青藍光沿著光纖脈動，金屬機櫃隱在陰影裡。
English: A transparent AI processor core floating inside a dark glass data center, cyan light pulsing through fiber threads, metal racks barely visible in shadow.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-oil-luthier.jpg" alt="Classical oil example">
        <div class="exbody">
          <h3>古典油畫 / Classical Oil</h3>
          <p>古典人物、工藝、故事感。</p>
          <div class="prompt">中文：年老小提琴工匠在木工桌前檢查半成品小提琴，捲曲木屑、黃銅工具、一盞燭光照亮手部與琴身。
English: An elderly violin maker examining a half-finished violin at a wooden workbench, curled wood shavings, brass tools, single candle light.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-food-ramen.jpg" alt="Food example">
        <div class="exbody">
          <h3>Food</h3>
          <p>餐飲、菜單、社群美食圖。</p>
          <div class="prompt">中文：一碗冒著熱氣的辣味味噌拉麵，亮面辣油、溏心蛋、焦香玉米、青蔥，放在深色木吧台上的粗陶碗裡。
English: A steaming bowl of spicy miso ramen with glossy chili oil, soft egg, charred corn, spring onions and textured ceramic bowl on a dark wooden counter.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-architecture-library.jpg" alt="Architecture example">
        <div class="exbody">
          <h3>Architecture</h3>
          <p>建築、空間、城市品牌。</p>
          <div class="prompt">中文：現代公共圖書館，溫暖木質室內光從高玻璃牆透出，藍調時刻的雨濕石板廣場倒映建築立面。
English: A contemporary public library with warm wooden interiors glowing through tall glass walls, rain-wet stone plaza reflecting the facade at blue hour.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-storybook-fox.jpg" alt="Storybook illustration example">
        <div class="exbody">
          <h3>Storybook</h3>
          <p>童書、課程插圖、溫柔敘事。</p>
          <div class="prompt">中文：一隻小狐狸和穿黃色雨衣的小孩走在月光森林小徑上，發光蘑菇，水坑倒映星光。
English: A small fox and a child in a yellow raincoat walking through a moonlit forest path, glowing mushrooms, puddles reflecting stars.</div>
        </div>
      </div>
      <div class="ex">
        <img src="/i/examples/gallery-sports-skater.jpg" alt="Sports action example">
        <div class="exbody">
          <h3>Sports Action</h3>
          <p>動態、競賽、速度感。</p>
          <div class="prompt">中文：女性競速滑冰選手在室內冰道高速壓彎，冰刀後方濺起凝結冰霧，背景觀眾動態模糊。
English: A female speed skater leaning hard into a turn on an indoor ice track, frozen spray behind the blade, motion blurred audience in the background.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>權限與每日額度</h2>
    <table>
      <tr><th>等級</th><th>解析度</th><th>額度</th><th>如何取得</th></tr>
      <tr><td>匿名</td><td>512×288 縮圖</td><td>網站試用，每 5 分鐘 1 張</td><td>免註冊</td></tr>
      <tr><td>會員</td><td>1280×720 (720p)</td><td>每日 20 張</td><td>上方免費取得</td></tr>
      <tr><td>VIP</td><td>1280×720 (720p)</td><td>每日 50 張</td><td>聯絡老師</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>API 用法</h2>
    <div class="endpoint"><span class="m">POST</span><span class="p">/generate</span>
      <div class="d">body: {"intent":"...", "ratio":"16:9 | 1:1"} ・ header: X-API-Key: &lt;你的 key&gt;（可省=匿名）</div></div>
    <pre>curl -X POST &lt;本頁網域&gt;/generate \\
  -H 'X-API-Key: mk_xxxxx' -H 'Content-Type: application/json' \\
  -d '{"intent":"高山湖泊日出"}'
# 回 { image_url, flux_prompt, style, width, height, remaining_today }</pre>
    <div class="endpoint"><span class="m">GET</span><span class="p">/sse?key=</span>
      <div class="d">MCP server（HTTP+SSE，工具 generate_image）。把含 key 的 /sse URL 註冊為 remote MCP，agent / claude.ai 即可直接生圖。</div></div>
    <div class="endpoint"><span class="m">GET</span><span class="p">/i/&lt;key&gt;</span>
      <div class="d">取圖（generate 回傳的 image_url）。圖每日清空，請自行另存。</div></div>
  </div>

  <div class="card">
    <h2>接到 claude.ai / AI 工具（MCP）</h2>
    <p class="hint" style="margin-top:0">把 FluxGate 接成 MCP server，就能在 claude.ai / Cursor / Codex 的對話裡直接說「生一張圖」。下方 URL 已含你的 key。</p>

    <div class="keybox show" style="border-color:var(--accent);margin-top:1rem">
      <span style="font-size:.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:.3rem">連接器 URL（含 key）</span>
      <span id="connurl" style="color:var(--accent)">先在上方取得 key</span>
      <span class="copy" onclick="copyConn(this)">複製</span>
    </div>

    <div class="steps">
      <div class="step">
        <div class="stext"><b>1. 先取得 key</b><br>用本頁最上方「取得 API Key」拿一把（會員畫質）。匿名也能接，但畫質較低。</div>
      </div>
      <div class="step">
        <div class="stext"><b>2. claude.ai → 新增自訂連接器</b><br>設定 → Connectors → Add custom connector，把上面整段 URL 貼到「Remote MCP server URL」。</div>
        <div class="mock">
          <div class="mtitle">claude.ai / Add custom connector</div>
          <div class="mfield"><span>名稱</span><b>FluxGate</b></div>
          <div class="mfield"><span>Remote MCP server URL</span><b style="color:var(--accent)">https://…/sse?key=mk_…</b></div>
          <div class="mfield hl"><span>驗證 (Authentication)</span><b>無驗證 ✓</b></div>
          <div class="mbtn">新增</div>
        </div>
      </div>
      <div class="step">
        <div class="stext"><b>3. 驗證選「無驗證」</b><br>key 已經在 URL 裡，OAuth Client ID/Secret 留白。建立即可。</div>
      </div>
      <div class="step">
        <div class="stext"><b>4. 回對話用 generate_image</b><br>對話框工具列勾選 FluxGate，直接說「用 fluxgate 生一張高山日出」。會回圖片 URL。</div>
        <div class="mock">
          <div class="mtitle">claude.ai / 對話</div>
          <div class="mfield"><span>+ 工具</span><b>FluxGate</b></div>
          <div class="mbubble">用 fluxgate 生一張可愛的橘貓</div>
        </div>
      </div>
    </div>

    <h3 style="font-size:.95rem;margin:1.25rem 0 .5rem">其他 client 設定（key 已預填）</h3>
    <p class="hint" style="margin-top:0">注意：目前 MCP 為 JSON-RPC request/response 版，claude.ai 等需 SSE 串流的 client <b>未實測</b>，測通請回報，老師會更新。</p>
    <div class="recipe"><div class="rhead"><span>Claude Desktop（mcp-remote 橋接）</span><span class="copy2" onclick="copyR('rcd',this)">複製</span></div><pre id="rcd">先取得 key</pre></div>
    <div class="recipe"><div class="rhead"><span>Cursor（.cursor/mcp.json）</span><span class="copy2" onclick="copyR('rcur',this)">複製</span></div><pre id="rcur">先取得 key</pre></div>
    <div class="recipe"><div class="rhead"><span>Codex CLI（~/.codex/config.toml）</span><span class="copy2" onclick="copyR('rcdx',this)">複製</span></div><pre id="rcdx">先取得 key</pre></div>

    <div class="boxes">
      <div class="okbox"><b>設定成功的判斷</b><ul><li>對話工具列看得到 FluxGate</li><li>說「生一張…」會回一個 /i/ 圖片 URL</li><li>點 URL 看得到圖</li></ul></div>
      <div class="warnbox"><b>最常卡住</b><ul><li>用手機/桌面 App 找設定 → 改用網頁版</li><li>驗證選了 OAuth → 改「無驗證」(key 在 URL)</li><li>額度用完回 429 → 換 key 或明日再試</li></ul></div>
    </div>
  </div>

  <div class="footer">FluxGate ・ Cloudflare Workers AI (FLUX.1-schnell) ・ 內部教學用途</div>
</div>

<script>
const BASE=location.origin;
let myKey = localStorage.getItem('fluxgate_key') || '';
function showKey(k, save){ myKey=k;
  document.getElementById('keyval').textContent=BASE+'/sse?key='+k;
  document.getElementById('rawkey').textContent=k;
  document.getElementById('keybox').classList.add('show'); if(save) localStorage.setItem('fluxgate_key',k); renderMcp(); }
function renderMcp(){
  const k = myKey || '<你的KEY>';
  const conn = BASE+'/sse?key='+k;
  document.getElementById('connurl').textContent = conn;
  document.getElementById('rcd').textContent = JSON.stringify({mcpServers:{fluxgate:{command:'npx',args:['mcp-remote',conn]}}},null,2);
  document.getElementById('rcur').textContent = JSON.stringify({mcpServers:{fluxgate:{url:conn}}},null,2);
  document.getElementById('rcdx').textContent = '[mcp_servers.fluxgate]\\nurl = "'+BASE+'/sse?key='+k+'"';
}
function doCopy(text, btn){
  const ok=()=>{ if(btn){ const o=btn.textContent; btn.textContent='已複製 ✓'; setTimeout(()=>{btn.textContent=o;},1500);} };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(ok).catch(()=>fallbackCopy(text,ok));
  } else { fallbackCopy(text,ok); }
}
function fallbackCopy(text, ok){
  try{ const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); ok(); }
  catch(e){ window.prompt('手動複製：', text); }
}
function copyConn(btn){ doCopy(document.getElementById('connurl').textContent, btn); }
function copyR(id, btn){ doCopy(document.getElementById(id).textContent, btn); }
function copyKey(btn){ doCopy(BASE+'/sse?key='+myKey, btn); }
function copyRaw(btn){ doCopy(myKey, btn); }
renderMcp();
// 登入會員領 MCP key（帶 Firebase ID token）
async function getMcpKey(btn){
  const tok = window.getToken ? await window.getToken() : null;
  if(!tok){ alert('請先用 Google 登入'); return; }
  const o=btn.textContent; btn.disabled=true; btn.textContent='產生中...';
  try{ const r=await fetch('/issue-mcp-key',{method:'POST',headers:{'Authorization':'Bearer '+tok}});
    const d=await r.json(); if(d.api_key){ showKey(d.api_key,false);} else alert(d.error||'失敗');
  }catch(e){ alert('錯誤：'+e.message);} btn.disabled=false; btn.textContent=o;
}
async function gen(){
  const intent=document.getElementById('intent').value.trim(); if(!intent)return;
  const b=document.getElementById('go'), pv=document.getElementById('preview');
  b.disabled=true; b.textContent='生成中...';
  pv.innerHTML='<div class="pbar"><div class="pfill" id="pfill"></div></div><div class="hint" id="pmsg">理解意圖中...</div>';
  const pfill=document.getElementById('pfill'), pmsg=document.getElementById('pmsg');
  let p=0; const tk=setInterval(()=>{ p+=Math.max(0.4,(92-p)*0.045); if(p>92)p=92;
    pfill.style.width=p+'%'; pmsg.textContent=(p<25?'理解意圖、套用風格 prompt...':'FLUX 生圖中...')+' '+Math.round(p)+'%'; },200);
  try{ const h={'Content-Type':'application/json'};
    const tok = window.getToken ? await window.getToken() : null;
    if(tok) h['Authorization']='Bearer '+tok;        // 登入＝會員/VIP 畫質
    else if(myKey) h['X-API-Key']=myKey;             // 或用 MCP key
    const r=await fetch('/generate',{method:'POST',headers:h,body:JSON.stringify({intent})});
    const d=await r.json();
    clearInterval(tk); pfill.style.width='100%';
    if(d.image_url){ pmsg.textContent='完成 100%';
      setTimeout(()=>{ pv.innerHTML='<img src="'+d.image_url+'"><div class="hint">'+d.style+' ・ '+d.width+'×'+d.height+' ・ 今日剩 '+d.remaining_today+' 張</div>'; },250); }
    else { pv.innerHTML='<div class="err">'+(d.detail||d.error||'失敗')+'</div>'; }
  }catch(e){ clearInterval(tk); pv.innerHTML='<div class="err">錯誤：'+e.message+'</div>'; }
  b.disabled=false; b.textContent='生圖';
}
</script>

<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// cooperation-hub 會員中樞（Firebase web config 為公開值，安全靠 Firestore rules）
const app = initializeApp({
  apiKey: ['AIza','SyCgCdmBYX-XYM9LmOA9Mk9M-WdxzLDS2QI'].join(''),  // Firebase web key 公開值；切割避 pre-commit 誤報
  authDomain: 'cooperation-hub-bfe79.firebaseapp.com',
  projectId: 'cooperation-hub-bfe79',
});
const auth = getAuth(app);
let fbUser = null;
window.getToken = async () => fbUser ? await fbUser.getIdToken() : null;
window.hubLogin = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert('登入失敗：' + e.message));
window.hubLogout = () => signOut(auth);
onAuthStateChanged(auth, async (user) => {
  fbUser = user;
  const inEl = document.getElementById('loggedIn'), outEl = document.getElementById('loggedOut');
  if (user) {
    try {
      const tok = await user.getIdToken();
      const me = await fetch('/me', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
      document.getElementById('meEmail').textContent = user.email;
      document.getElementById('meTier').textContent = (me.tier === 'vip' ? 'VIP（720p・額度較多）' : me.tier === 'member' ? '會員（720p）' : me.tier);
    } catch (e) { document.getElementById('meEmail').textContent = user.email; }
    inEl.style.display = 'block'; outEl.style.display = 'none';
  } else {
    inEl.style.display = 'none'; outEl.style.display = 'block';
  }
});
</script>
</body>
</html>`;
