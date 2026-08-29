// Workers AI 呼叫：llama 路由 + flux 生圖。
import { ROUTER_SYSTEM, compose } from "./expander.js";

const LLM = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const FLUX = "@cf/black-forest-labs/flux-1-schnell";

const STYLE_KEYS = ["landscape", "lifestyle", "personal-brand-editorial", "cute-3d", "classical-oil", "ink-wash",
  "tech-emissive", "corporate-work", "architecture", "photoreal-portrait", "food", "illustration", "sports-action"];
const STYLE_STEPS = { "personal-brand-editorial": 8 };
const DEFAULT_STEPS = 4;
const ROUTE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    type: "object",
    properties: { style: { type: "string", enum: STYLE_KEYS }, subject: { type: "string" } },
    required: ["style", "subject"],
  },
};

// 寬鬆 JSON 解析（llama 偶爾包 fence 或前後綴）
function parseLoose(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { return null; }
}

// 意圖 -> {style, subject}
export async function route(env, intent) {
  const res = await env.AI.run(LLM, {
    messages: [{ role: "system", content: ROUTER_SYSTEM }, { role: "user", content: String(intent) }],
    max_tokens: 320,
    temperature: 0.4,
    response_format: ROUTE_SCHEMA,
  });
  // Cloudflare llama 對純 JSON 輸出會直接回「物件」；非物件時才當字串解析
  let j = res?.response;
  if (typeof j === "string") j = parseLoose(j);
  if (j && typeof j === "object" && j.style && j.subject) return { style: j.style, subject: j.subject };
  // fallback：解析失敗 -> 當寫實人像，主體用原意圖
  return { style: "photoreal-portrait", subject: String(intent) };
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function sniffType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  return "image/png";
}

function u32be(bytes, offset) {
  return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (sof.has(marker) && length >= 7) {
      return {
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
      };
    }
    offset += length;
  }
  return null;
}

export function imageDimensions(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes.length >= 24) {
    return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  }
  return jpegDimensions(bytes);
}

export function stepsForStyle(style, quality = "standard") {
  if (quality === "draft") return DEFAULT_STEPS;
  return STYLE_STEPS[style] || DEFAULT_STEPS;
}

// prompt + steps -> model output bytes and the actual decoded dimensions
export async function flux(env, prompt, steps = DEFAULT_STEPS) {
  // flux-1-schnell currently accepts only prompt and steps; width/height are not model inputs.
  const res = await env.AI.run(FLUX, { prompt, steps });
  if (!res?.image) throw new Error("flux returned no image");
  const bytes = b64ToBytes(res.image);
  return { bytes, contentType: sniffType(bytes), ...imageDimensions(bytes) };
}

// 完整管線（不含儲存）：intent -> {flux_prompt, style, width, height, bytes, contentType, subject}
// style+subject 同時給時跳過 router（進階/測試用，router 已另外驗證）。
export async function runPipeline(env, { intent, tier = "member", ratio = null, style = null, subject = null, quality = "standard" }) {
  const r = (style && subject) ? { style, subject } : await route(env, intent);
  const c = compose(r.style, r.subject, tier, ratio, quality);
  const steps = stepsForStyle(c.style, c.quality);
  console.log(`[fluxgate] inject->flux ${c.width}x${c.height} steps=${steps} quality=${c.quality} style=${c.style} :: ${c.flux_prompt}`);
  const img = await flux(env, c.flux_prompt, steps);
  return { ...c, steps, subject: r.subject, ...img };
}
