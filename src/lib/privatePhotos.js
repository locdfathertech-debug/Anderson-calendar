// Private member photos are scoped to the signed-in household by Storage RLS.
// This format is not a URL and MUST NOT be handed directly to an <img> element.
export const PRIVATE_PHOTO_BUCKET = "family-photos";
export const PRIVATE_PHOTO_PREFIX = "family-photo:";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH = new RegExp(`^(${UUID})/(${UUID})\\.jpg$`);
export function privatePhotoPath(value) {
  if (typeof value !== "string" || !value.startsWith(PRIVATE_PHOTO_PREFIX)) return null;
  const candidate = value.slice(PRIVATE_PHOTO_PREFIX.length);
  return PATH.test(candidate) ? candidate : null;
}
export function isPrivatePhoto(value) { return privatePhotoPath(value) !== null; }
export function privatePhotoEnabled() { return import.meta.env?.VITE_PRIVATE_FAMILY_PHOTOS === "true"; }
export async function uploadPrivateMemberPhoto(client, familyId, imageDataUrl) {
  const uuid = new RegExp(`^${UUID}$`);
  if (!uuid.test(familyId)) throw new Error("A verified household is required to save photos.");
  const prefix = "data:image/jpeg;base64,";
  const encoded = typeof imageDataUrl === "string" && imageDataUrl.startsWith(prefix) ? imageDataUrl.slice(prefix.length) : "";
  if (!encoded || !encoded.startsWith("/9j/") || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
    throw new Error("Only compressed JPEG photos may be uploaded.");
  const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  if (bytes.length < 6 || bytes.length > 262144) throw new Error("Photo is too large or invalid.");
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9)
    throw new Error("Only valid JPEG photos are supported.");
  const path = `${familyId}/${crypto.randomUUID()}.jpg`;
  const { error } = await client.storage.from(PRIVATE_PHOTO_BUCKET).upload(path, new Blob([bytes], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Private photo upload failed: ${error.message}`);
  return PRIVATE_PHOTO_PREFIX + path;
}
export async function signedPrivatePhotoUrl(client, ref) {
  const path = privatePhotoPath(ref);
  if (!path) return null;
  const { data, error } = await client.storage.from(PRIVATE_PHOTO_BUCKET).createSignedUrl(path, 300);
  if (error || typeof data?.signedUrl !== "string" || !data.signedUrl.startsWith("https://")) return null;
  return data.signedUrl;
}

// Never persist a fresh inline JPEG in a planner record: the entire base64
// value would be visible to every household member with planner read access.
// Existing legacy photos remain readable until an audited migration replaces
// them, but new uploads require private Storage with household RLS.
export async function prepareMemberPhotoData(client, familyId, recordData, storageEnabled = privatePhotoEnabled()) {
  if (!recordData || typeof recordData !== "object") throw new Error("Invalid family member data.");
  const value = typeof recordData.avatar_url === "string" ? recordData.avatar_url : "";
  if (!value.startsWith("data:")) return recordData;
  if (!value.startsWith("data:image/jpeg;base64,")) throw new Error("Only JPEG uploads are supported.");
  if (!storageEnabled) throw new Error("Private photo storage is not activated. This photo was not saved to the shared family database.");
  const avatar_url = await uploadPrivateMemberPhoto(client, familyId, value);
  return {...recordData,avatar_url};
}
