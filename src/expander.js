// FluxGate expander — 意圖 -> FLUX prompt。詳設計見 ../expander.py（JS port，邏輯一致）。
// final = [LLM 主體句(隨意圖變)] + [程式碼鎖定風格槽(永不污染/永不掉)]

export const ROUTER_SYSTEM = `You are FluxGate's intent router. Given a plain user intent (any language), output JSON with two fields:
1. "style": classify into EXACTLY ONE key from:
   landscape | lifestyle | personal-brand-editorial | cute-3d | classical-oil | ink-wash | tech-emissive | corporate-work | architecture | photoreal-portrait | food | illustration | sports-action
2. "subject": ONE vivid ENGLISH sentence describing the concrete physical subject as the dramatic central focus, with micro-tactile details (textures, materials, physical weight). Translate abstract/news intents into a concrete HERO-SHOT subject. Never render text, company/product names, or literal puns. If people appear, compose hands occluded or fingers curled.
INTERPRET FAITHFULLY — preserve the SPECIFIC action, pose, and implied objects/attire of the intent; do NOT flatten it to the most generic reading. e.g. a spacewalk implies a SPACESUIT + helmet + a striding/walking pose (not merely floating); a chef implies an apron and a kitchen; "riding" implies the mount and a seated pose. Keep the verb's real meaning.
PERSONAL BRAND COVERS — if the intent asks for personal branding, Instagram cover, carousel cover, magazine cover, editorial fashion, quiet luxury creator visuals, thought-leadership visuals, emotional brand storytelling, or negative space for later title text, classify as 'personal-brand-editorial'. Preserve the concrete scene, clothing, posture, expression, and requested empty text area in the subject. Prefer upper-body or half-body editorial composition with the face clearly visible; avoid tiny distant faces and avoid extreme top-down angles when eyes are visible. Looking away, relaxed eyelids, or closed eyes are preferred over a direct camera stare. Keep hands low-detail: partially covered by sleeves, resting in shadow, softly folded, motion-softened, or cropped at the wrist; avoid visible individual fingers, open palms, spread fingers, hands near the camera, or hands at image edges. Avoid describing documents, book pages, posters, signs, screens, labels, or other text-bearing props unless essential; use closed folders, fabric, glass, water, walls, or empty surfaces instead. Never ask the image model to render Chinese or any readable text.
PEOPLE — frame people respectfully and wholesomely. For casual / beach / swimwear / sports / lifestyle subjects classify as 'lifestyle' (a natural travel/lifestyle scene), NOT 'photoreal-portrait', and describe the scene and activity rather than the body; avoid sensual, revealing, close-up-skin or suggestive posing language. Reserve 'photoreal-portrait' for documentary character studies (weathered faces, working hands, occupation).
Do NOT mention cameras, lenses, film, lighting setup, color grade, or any artist/director — those are appended later by code.
OUTPUT JSON ONLY, no fence: {"style":"<key>","subject":"<one english sentence>"}`;

