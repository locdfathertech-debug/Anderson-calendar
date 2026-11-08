import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import MemberAvatar from "./MemberAvatar.jsx";
import MemberPhotoField from "./MemberPhotoField.jsx";
import { MEMBER_COLORS, MEMBER_COLOR_LABELS, memberTileStyle, memberColorForSave, isMemberColor } from "./lib/memberColors.js";
import { safeAvatarUrl } from "./lib/avatar.js";

export default function MemberTile({ record, members, editable, busy, onSave, onEdit }) {
  const [color, setColor] = useState(record.data.color || "");
  const [photo, setPhoto] = useState(record.data.avatar_url || "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setColor(record.data.color || ""); setPhoto(record.data.avatar_url || "");
  }, [record.id, record.data.color, record.data.avatar_url]);
  const effectiveColor = memberColorForSave({ ...record, data: { ...record.data, color } }, members);
  const tileStyle = memberTileStyle(effectiveColor);
  const hex = tileStyle["--member-color"];
  const ink = tileStyle["--member-ink"];
  const changed = color !== (record.data.color || "") || photo !== (record.data.avatar_url || "");
  const disabled = busy || saving || photoBusy;
  async function saveTile() {
    if (disabled || !changed) return;
    if (photo && !safeAvatarUrl(photo)) { setMessage("Choose a photo or enter a valid HTTPS photo link."); return; }
    setSaving(true); setMessage("");
    try {
      const result = await onSave({ ...record, data: { ...record.data, color: effectiveColor, avatar_url: safeAvatarUrl(photo) || "" } });
      setMessage(result === false ? "Could not save. Check the message at the top of the page and try again." : "Tile saved.");
    } catch { setMessage("Could not save this tile. Please try again."); }
    finally { setSaving(false); }
  }
  return <article className="item-card family-tile" aria-label={`${record.data.title} family tile`} style={tileStyle}>
    <div className="card-top">
      <MemberAvatar name={record.data.title} url={photo} style={{ "--member-color": hex, "--member-ink": ink }} />
      <span className="pill">{record.data.role || "Family member"}</span>
      {editable && <button className="icon-btn" disabled={disabled} aria-label={`Edit ${record.data.title}`} onClick={onEdit}><ArrowUpRight size={17} /></button>}
    </div>
    <h3>{record.data.title}</h3>
    {editable && <div className="family-tile-controls">
      <div className="family-tile-color-row">
        <label>Tile color<select aria-label={`Tile color for ${record.data.title}`} value={color} disabled={disabled} onChange={e => { setColor(e.target.value); setMessage(""); }}>
          <option value="">Automatic</option>
          {Object.keys(MEMBER_COLORS).map(key => <option key={key} value={key}>{MEMBER_COLOR_LABELS[key]}</option>)}
          {color.startsWith("#") && <option value={color}>Custom ({color})</option>}
        </select></label>
        <label>Custom color<input aria-label={`Custom tile color for ${record.data.title}`} type="color" value={isMemberColor(color) ? hex : "#4bc88b"} disabled={disabled} onChange={e => { setColor(e.target.value); setMessage(""); }} /></label>
      </div>
      <MemberPhotoField compact value={photo} disabled={busy || saving} onBusyChange={setPhotoBusy} onChange={value => { setPhoto(value); setMessage(""); }} />
      <button type="button" className="btn family-tile-save" disabled={disabled || !changed} onClick={saveTile}>{saving ? "Saving…" : "Save tile"}</button>
      <p className="family-tile-status" role="status">{message || (changed ? "Preview · select Save tile to keep changes." : "Change the color or upload a photo here.")}</p>
    </div>}
  </article>;
}
