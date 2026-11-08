import { useEffect, useRef, useState } from "react";
import { LockKeyhole, X } from "lucide-react";

export default function ParentGate({ status, demo, onUnlock, onClose, onSignOut }) {
  const [pin, setPin] = useState(""), [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false), [error, setError] = useState("");
  const dialog = useRef(null), mounted = useRef(true);
  const setup = status?.is_parent && !status.configured;
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement;
    const node = dialog.current;
    const focusable = () => [...node.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    (node.querySelector("input") || focusable()[0])?.focus();
    function keys(e) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.includes(document.activeElement)) { e.preventDefault(); (e.shiftKey ? items.at(-1) : items[0])?.focus(); return; }
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
      if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
    }
    node.addEventListener("keydown", keys);
    return () => { mounted.current = false; node.removeEventListener("keydown", keys); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);
  useEffect(() => { if (busy) dialog.current?.querySelector('button[aria-label="Close parent portal"]')?.focus(); }, [busy]);
  async function submit(e) {
    e.preventDefault(); setError("");
    if (!/^\d{6,12}$/.test(pin)) { setError("Use a PIN with 6–12 digits."); return; }
    if (setup && pin !== confirmation) { setError("The PINs do not match."); return; }
    setBusy(true);
    try { await onUnlock(pin, setup); }
    catch (e) { if (mounted.current) { setError(e.message); setPin(""); setConfirmation(""); } }
    finally { if (mounted.current) setBusy(false); }
  }
  return <div className="parent-gate-backdrop">
    <section className="parent-gate" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="parent-gate-title" aria-describedby="parent-gate-description">
      <header><LockKeyhole aria-hidden="true"/><h2 id="parent-gate-title">{setup ? "Create your Parent PIN" : "Parent portal"}</h2><button type="button" aria-label="Close parent portal" onClick={onClose}><X/></button></header>
      <p id="parent-gate-description">{!status ? "Checking parent access. Close and reopen this panel to retry if access cannot be loaded." : !status.is_parent ? "A parent account is required to manage this family. Child accounts keep the calendar view only." : setup ? "Choose 6–12 digits to protect family changes on this shared display. Keep this PIN private." : "Enter your Parent PIN to manage family profiles, calendar plans, and chores."}</p>
      {demo && <p className="kiosk-hint">Sample workspace only. Your chosen sample PIN lasts until this page reloads.</p>}
      {status?.is_parent && <form onSubmit={submit}>
        <label>Parent PIN<input autoFocus type="password" inputMode="numeric" autoComplete={setup ? "new-password" : "off"} minLength={6} maxLength={12} pattern="[0-9]{6,12}" required value={pin} disabled={busy} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}/></label>
        {setup && <label>Confirm Parent PIN<input type="password" inputMode="numeric" autoComplete="new-password" minLength={6} maxLength={12} pattern="[0-9]{6,12}" required value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value.replace(/\D/g, ""))}/></label>}
        {error && <p role="alert">{error}</p>}
        <p className="kiosk-hint">Parent access locks again after 15 minutes, when you reload, or when you select Lock &amp; Exit.</p>
        <button className="primary" disabled={busy} type="submit">{busy ? "Checking…" : setup ? "Set PIN & unlock" : "Unlock"}</button>
      </form>}
      <footer><button type="button" onClick={onClose}>Back to calendar</button><button type="button" disabled={busy} onClick={onSignOut}>{demo ? "Leave sample" : "Switch account"}</button></footer>
    </section>
  </div>;
}
