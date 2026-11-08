// Profile pictures are HTTPS images or bounded, re-encoded JPEG thumbnails.
// Signed image endpoints need not have a filename extension.
export function safeAvatarUrl(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length <= 280000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)) return value;
  if (!/^https:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}
