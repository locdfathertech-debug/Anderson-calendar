import { usePrivatePhotoUrl } from "./lib/usePrivatePhotoUrl.js";
import { isPrivatePhoto } from "./lib/privatePhotos.js";
import { useState } from "react";
import { safeAvatarUrl } from "./lib/avatar.js";

function AvatarPicture({ source, initial }) {
  const [failed, setFailed] = useState(false);
  if (!source || failed) return initial;
  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function MemberAvatar({ name, url, className = "", style = {} }) {
  const privateUrl = usePrivatePhotoUrl(url);
  const source = isPrivatePhoto(url) ? privateUrl : safeAvatarUrl(url);
  const initial = String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span className={`member-avatar ${className}`.trim()} style={style}>
      <AvatarPicture key={source || "fallback"} source={source} initial={initial} />
    </span>
  );
}
