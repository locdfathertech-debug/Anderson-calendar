import { useState } from "react";
import { supabase } from "./lib/supabase.js";

export default function FamilyOnboarding({ email, onComplete, onSignOut }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function setup(action) {
    setBusy(true);
    setMessage("");
    try {
      const { error } = action === "join"
        ? await supabase.rpc("accept_family_authorization")
        : await supabase.rpc("create_family", { family_name: name.trim() });
      if (error) throw error;
      await onComplete();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-scene onboarding-scene">
      <section className="auth-box">
        <img className="auth-brand" src="/anderson-family-calendar-logo.png" alt="Anderson Family Calendar" width="1024" height="1024" />
        <p className="eyebrow">WELCOME TO YOUR FAMILY HUB</p>
        <h1>Make yourself at home.</h1>
        <p className="muted">Signed in as {email || "your account"}.</p>
        <h2>Joining your family?</h2>
        <p className="muted">Ask a parent to authorize the email above in their family portal, then join here. Your provider may use an Apple private relay address.</p>
        <button className="btn full" disabled={busy} onClick={() => setup("join")}>Join my family</button>
        <h2 className="onboarding-create">Starting a new family?</h2>
        <form onSubmit={event => { event.preventDefault(); setup("create"); }}>
          <label>Family name
            <input value={name} onChange={event => setName(event.target.value)} required minLength={1} maxLength={120} placeholder="Your family name" />
          </label>
          <button className="btn primary full" disabled={busy || !name.trim()}>Create my family</button>
        </form>
        {message && <p role="alert">{message}</p>}
        <button className="text-btn" onClick={onComplete} disabled={busy}>Refresh family access</button>
        <button className="text-btn" onClick={onSignOut} disabled={busy}>Sign out</button>
      </section>
    </main>
  );
}
