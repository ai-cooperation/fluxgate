import assert from "node:assert/strict";
import test from "node:test";

import { stepsForStyle } from "../src/ai.js";

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
