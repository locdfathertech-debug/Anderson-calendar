import { usePrivatePhotoUrl } from "./lib/usePrivatePhotoUrl.js";
import { isPrivatePhoto } from "./lib/privatePhotos.js";
import { useEffect, useRef, useState } from "react";
import { safeAvatarUrl } from "./lib/avatar.js";
import { compressMemberPhoto, validateMemberPhoto } from "./lib/photoUpload.js";

export default function MemberPhotoField({ value, onChange, disabled = false, onBusyChange, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const job = useRef(0);
  const linkInput = useRef(null);
  useEffect(() => { linkInput.current?.setCustomValidity(""); }, [value]);
  const processing = useRef(false);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  useEffect(() => () => { job.current += 1; busyCallback.current?.(false); }, []);

  async function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || processing.current || disabled) return;
    setError("");
    try { validateMemberPhoto(file); } catch (failure) { setError(failure.message); return; }
    const current = ++job.current;
    processing.current = true;
    setBusy(true);
    busyCallback.current?.(true);
    try {
      const photo = await compressMemberPhoto(file);
      if (job.current === current) onChange(photo);
    } catch (failure) {
      if (job.current === current) setError(failure.message || "Photo processing failed. Please try again.");
    } finally {
      processing.current = false;
      if (job.current === current) { setBusy(false); busyCallback.current?.(false); }
    }
  }
  const privateUrl = usePrivatePhotoUrl(value);
  const preview = isPrivatePhoto(value) ? privateUrl : safeAvatarUrl(value);
  return (
    <div className="member-photo-field">
      <label>
        Upload photo
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || busy}
          onChange={selectPhoto} style={{ minHeight: 48, width: "100%" }} />
      </label>
      {!compact && preview && <img key={preview} src={preview} onError={(event) => { event.currentTarget.hidden = true; }} alt="Selected profile photo preview" referrerPolicy="no-referrer" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "50%" }} />}
      <p className="footnote" aria-live="polite">{busy ? "Processing photo…" : compact ? "JPG, PNG or WebP · up to 5 MB." : "PNG, JPEG or WebP, up to 5 MB. Your photo is saved when you select Save plan."}</p>
      {!compact && <label>
        Or use an HTTPS photo link
        <input ref={linkInput} type="url" data-avatar-url="" value={typeof value === "string" && !value.startsWith("data:") && !isPrivatePhoto(value) ? value : ""}
          disabled={disabled || busy} placeholder="https://…" style={{ minHeight: 48 }}
          onChange={(event) => { event.target.setCustomValidity(""); setError(""); onChange(event.target.value); }} />
      </label>}
      {error && <p role="alert">{error}</p>}
      {value && !busy && <button className="btn" type="button" disabled={disabled} onClick={() => { onChange(""); setError(""); }}>Remove photo</button>}
    </div>
  );
}
