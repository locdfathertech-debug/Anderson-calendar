import test from "node:test";
import assert from "node:assert/strict";
import { videoSource, categoryInfo } from "../src/lib/video.js";

test("YouTube sources are validated and normalized across supported URL forms", () => {
  for (const url of [
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=5",
  ]) assert.deepEqual(videoSource(url), { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", provider: "YouTube" });
  for (const url of ["https://youtube.com/watch?v=bad", "https://youtu.be/bad", "https://youtube.com/playlist?list=abc"]) assert.equal(videoSource(url), null);
});

test("Vimeo IDs normalize while direct media preserves signed query strings", () => {
  for (const url of ["https://vimeo.com/123456", "https://www.vimeo.com/123456/", "https://player.vimeo.com/video/123456"])
    assert.deepEqual(videoSource(url), { url: "https://vimeo.com/123456", provider: "Vimeo" });
  assert.equal(videoSource("https://vimeo.com/not-a-video"), null);
  const signed = "https://media.example.com/recipe.MP4?signature=secret&expires=100";
  assert.deepEqual(videoSource(signed), { url: signed, provider: "Video" });
  assert.equal(videoSource("https://media.example.com/recipe.webm").provider, "Video");
});

test("unsupported or deceptive sources never become player requests", () => {
  for (const input of [null, undefined, {}, "", "  ", "http://media.example.com/a.mp4", "javascript:alert(1)", "data:video/mp4;base64,AAA", "//youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://evil-youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ", "https://user:pass@media.example.com/a.mp4", "https://example.com/page", "https://example.com/a.mp4/more", "/other.mp4", "/demo-recipe.mp4?other=1", "https://example.com\\a.mp4", "https://example.com/a\n.mp4"])
    assert.equal(videoSource(input), null, String(input));
});

test("only the named bundled demo asset is allowed as an internal media path", () => {
  assert.deepEqual(videoSource("/demo-recipe.mp4"), { url: "/demo-recipe.mp4", provider: "Video" });
});

test("calendar categories normalize both saved and new labels without losing other labels", () => {
  assert.deepEqual(categoryInfo("work"), { key: "work", label: "Work", icon: "💼" });
  assert.deepEqual(categoryInfo(" Daycare "), { key: "daycare", label: "Daycare", icon: "🧸" });
  for (const value of ["Activities", "activity", "Activity"]) assert.deepEqual(categoryInfo(value), { key: "activity", label: "Activities", icon: "⚽" });
  assert.deepEqual(categoryInfo("School"), { key: "general", label: "School", icon: "" });
  assert.deepEqual(categoryInfo(null), { key: "general", label: "General", icon: "" });
});


test("unlisted Vimeo privacy hashes survive normalization without extra parameters", () => {
  for (const url of [
    "https://vimeo.com/123456/abC789",
    "https://vimeo.com/123456?h=abC789&autoplay=1",
    "https://player.vimeo.com/video/123456?h=abC789&tracking=remove",
  ]) assert.deepEqual(videoSource(url), { url: "https://vimeo.com/123456?h=abC789", provider: "Vimeo" });
  for (const url of ["https://vimeo.com/123456?h=", "https://vimeo.com/123456?h=bad%20hash", "https://vimeo.com/123456/bad-hash", "https://player.vimeo.com/video/123456?h=bad%26token"])
    assert.equal(videoSource(url), null);
});
