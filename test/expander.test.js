import assert from "node:assert/strict";
import test from "node:test";

import { compose, dims, ROUTER_SYSTEM, STYLE_PROFILES } from "../src/expander.js";

test("personal-brand-editorial uses 4:5 cover dimensions for all tiers", () => {
  assert.deepEqual(dims("anonymous", "4:5"), [512, 640]);
  assert.deepEqual(dims("member", "4:5"), [512, 640]);
  assert.deepEqual(dims("vip", "4:5"), [512, 640]);
});

test("draft quality uses tiny 4:5 dimensions for pose screening only", () => {
  assert.deepEqual(dims("member", "4:5", "draft"), [256, 320]);
  assert.deepEqual(dims("vip", "4:5", "draft"), [256, 320]);
  assert.deepEqual(dims("member", "16:9", "draft"), [1280, 720]);

  const out = compose("personal-brand-editorial", "A seated editorial portrait", "member", null, "draft");
  assert.equal(out.width, 256);
  assert.equal(out.height, 320);
  assert.equal(out.quality, "draft");
});

test("personal-brand-editorial profile preserves title-safe magazine cover constraints", () => {
  const out = compose("personal-brand-editorial", "An Asian woman in an oversized suit lies on a white office table", "member");

  assert.equal(out.style, "personal-brand-editorial");
  assert.equal(out.ratio, "4:5");
  assert.equal(out.width, 512);
  assert.equal(out.height, 640);
  assert.match(out.flux_prompt, /Editorial fashion photo/i);
  assert.match(out.flux_prompt, /personal brand magazine cover/i);
  assert.match(out.flux_prompt, /raw source photo/i);
  assert.match(out.flux_prompt, /face at least 18% of image height/i);
  assert.match(out.flux_prompt, /Natural skin/i);
  assert.match(out.flux_prompt, /visible pores/i);
  assert.match(out.flux_prompt, /under-eye texture/i);
  assert.match(out.flux_prompt, /uneven tone/i);
  assert.match(out.flux_prompt, /no airbrushed retouching/i);
  assert.match(out.flux_prompt, /no glossy beauty makeup/i);
  assert.match(out.flux_prompt, /Upper\/half-body/i);
  assert.match(out.flux_prompt, /extreme top-down angles/i);
  assert.match(out.flux_prompt, /avoid direct camera stare/i);
  assert.match(out.flux_prompt, /Adult fashion pieces/i);
  assert.match(out.flux_prompt, /thin-strap top/i);
  assert.match(out.flux_prompt, /tank top/i);
  assert.match(out.flux_prompt, /opaque slip dress/i);
  assert.match(out.flux_prompt, /cropped long-sleeve top/i);
  assert.match(out.flux_prompt, /distressed knit/i);
  assert.match(out.flux_prompt, /tasteful shoulders/i);
  assert.match(out.flux_prompt, /small waistline/i);
  assert.match(out.flux_prompt, /opaque and non-lingerie/i);
  assert.match(out.flux_prompt, /Hands low-detail only/i);
  assert.match(out.flux_prompt, /oversized sleeves/i);
  assert.match(out.flux_prompt, /shadow/i);
  assert.match(out.flux_prompt, /hidden pockets/i);
  assert.match(out.flux_prompt, /motion-softened/i);
  assert.match(out.flux_prompt, /Avoid individual fingers/i);
  assert.match(out.flux_prompt, /open palms/i);
  assert.match(out.flux_prompt, /foreshortened hands/i);
  assert.match(out.flux_prompt, /hands near camera\/face/i);
  assert.match(out.flux_prompt, /malformed hands/i);
  assert.match(out.flux_prompt, /extra fingers/i);
  assert.match(out.flux_prompt, /quiet psychological tension/i);
  assert.match(out.flux_prompt, /dim available light/i);
  assert.match(out.flux_prompt, /low-key side light/i);
  assert.match(out.flux_prompt, /dense shadows/i);
  assert.match(out.flux_prompt, /Fujicolor 400 raw editorial photo/i);
  assert.match(out.flux_prompt, /analog film grain/i);
  assert.match(out.flux_prompt, /imperfect film scan/i);
  assert.match(out.flux_prompt, /Worn 1990s urban texture/i);
  assert.match(out.flux_prompt, /stained concrete walls/i);
  assert.match(out.flux_prompt, /blurred distant people/i);
  assert.match(out.flux_prompt, /midday sun/i);
  assert.match(out.flux_prompt, /transparent fabric/i);
  assert.match(out.flux_prompt, /wet transparent clothing/i);
  assert.match(out.flux_prompt, /lingerie/i);
  assert.match(out.flux_prompt, /bikini/i);
  assert.match(out.flux_prompt, /swimsuit styling/i);
  assert.match(out.flux_prompt, /erotic posing/i);
  assert.match(out.flux_prompt, /high-key commercial lighting/i);
  assert.match(out.flux_prompt, /sterile stock-photo cleanliness/i);
  assert.match(out.flux_prompt, /commercial portrait polish/i);
  assert.match(out.flux_prompt, /negative space/i);
  assert.match(out.flux_prompt, /later Chinese typography/i);
  assert.match(out.flux_prompt, /No readable text/i);
  assert.match(out.flux_prompt, /documents, posters, signs/i);
  assert.match(out.flux_prompt, /letters, symbols, logos, watermarks/i);
});

