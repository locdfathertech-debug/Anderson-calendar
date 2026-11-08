const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// Only supported media URLs become an embed or a video request. Calendar notes
// and arbitrary web pages remain ordinary text, never iframe sources.
export function videoSource(raw) {
  if (typeof raw !== "string") return null;
  const input = raw.trim();
  if (input === "/demo-recipe.mp4") return { url: input, provider: "Video" };
  if (!input || !/^https:\/\//i.test(input) || /[\u0000-\u0020\u007f\\]/.test(input)) return null;
  let url;
  try { url = new URL(input); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  let id;
  if (host === "youtu.be") {
    id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    return id ? { url: `https://www.youtube.com/watch?v=${id}`, provider: "YouTube" } : null;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    return VIDEO_ID.test(id || "") ? { url: `https://www.youtube.com/watch?v=${id}`, provider: "YouTube" } : null;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const match = host === "player.vimeo.com"
      ? url.pathname.match(/^\/video\/([0-9]+)\/?$/)
      : url.pathname.match(/^\/([0-9]+)(?:\/([A-Za-z0-9]+))?\/?$/);
    if (!match) return null;
    const hash = url.searchParams.get("h") ?? match[2];
    if (hash !== undefined && !/^[A-Za-z0-9]+$/.test(hash)) return null;
    const suffix = hash ? `?h=${hash}` : "";
    return { url: `https://vimeo.com/${match[1]}${suffix}`, provider: "Vimeo" };
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return { url: url.href, provider: "Video" };
  return null;
}

export function categoryInfo(raw) {
  const label = typeof raw === "string" ? raw.trim() : "";
  switch (label.toLowerCase()) {
    case "work": return { key: "work", label: "Work", icon: "💼" };
    case "daycare": return { key: "daycare", label: "Daycare", icon: "🧸" };
    case "activity":
    case "activities": return { key: "activity", label: "Activities", icon: "⚽" };
    default: return { key: "general", label: label || "General", icon: "" };
  }
}
