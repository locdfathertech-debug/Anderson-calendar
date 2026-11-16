import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries((config.headers || [])
  .filter(rule => rule.source === "/(.*)")
  .flatMap(rule => rule.headers.map(({key,value}) => [key.toLowerCase(), value])));

test("all routes have baseline hardening headers", () => {
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
  assert.match(headers["strict-transport-security"], /max-age=\d+/);
  for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
    assert.match(headers["permissions-policy"], new RegExp(`\\b${feature}=\\(\\)`));
  }
});

test("hardening does not redirect API requests or modify SPA routing", () => {
  assert.deepEqual(config.rewrites, [{source:"/(.*)",destination:"/index.html"}]);
});