// 鎖定風格槽（從 9 個 validated v3 prompt 萃取，主體無關）
export const STYLE_PROFILES = {
  "landscape": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Canon EOS R5, 16-35mm f/11, Fuji Velvia 50, deep focus. Strong natural backlight: the subject and foreground read as dark silhouettes with thin rim-light edges, fronts in cool shadow; scattered crepuscular rays break diagonally through patchy mist; distant elements fade into low-contrast blue atmospheric haze. Warm-amber sky against cool teal shadows. In the style of Roger Deakins and Ansel Adams." },
  "lifestyle": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Sony A7IV, 85mm f/1.4, Kodak Portra 400, creamy bokeh. Soft directional window side-light gently lighting the near side with a catchlight in the eyes, far side in soft shadow; warm rising steam or backlit dust catches the side light. Natural skin texture, warm honey grade. In the style of Wong Kar-wai." },
  "personal-brand-editorial": { ratio: "4:5", medium: "photo",
    suffix: "Editorial fashion photo for a personal brand magazine cover, raw source photo before typography. Upper/half-body; face at least 18% of image height, unobstructed aligned eyes, relaxed eyelids. Natural skin: visible pores, under-eye texture, faint blemishes, uneven tone; no airbrushed retouching, no glossy beauty makeup. Prefer looking away, lowered gaze, or closed eyes; avoid direct camera stare, extreme top-down angles. Adult fashion pieces: thin-strap top, tank top, opaque slip dress, cropped long-sleeve top, open-collar shirt, oversized suit, bandana, distressed knit; tasteful shoulders, collarbone, arms, or small waistline OK if opaque and non-lingerie. Hands low-detail only: oversized sleeves, shadow, below frame, hidden pockets, motion-softened, cropped; avoid individual fingers, open palms, spread fingers, foreshortened hands, hands near camera/face, edge-touching hands. Calm distant confidence, quiet psychological tension, dim available light, low-key side light, dense shadows, muted gray-blue/off-white, one-stop underexposed, Fujicolor 400 raw editorial photo, analog film grain, halation, lens softness, imperfect film scan. Worn 1990s urban texture: stained concrete walls, old corridors, shabby non-text clutter, blurred distant people. Avoid transparent fabric, wet transparent clothing, lingerie, bikini, swimsuit styling, erotic posing, midday sun, high-key commercial lighting, glossy studio beauty, sterile stock-photo cleanliness, commercial portrait polish. Off-center person, large clean negative space for later Chinese typography. No readable text, documents, posters, signs, screens, labels, captions, printed marks, handwriting, glyphs, letters, symbols, logos, watermarks, cartoon, plastic skin, distorted eyes, malformed hands, extra fingers." },
  "cute-3d": { ratio: "1:1", medium: "3d",
    suffix: "Stylized 3D render, subsurface scattering glowing warmly through translucent edges, soft global illumination. Soft key light from upper-left wraps the form; a colored rim light from behind separates it from the background; glossy catchlights in the big eyes. Warm pastel palette, shallow depth of field. In the style of Pixar and DreamWorks." },
  "classical-oil": { ratio: "1:1", medium: "painting",
    suffix: "17th-century oil painting, thick impasto, visible canvas weave, craquelure and varnish sheen. A single warm candle or window is the ONLY light source, brightly lighting the near side with steep inverse-square falloff into deep umber shadow, background near-black, the flame reflected as a point in the eyes; chiaroscuro 4:1. In the style of Rembrandt and Caravaggio." },
  "ink-wash": { ratio: "16:9", medium: "ink",
    suffix: "Traditional Chinese ink-wash painting, monochrome black ink bleeding softly into rice-paper grain, saturated dry-brush strokes on near elements, far elements fading to pale dilute washes lost in mist. No cast shadows; depth purely by ink density; abundant negative space; a small abstract red seal stamp in a corner, but no calligraphy, no readable text, no title inscription, no handwriting. Faint aged-paper warmth. In the style of Song literati Fan Kuan and Guo Xi." },
  "tech-emissive": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Sony A7R V, 35mm T1.5, anamorphic flare, subtle chromatic aberration. The glowing subject IS the only light source, cast radially, brightest on the nearest surfaces and falling off into surrounding darkness; cyan reflections streak along polished metal and glass facing it; volumetric haze glows where the light passes. Teal-cyan (#1a3a4a) halated highlights, Blade Runner 2049 grade. In the style of Roger Deakins and Denis Villeneuve." },
  "corporate-work": { ratio: "16:9", medium: "photo",
    suffix: "Shot on 35mm f/2.8, shallow depth of field. Two consistent light sources: soft daylight window-fill giving even gentle shadows, plus cool up-light from a glowing surface on the faces and undersides of hands nearest it; subtle reflections in glass and glossy surfaces. Clean bright natural grade. Documentary corporate style." },
  "architecture": { ratio: "16:9", medium: "photo",
    suffix: "Shot on a 16mm tilt-shift lens, long exposure, crisp converging vertical lines. Blue-hour two-color lighting: cool blue dusk sky reflected across the glass facade against warm interior office lights glowing from within the windows; the wet plaza below mirrors the structure with car-light trails; distant buildings fade into haze. In the style of Iwan Baan." },
  "photoreal-portrait": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Leica M6, 50mm, Kodak Tri-X 400 pushed, heavy film grain and halation, shallow depth of field. Soft overcast raking light from the open sky grazes across the surface revealing deep texture — wrinkles, pores, frayed threads, wear — with soft shadows in every crease; materials show their weight. Muted desaturated black-and-white. In the style of Sebastiao Salgado." },
  "food": { ratio: "1:1", medium: "photo",
    suffix: "Shot on Sony A7IV, 90mm macro f/4. Soft window side-light rakes across the textures revealing glistening surfaces and rising steam catching the light, with specular highlights on sauce and a soft falloff into shadow behind. Warm appetizing grade, shallow depth of field. In the style of food photographer Fan Ho's tonal control." },
  "illustration": { ratio: "16:9", medium: "illustration",
    suffix: "Hand-painted children's storybook illustration, soft gouache and watercolor texture with visible paper tooth, gentle rounded outlines, friendly shapes. Warm soft daylight wrapping the scene with tender ambient fill. Whimsical pastel palette. In the style of classic picture-book artists like Beatrix Potter." },
  "sports-action": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Canon EOS R3, 400mm f/2.8, fast shutter freezing the motion with slight panning blur in the background. Hard directional sunlight rim-lights flying sweat and muscle, casting long dramatic shadows. High-contrast vivid grade. In the style of sports photojournalist Neil Leifer." },
  // --- 新聞 banner 專用（2026-07-17 加）---
  // 刻意「不」列進 ROUTER_SYSTEM 的分類清單：router 永遠不會自動選到，
  // 只有 pipeline 明確帶 style 才取用 → 對公開用戶零影響。
  // 兩者都必須：底部留白給 PIL 疊中文標題 + 禁止任何可讀文字（FLUX 畫字必糊）。
  "news-ai100": { ratio: "16:9", medium: "render",
    suffix: "Abstract technology graphic for a news banner, raw source image before typography. Isometric circuit-board topology: luminous cyan conductive traces branch and turn across a deep navy substrate, thin translucent holographic panels float above the plane with faint scanline texture, small emissive nodes pulse at the junctions. The traces ARE the only light source, radiating cyan outward and falling off into deep navy darkness; thin volumetric haze glows where the emission passes; subtle bloom and anamorphic streaks on the brightest nodes. Graphic and diagrammatic, not photographic: no people, no faces, no hands, no physical server room, no hardware product shot. Deep navy to cyan gradient, high contrast, clean vector-like clarity softening to gentle depth blur at the edges. Calm uncluttered lower third: large dark negative space across the bottom for later Chinese typography. In the style of Blade Runner 2049 interface design and Ash Thorp. No readable text, words, letters, numbers, glyphs, captions, labels, signs, logos, watermarks, brand marks." },
  // 註：FLUX.1-schnell 是 guidance-distilled（CFG=1），**沒有負面提示能力**。
  // 寫 "no text/banners/signs" 反而把這些詞餵進正向 prompt 誘發亂碼字（2026-07-17 實測）。
  // 因此本 suffix 全部改用「正面描述」：指定畫面裡該有什麼（素面、無字表面、空前景），
  // 而非列舉不要什麼。同理，底部留白要正面描述成「空曠前景佔下三分之一」。
  "news-s100": { ratio: "16:9", medium: "photo",
    suffix: "Documentary photojournalism for a sustainability news banner, raw wire-service frame before typography. Shot on Canon EOS R6, 35mm f/4, Kodak Portra 400 pushed one stop, focus deep enough to hold the whole environment. Overcast diffuse daylight from a flat grey sky: soft wraparound light, open shadows, gentle falloff into the depth of the scene; distant figures and structures sink into low-contrast atmospheric haze. Candid unposed real-world scene with authentic weather and wear; any people are mid-action, turned away or seen in profile, faces small and incidental, hands occluded by sleeves or cropped, framed at a journalistic distance. Every surface is plain and unmarked: bare weathered fabric, blank painted metal, raw concrete, unadorned stone; the camera is angled so that inscribed facades, storefronts, and printed material stay out of frame. The bottom third is open empty ground — bare wet pavement, plain earth, or still water — a calm vacant band beneath the action, reserved for later Chinese typography. Muted desaturated grade, cool teal-grey shadows against restrained earth tones, one stop underexposed, fine film grain, slight halation, imperfect scan. Journalistic restraint and quiet gravity, available light only. In the style of Reuters and Associated Press wire photography with Sebastiao Salgado's documentary composure." },
};

// 各 tier 明確尺寸（陳老師定 2026-06-08）：匿名=縮圖 / 會員=720p / VIP 也 720p(只是每日額度多，FHD 太燒 neuron 不給)
const SIZES = {
  anonymous: { "16:9": [512, 288], "1:1": [512, 512], "4:5": [512, 640] },   // 縮圖，只能網站試
  member:    { "16:9": [1280, 720], "1:1": [720, 720], "4:5": [512, 640] },  // 720p，每日 20 張；4:5 先固定低成本驗證
  vip:       { "16:9": [1280, 720], "1:1": [720, 720], "4:5": [512, 640] },  // 720p，每日 50 張；4:5 先固定低成本驗證
};
const DRAFT_SIZES = {
  "4:5": [256, 320],
};
const MAX_FLUX_PROMPT = 2048;

export function dims(tier, ratio, quality = "standard") {
  if (quality === "draft" && DRAFT_SIZES[ratio]) return DRAFT_SIZES[ratio];
  const t = SIZES[tier] || SIZES.anonymous;
  return t[ratio] || t["16:9"];
}

// 合成最終 prompt + 解析度。ratioOverride 可強制 16:9（如新聞 banner）。
export function compose(style, subject, tier = "member", ratioOverride = null, quality = "standard") {
  const prof = STYLE_PROFILES[style] || STYLE_PROFILES["photoreal-portrait"];
  const ratio = ratioOverride || prof.ratio;
  const qualityMode = quality === "draft" ? "draft" : "standard";
  let cleanSubject = String(subject).trim().replace(/\.$/, "");
  let flux_prompt = `${cleanSubject}. ${prof.suffix}`;
  if (flux_prompt.length > MAX_FLUX_PROMPT) {
    const maxSubject = Math.max(0, MAX_FLUX_PROMPT - prof.suffix.length - 2);
    cleanSubject = cleanSubject.slice(0, maxSubject).trimEnd().replace(/[,\s]+$/, "");
    flux_prompt = `${cleanSubject}. ${prof.suffix}`;
  }
  const [width, height] = dims(tier, ratio, qualityMode);
  return { flux_prompt, width, height, style: STYLE_PROFILES[style] ? style : "photoreal-portrait", ratio, quality: qualityMode };
}
