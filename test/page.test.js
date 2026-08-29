import assert from "node:assert/strict";
import test from "node:test";

import { parseFirebaseConfig, renderPage } from "../src/page.js";

test("default homepage is deployer-neutral and documents manual key issuance", () => {
  const page = renderPage({});
  assert.match(page, /scripts\/issue-key\.mjs/);
  assert.doesNotMatch(page, /cooperation-hub/);
  assert.doesNotMatch(page, /gstatic\.com\/firebase/);
});

test("Firebase login UI is opt-in through public deployment vars", () => {
  const page = renderPage({
    FIREBASE_API_KEY: "demo-api-key",
    FIREBASE_AUTH_DOMAIN: "demo.firebaseapp.com",
    FIREBASE_PROJECT_ID: "demo-project",
  });
  assert.match(page, /demo-project/);
  assert.match(page, /gstatic\.com\/firebase/);
  assert.match(page, /scripts\/issue-key\.mjs/);
});

test("Firebase config parser rejects incomplete public configuration", () => {
  assert.equal(parseFirebaseConfig({ FIREBASE_API_KEY: "x" }), null);
  assert.deepEqual(parseFirebaseConfig({
    FIREBASE_API_KEY: "x", FIREBASE_AUTH_DOMAIN: "x.firebaseapp.com", FIREBASE_PROJECT_ID: "x-project",
  }), { apiKey: "x", authDomain: "x.firebaseapp.com", projectId: "x-project" });
});

test("Firebase config can be supplied as a JSON deployment variable", () => {
  assert.deepEqual(parseFirebaseConfig({
    FIREBASE_CONFIG: JSON.stringify({ apiKey: "x", authDomain: "x.firebaseapp.com", projectId: "x-project" }),
  }), { apiKey: "x", authDomain: "x.firebaseapp.com", projectId: "x-project" });
});
