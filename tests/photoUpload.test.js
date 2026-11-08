import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PHOTO_BYTES, validateMemberPhoto, photoDimensions, compressMemberPhoto } from "../src/lib/photoUpload.js";

test("photo input accepts supported images and rejects empty, unsupported, or oversized files", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.equal(validateMemberPhoto({ type, size: MAX_PHOTO_BYTES }).type, type);
  for (const file of [null, { type: "image/svg+xml", size: 10 }, { type: "image/gif", size: 10 }, { type: "image/png", size: 0 }, { type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }]) assert.throws(() => validateMemberPhoto(file));
});
test("resizing preserves aspect ratio without enlarging small photos", () => {
  assert.deepEqual(photoDimensions(1600, 800), { width: 384, height: 192 });
  assert.deepEqual(photoDimensions(200, 300), { width: 200, height: 300 });
  assert.deepEqual(photoDimensions(800, 1600), { width: 192, height: 384 });
  for (const size of [[0, 200], [Infinity, 100], [10000, 7000], [20000, 1]]) assert.throws(() => photoDimensions(...size));
});
test("compression emits a small JPEG and releases its decoded bitmap", async () => {
  const previousBitmap = globalThis.createImageBitmap;
  const previousDocument = globalThis.document;
  const previousReader = globalThis.FileReader;
  let closed = false;
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (callback, type, quality) => { assert.equal(type, "image/jpeg"); assert.equal(quality, 0.8); callback(new Blob(["jpeg"], { type })); } };
  globalThis.createImageBitmap = async () => ({ width: 1600, height: 800, close() { closed = true; } });
  globalThis.document = { createElement: () => canvas };
  globalThis.FileReader = class { readAsDataURL() { this.result = "data:image/jpeg;base64,/9j/AA=="; this.onload(); } };
  try {
    assert.equal(await compressMemberPhoto({ type: "image/png", size: 100 }), "data:image/jpeg;base64,/9j/AA==");
    assert.equal(canvas.width, 384);
    assert.equal(canvas.height, 192);
    assert.equal(closed, true);
    closed = false;
    canvas.toBlob = (callback) => callback(new Blob([new Uint8Array(205000)]));
    await assert.rejects(compressMemberPhoto({ type: "image/png", size: 100 }), /too detailed/);
    assert.equal(closed, true);
  } finally { globalThis.createImageBitmap = previousBitmap; globalThis.document = previousDocument; globalThis.FileReader = previousReader; }
});
