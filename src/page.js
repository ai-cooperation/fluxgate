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
  @media(max-width:600px){.hero h1{font-size:1.9rem;}.row{flex-direction:column;}.container{padding:1rem;}
    .step{grid-template-columns:1fr;}.boxes{grid-template-columns:1fr;}}
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
    </div>
  </div>

  <div class="card">
    <h2>取得 API Key</h2>
    <div class="row">
      <input id="label" placeholder="你的名稱或 email（用於識別）" />
      <button id="reg" onclick="getKey()">免費取得</button>
    </div>
    <div class="hint">免註冊可在本站試縮圖（512×288，每 5 分鐘 1 張）。取得 key 升會員（720p，每日 20 張）。VIP（FHD 1920×1080，每日 50 張）請聯絡老師。</div>
    <div class="keybox" id="keybox">
      <span style="font-size:.7rem;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:.3rem">claude.ai 連接器 URL（複製整段，貼到 Remote MCP server URL）</span>
      <span id="keyval"></span><span class="copy" onclick="copyKey()">複製整段</span>
      <div style="margin-top:.7rem;padding-top:.6rem;border-top:1px solid var(--border);font-size:.74rem;color:var(--muted)">
        REST API 用的 key（X-API-Key）：<code id="rawkey" style="color:var(--text)"></code>
        <span class="copy2" style="margin-left:.5rem" onclick="copyRaw()">複製 key</span>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>立即試用</h2>
    <div class="row">
      <input id="intent" placeholder="輸入白話意圖，例如：高山湖泊日出 / 可愛的橘貓 / 資料中心 AI 核心" />
      <button id="go" onclick="gen()">生圖</button>
    </div>
    <div class="hint">用上面取得的 key（會員畫質）；沒 key 則匿名畫質。</div>
    <div class="preview" id="preview"></div>
  </div>

  <div class="card">
    <h2>權限與每日額度</h2>
    <table>
      <tr><th>等級</th><th>解析度</th><th>額度</th><th>如何取得</th></tr>
      <tr><td>匿名</td><td>512×288 縮圖</td><td>網站試用，每 5 分鐘 1 張</td><td>免註冊</td></tr>
      <tr><td>會員</td><td>1280×720 (720p)</td><td>每日 20 張</td><td>上方免費取得</td></tr>
      <tr><td>VIP</td><td>1920×1080 (FHD)</td><td>每日 50 張</td><td>聯絡老師</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>API 用法</h2>
    <div class="endpoint"><span class="m">POST</span><span class="p">/generate</span>
      <div class="d">body: {"intent":"...", "ratio":"16:9 | 1:1"} ・ header: X-API-Key: &lt;你的 key&gt;（可省=匿名）</div></div>
    <pre>curl -X POST https://fluxgate.cooperation.tw/generate \\
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
      <span class="copy" onclick="copyConn()">複製</span>
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
    <div class="recipe"><div class="rhead"><span>Claude Desktop（mcp-remote 橋接）</span><span class="copy2" onclick="copyR('rcd')">複製</span></div><pre id="rcd">先取得 key</pre></div>
    <div class="recipe"><div class="rhead"><span>Cursor（.cursor/mcp.json）</span><span class="copy2" onclick="copyR('rcur')">複製</span></div><pre id="rcur">先取得 key</pre></div>
    <div class="recipe"><div class="rhead"><span>Codex CLI（~/.codex/config.toml）</span><span class="copy2" onclick="copyR('rcdx')">複製</span></div><pre id="rcdx">先取得 key</pre></div>

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
function copyConn(){ navigator.clipboard.writeText(document.getElementById('connurl').textContent); }
function copyR(id){ navigator.clipboard.writeText(document.getElementById(id).textContent); }
renderMcp();
if (myKey) showKey(myKey, false);
async function getKey(){
  const b=document.getElementById('reg'); b.disabled=true; b.textContent='產生中...';
  try{ const r=await fetch('/register',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({label:document.getElementById('label').value||'guest'})});
    const d=await r.json(); if(d.api_key){ showKey(d.api_key,true);} else alert(d.error||'失敗');
  }catch(e){ alert('錯誤：'+e.message);} b.disabled=false; b.textContent='免費取得';
}
function copyKey(){ navigator.clipboard.writeText(BASE+'/sse?key='+myKey); }
function copyRaw(){ navigator.clipboard.writeText(myKey); }
async function gen(){
  const intent=document.getElementById('intent').value.trim(); if(!intent)return;
  const b=document.getElementById('go'), pv=document.getElementById('preview');
  b.disabled=true; b.textContent='生成中...';
  pv.innerHTML='<div class="pbar"><div class="pfill" id="pfill"></div></div><div class="hint" id="pmsg">理解意圖中...</div>';
  const pfill=document.getElementById('pfill'), pmsg=document.getElementById('pmsg');
  let p=0; const tk=setInterval(()=>{ p+=Math.max(0.4,(92-p)*0.045); if(p>92)p=92;
    pfill.style.width=p+'%'; pmsg.textContent=(p<25?'理解意圖、套用風格 prompt...':'FLUX 生圖中...')+' '+Math.round(p)+'%'; },200);
  try{ const h={'Content-Type':'application/json'}; if(myKey)h['X-API-Key']=myKey;
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
</body>
</html>`;