test("personal-brand-editorial prompt stays within Workers AI flux prompt limit", () => {
  const subject = "An Asian woman in an oversized dark pinstripe suit reclines diagonally on a shadowed off-white office table beside closed folders, eyeglasses and water glasses, upper-body composition, calm serious expression with relaxed eyelids looking away to the side, hands tucked under the oversized sleeves and not visible, clean empty shadowed table space on the left for later title text, quiet burnout and ambition mood, dim indoor room with textured wall nearby";
  const out = compose("personal-brand-editorial", subject, "member");

  assert.ok(out.flux_prompt.length <= 2048, `prompt length ${out.flux_prompt.length} exceeds 2048`);
});

test("ink-wash profile permits red seal but avoids readable calligraphy", () => {
  const out = compose("ink-wash", "A misty mountain temple beside a waterfall", "member");

  assert.equal(out.style, "ink-wash");
  assert.match(out.flux_prompt, /No calligraphy/i);
  assert.match(out.flux_prompt, /no readable text/i);
  assert.match(out.flux_prompt, /red seal stamp/i);
});

test("router can classify editorial personal-brand cover intents", () => {
  assert.match(ROUTER_SYSTEM, /personal-brand-editorial/);
  assert.match(ROUTER_SYSTEM, /personal branding/i);
  assert.match(ROUTER_SYSTEM, /Instagram cover/i);
  assert.match(ROUTER_SYSTEM, /upper-body or half-body/i);
  assert.match(ROUTER_SYSTEM, /avoid extreme top-down angles/i);
  assert.match(ROUTER_SYSTEM, /Looking away, relaxed eyelids, or closed eyes/i);
  assert.match(ROUTER_SYSTEM, /Keep hands low-detail/i);
  assert.match(ROUTER_SYSTEM, /avoid visible individual fingers/i);
});

test("existing lifestyle dimensions remain unchanged", () => {
  assert.equal(STYLE_PROFILES.lifestyle.ratio, "16:9");
  assert.deepEqual(dims("member", "16:9"), [1280, 720]);
});

test("unknown tiers use anonymous dimensions and unknown ratios use tier default", () => {
  assert.deepEqual(dims("unknown-tier", "4:5"), [512, 640]);
  assert.deepEqual(dims("member", "unknown-ratio"), [1280, 720]);
});

test("unknown styles still fall back to photoreal portrait", () => {
  const out = compose("not-a-style", "A weathered craftsperson.", "member");

  assert.equal(out.style, "photoreal-portrait");
  assert.equal(out.ratio, "16:9");
  assert.equal(out.width, 1280);
  assert.equal(out.height, 720);
  assert.match(out.flux_prompt, /^A weathered craftsperson\./);
});
