import test from "node:test";
import assert from "node:assert/strict";
import { safeAvatarUrl } from "../src/lib/avatar.js";

test("avatars accept HTTPS signed endpoints without requiring image extensions", () => {
  assert.equal(safeAvatarUrl(" https://images.example.com/profile?id=42&token=signed "), "https://images.example.com/profile?id=42&token=signed");
  assert.equal(safeAvatarUrl("https://images.example.com/portrait.webp"), "https://images.example.com/portrait.webp");
});

test("avatars reject executable schemes, insecure links, credentials and nonstandard ports", () => {
  for (const value of [null, undefined, {}, "", "javascript:alert(1)", "data:image/svg+xml,<svg/>", "http://example.com/a.png", "//example.com/a.png", "https://user:password@example.com/a.png", "https://example.com:8443/a.png", "https://example.com/hello world.png", "https://example.com\\@evil.test/a.png", "https://", "https://exa\nmple.com/a.png"]) {
    assert.equal(safeAvatarUrl(value), null, String(value));
  }
});
