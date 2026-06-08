// FluxGate expander — 意圖 -> FLUX prompt。詳設計見 ../expander.py（JS port，邏輯一致）。
// final = [LLM 主體句(隨意圖變)] + [程式碼鎖定風格槽(永不污染/永不掉)]

export const ROUTER_SYSTEM = `You are FluxGate's intent router. Given a plain user intent (any language), output JSON with two fields:
1. "style": classify into EXACTLY ONE key from:
   landscape | lifestyle | cute-3d | classical-oil | ink-wash | tech-emissive | corporate-work | architecture | photoreal-portrait | food | illustration | sports-action
2. "subject": ONE vivid ENGLISH sentence describing the concrete physical subject as the dramatic central focus, with micro-tactile details (textures, materials, physical weight). Translate abstract/news intents into a concrete HERO-SHOT subject. Never render text, company/product names, or literal puns. If people appear, compose hands occluded or fingers curled.
INTERPRET FAITHFULLY — preserve the SPECIFIC action, pose, and implied objects/attire of the intent; do NOT flatten it to the most generic reading. e.g. a spacewalk implies a SPACESUIT + helmet + a striding/walking pose (not merely floating); a chef implies an apron and a kitchen; "riding" implies the mount and a seated pose. Keep the verb's real meaning.
Do NOT mention cameras, lenses, film, lighting setup, color grade, or any artist/director — those are appended later by code.
OUTPUT JSON ONLY, no fence: {"style":"<key>","subject":"<one english sentence>"}`;

// 鎖定風格槽（從 9 個 validated v3 prompt 萃取，主體無關）
export const STYLE_PROFILES = {
  "landscape": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Canon EOS R5, 16-35mm f/11, Fuji Velvia 50, deep focus. Strong natural backlight: the subject and foreground read as dark silhouettes with thin rim-light edges, fronts in cool shadow; scattered crepuscular rays break diagonally through patchy mist; distant elements fade into low-contrast blue atmospheric haze. Warm-amber sky against cool teal shadows. In the style of Roger Deakins and Ansel Adams." },
  "lifestyle": { ratio: "16:9", medium: "photo",
    suffix: "Shot on Sony A7IV, 85mm f/1.4, Kodak Portra 400, creamy bokeh. Soft directional window side-light gently lighting the near side with a catchlight in the eyes, far side in soft shadow; warm rising steam or backlit dust catches the side light. Natural skin texture, warm honey grade. In the style of Wong Kar-wai." },
  "cute-3d": { ratio: "1:1", medium: "3d",
    suffix: "Stylized 3D render, subsurface scattering glowing warmly through translucent edges, soft global illumination. Soft key light from upper-left wraps the form; a colored rim light from behind separates it from the background; glossy catchlights in the big eyes. Warm pastel palette, shallow depth of field. In the style of Pixar and DreamWorks." },
  "classical-oil": { ratio: "1:1", medium: "painting",
    suffix: "17th-century oil painting, thick impasto, visible canvas weave, craquelure and varnish sheen. A single warm candle or window is the ONLY light source, brightly lighting the near side with steep inverse-square falloff into deep umber shadow, background near-black, the flame reflected as a point in the eyes; chiaroscuro 4:1. In the style of Rembrandt and Caravaggio." },
  "ink-wash": { ratio: "16:9", medium: "ink",
    suffix: "Traditional Chinese ink-wash painting, monochrome black ink bleeding softly into rice-paper grain, saturated dry-brush strokes on near elements, far elements fading to pale dilute washes lost in mist. No cast shadows; depth purely by ink density; abundant negative space; a small red seal stamp in a corner. Faint aged-paper warmth. In the style of Song literati Fan Kuan and Guo Xi." },
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
};

// 各 tier 明確尺寸（對齊解析度政策；1376 非乾淨 16:9 故不用公式）
const SIZES = {
  anonymous: { "16:9": [1024, 576], "1:1": [768, 768] },
  member:    { "16:9": [1376, 768], "1:1": [1024, 1024] },
  vip:       { "16:9": [1920, 1080], "1:1": [1152, 1152] },
};

export function dims(tier, ratio) {
  const t = SIZES[tier] || SIZES.anonymous;
  return t[ratio] || t["16:9"];
}

// 合成最終 prompt + 解析度。ratioOverride 可強制 16:9（如新聞 banner）。
export function compose(style, subject, tier = "member", ratioOverride = null) {
  const prof = STYLE_PROFILES[style] || STYLE_PROFILES["photoreal-portrait"];
  const ratio = ratioOverride || prof.ratio;
  const flux_prompt = `${String(subject).trim().replace(/\.$/, "")}. ${prof.suffix}`;
  const [width, height] = dims(tier, ratio);
  return { flux_prompt, width, height, style: STYLE_PROFILES[style] ? style : "photoreal-portrait", ratio };
}
