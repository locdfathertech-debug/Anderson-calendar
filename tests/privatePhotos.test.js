import test from "node:test";
import assert from "node:assert/strict";
import { privatePhotoPath, isPrivatePhoto, uploadPrivateMemberPhoto, signedPrivatePhotoUrl } from "../src/lib/privatePhotos.js";

const FAMILY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAMILY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OBJECT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ref = `family-photo:${FAMILY_A}/${OBJECT}.jpg`;
test("private photo references are strictly scoped to UUID folder and immutable JPEG name", () => {
  assert.equal(privatePhotoPath(ref), `${FAMILY_A}/${OBJECT}.jpg`);
  assert.equal(isPrivatePhoto(ref), true);
  for (const candidate of ["family-photo:../secret.jpg","family-photo:abc.jpg","family-photo:https://example.com/x","https://example.com/x","family-photo:" + FAMILY_B + "/../../x.jpg"]) {
    assert.equal(isPrivatePhoto(candidate), false, candidate);
  }
});
test("upload stores a private immutable family reference; never public URL", async () => {
  const uploaded = [];
  const storage = { from(bucket) {
    assert.equal(bucket, "family-photos");
    return { async upload(path, blob, opts) {
      uploaded.push({path, blob, opts});
      return { error: null };
    } };
  }};
  const jpeg = Buffer.from([0xff,0xd8,0xff,0xe0,0xff,0xd9]);
  const result = await uploadPrivateMemberPhoto({storage}, FAMILY_A, `data:image/jpeg;base64,${jpeg.toString("base64")}`);
  assert.equal(isPrivatePhoto(result), true);
  assert.ok(result.startsWith(`family-photo:${FAMILY_A}/`));
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].opts.upsert, false);
  assert.equal(uploaded[0].blob.type, "image/jpeg");
});
test("invalid files, unauthenticated family and failed uploads are rejected", async () => {
  const storage = {from() {return { upload: async () => ({ error: {message:"permission denied"}}) };}};
  const jpeg = Buffer.from([0xff,0xd8,0xff,0xe0,0xff,0xd9]);
  const data = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  await assert.rejects(uploadPrivateMemberPhoto({storage}, "unknown", data), /household/);
  await assert.rejects(uploadPrivateMemberPhoto({storage}, FAMILY_A, "data:image/svg+xml;base64,abcd"), /JPEG/);
  await assert.rejects(uploadPrivateMemberPhoto({storage}, FAMILY_A, data), /permission denied/);
});
test("signed read respects server Storage authorization failures", async () => {
  const client = {storage:{from() {return {createSignedUrl:async()=>({data:null,error:{message:"forbidden"}})};}}};
  assert.equal(await signedPrivatePhotoUrl(client, ref), null);
});
