export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_COMPRESSED_PHOTO_BYTES = 200 * 1024;

export function validateMemberPhoto(file) {
  if (!file || !PHOTO_TYPES.has(file.type)) throw new Error("Choose a PNG, JPEG, or WebP photo.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("This photo is empty.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Choose a photo no larger than 5 MB.");
  return file;
}

export function photoDimensions(width, height) {
  if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) throw new Error("This photo could not be read.");
  if (width * height > 64000000 || Math.max(width, height) > 16384) throw new Error("Choose a smaller photo (up to 64 megapixels).");
  const scale = Math.min(1, 384 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, close: () => bitmap.close() };
    } catch { /* Older tablet browsers may need the Image decoder. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This photo could not be read. Choose another image."));
      img.src = url;
    });
    return { image, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export async function compressMemberPhoto(file) {
  validateMemberPhoto(file);
  const { image, close } = await decodePhoto(file);
  try {
    const size = photoDimensions(image.width || image.naturalWidth, image.height || image.naturalHeight);
    const canvas = document.createElement("canvas");
    Object.assign(canvas, size);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (photo) => photo ? resolve(photo) : reject(new Error("This photo could not be processed.")),
      "image/jpeg", 0.8,
    ));
    if (blob.size > MAX_COMPRESSED_PHOTO_BYTES) throw new Error("This photo is too detailed. Choose a smaller photo.");
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" && reader.result.startsWith("data:image/jpeg;base64,")
        ? resolve(reader.result) : reject(new Error("This photo could not be processed."));
      reader.onerror = () => reject(new Error("This photo could not be processed."));
      reader.onabort = () => reject(new Error("Photo processing was cancelled."));
      reader.readAsDataURL(blob);
    });
  } finally { close(); }
}
