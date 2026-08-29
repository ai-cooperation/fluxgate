import assert from "node:assert/strict";
import test from "node:test";

import { flux, imageDimensions, stepsForStyle } from "../src/ai.js";

test("flux sends only the input fields supported by Cloudflare's model schema", async () => {
  const calls = [];
  const out = await flux({
    AI: { run: async (model, input) => {
      calls.push({ model, input });
      return { image: "/9j/" };
    } },
  }, "synthetic test prompt", 4);

  assert.deepEqual(calls, [{
    model: "@cf/black-forest-labs/flux-1-schnell",
    input: { prompt: "synthetic test prompt", steps: 4 },
  }]);
  assert.deepEqual([...out.bytes], [0xff, 0xd8, 0xff]);
  assert.equal(out.contentType, "image/jpeg");
});

test("image dimensions are read from model output bytes", () => {
  const png = new Uint8Array(24);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  png.set([0, 0, 3, 0x20], 16);
  png.set([0, 0, 2, 0x58], 20);
  assert.deepEqual(imageDimensions(png), { width: 800, height: 600 });
});

test("personal-brand-editorial uses higher quality FLUX steps", () => {
  assert.equal(stepsForStyle("personal-brand-editorial"), 8);
});

test("draft quality uses default FLUX steps for low-cost pose screening", () => {
  assert.equal(stepsForStyle("personal-brand-editorial", "draft"), 4);
});

test("other styles keep default FLUX steps", () => {
  assert.equal(stepsForStyle("lifestyle"), 4);
  assert.equal(stepsForStyle("landscape"), 4);
  assert.equal(stepsForStyle("unknown-style"), 4);
});
