import { useCallback, useEffect, useRef, useState } from "react";
import Planner from "./Planner.jsx";
import FamilyOnboarding from "./FamilyOnboarding.jsx";
import CalendarKiosk from "./CalendarKiosk.jsx";
import ParentGate from "./ParentGate.jsx";
import { clearParentGrant, setParentGrant, getParentToken } from "./lib/parentAccess.js";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { sampleRecords } from "./lib/planner.js";
import { CalendarDays } from "lucide-react";
import "./hub.css";
const emptyProfile = { id: "sample-parent", role: "super_admin", email: "sample@example.com" };
const isParent = p => ["admin", "super_admin"].includes(p?.role);
export default function App() {
  const path = window.location.pathname.replace(/\/$/, "");
  const demo = path === "/demo" || path === "/demo/kiosk";
  const kioskPreferenceKey = demo ? "family-kiosk-sample-enabled" : "family-kiosk-enabled";
  const [kioskEnabled, setKioskEnabled] = useState(() => {
    try { const saved = localStorage.getItem(kioskPreferenceKey); return saved === "true"; }
    catch { return false; }
  });
  const [kioskNotice, setKioskNotice] = useState("");
  function rememberKiosk(enabled) {
    setKioskEnabled(enabled);
    try { localStorage.setItem(kioskPreferenceKey, String(enabled)); }
    catch { setKioskNotice("This browser cannot save the kiosk preference. Re-select the display mode after reloading."); }
  }
  function startKiosk() {
    if (!isParent(profile)) { setError("Sign in with a parent account to configure this shared tablet."); return; }
    if (!portalStatus?.configured) {
      setKioskNotice("Create your Parent PIN, then choose Start Kiosk Mode from the parent workspace.");
      void openParent();
      return;
    }
    setKioskNotice("");
    // Clear privileged state synchronously; request fullscreen in this same user gesture.
    void lock();
    rememberKiosk(true);
    try {
      if (!document.fullscreenElement && !window.matchMedia?.("(display-mode: fullscreen)").matches) {
        if (!document.documentElement.requestFullscreen) throw new Error("unavailable");
        Promise.resolve(document.documentElement.requestFullscreen()).catch(() => setKioskNotice("Fullscreen is unavailable. Open the installed calendar app, then pin it using Samsung Settings."));
      }
    } catch { setKioskNotice("Fullscreen is unavailable. Open the installed calendar app, then pin it using Samsung Settings."); }
  }
  function stopKiosk() {
    if (!workspace.current || !isParent(profile)) return;
    setKioskNotice("");
    rememberKiosk(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
  const [eventRequest, setEventRequest] = useState(null);
  const [session, setSession] = useState(null),
    [profile, setProfile] = useState(demo ? emptyProfile : null),
    [records, setRecords] = useState(demo ? sampleRecords : []),
    [accounts, setAccounts] = useState([]), [access, setAccess] = useState([]),
    [loading, setLoading] = useState(!demo), [busy, setBusy] = useState(false),
    [error, setError] = useState(""), [gateOpen, setGateOpen] = useState(false),
    [unlocked, setUnlocked] = useState(false), [expiresAt, setExpiresAt] = useState(null),
    [portalStatus, setPortalStatus] = useState(demo ? { is_parent: true, configured: false } : null);
  const generation = useRef(0), accessEpoch = useRef(0), workspace = useRef(false), demoPin = useRef(null), currentUser = useRef(null), locking = useRef(Promise.resolve());
  const closeGate = useCallback(() => { accessEpoch.current++; setGateOpen(false); setEventRequest(null); }, []);
  function clearWorkspace() {
    generation.current++; accessEpoch.current++; workspace.current = false; setEventRequest(null);
    clearParentGrant(); setUnlocked(false); setExpiresAt(null); setGateOpen(false);
    if (!demo) setRecords([]);
    setAccounts([]); setAccess([]); setLoading(false); setBusy(false);
    setPortalStatus(demo ? { is_parent: true, configured: Boolean(demoPin.current) } : null);
  }
  async function load(user) {
    const current = ++generation.current;
    if (!user) { setProfile(null); setRecords([]); setLoading(false); return; }
    try {
      const { data: p, error: e } = await supabase.from("profiles").select("id,email,role,family_id").eq("id", user.id).maybeSingle();
      if (e) throw e;
      if (current !== generation.current) return;
      setProfile(p);
      if (!p?.family_id) return;
      const { data: status, error: statusError } = await supabase.rpc("parent_portal_status");
      if (statusError) throw statusError;
      if (current !== generation.current) return;
      setPortalStatus(status);
      if (workspace.current && (!isParent(p) || !status?.unlocked || !getParentToken())) { clearWorkspace(); return; }
      if (!workspace.current) return;
      const result = await supabase.from("planner_records").select("*").eq("family_id", p.family_id).order("created_at");
      if (result.error) throw result.error;
      if (current !== generation.current) return;
      setRecords(result.data || []);
      if (p.role === "super_admin") {
        const [a,b] = await Promise.all([
          supabase.from("profiles").select("id,email,role").eq("family_id", p.family_id),
          supabase.from("family_access").select("email,role").eq("family_id", p.family_id),
        ]);
        if (a.error) throw a.error; if (b.error) throw b.error;
        if (current === generation.current) { setAccounts(a.data || []); setAccess(b.data || []); }
      }
    } catch (e) { if (current === generation.current) { setError(e.message); setPortalStatus(null); if (workspace.current) clearWorkspace(); } }
    finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    if (demo || !isSupabaseConfigured) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({data,error:e}) => {
      if (!active) return;
      if (e) setError(e.message);
      currentUser.current = data.session?.user?.id || null;
      setSession(data.session); load(data.session?.user);
    }).catch(e => { if (active) { setError(e.message); setLoading(false); } });
    const {data} = supabase.auth.onAuthStateChange((event,s) => {
      if (!active) return;
      setSession(s);
      if (event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_OUT" || currentUser.current !== (s?.user?.id || null)) clearWorkspace();
      currentUser.current = s?.user?.id || null;
      setLoading(true);
      setTimeout(() => active && load(s?.user), 0);
    });
    return () => { active = false; generation.current++; accessEpoch.current++; clearParentGrant(); data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { clearWorkspace(); setError("Parent access expired. Enter your PIN to continue."); }, Math.max(0, Date.parse(expiresAt)-Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  async function unlock(pin, setup) {
    if (!isParent(profile)) throw new Error("Sign in with a parent account to manage this family.");
    if (!/^\d{6,12}$/.test(pin)) throw new Error("Use a PIN with 6–12 digits.");
    const epoch = accessEpoch.current;
    await locking.current;
    if (epoch !== accessEpoch.current) return;
    let receipt;
    if (demo) {
      if (setup && !demoPin.current) demoPin.current = pin;
      if (pin !== demoPin.current) throw new Error("Incorrect sample PIN.");
      receipt = { expires_at: new Date(Date.now()+15*60000).toISOString() };
    } else {
      const {data,error:e} = await supabase.rpc(setup ? "set_parent_pin" : "unlock_parent_portal", setup ? {new_pin:pin} : {pin});
      if (e) throw e;
      if (epoch !== accessEpoch.current) return;
      if (!data?.ok) throw new Error(data?.retry_after ? "Too many attempts. Please wait before trying again." : "Incorrect Parent PIN.");
      setParentGrant(data); receipt = data;
    }
    if (epoch !== accessEpoch.current) return;
    workspace.current = true; setUnlocked(true); setExpiresAt(receipt.expires_at); setGateOpen(false);
    setPortalStatus({is_parent:true,configured:true,unlocked:true,expires_at:receipt.expires_at});
    if (!demo) { setLoading(true); await load(session.user); }
  }
  async function lock() {
    clearWorkspace();
    if (!demo) {
      locking.current = (async () => {
        try { const {error:e} = await supabase.rpc("lock_parent_portal"); if (e) throw e; }
        catch { setError("This display is locked. Server revocation could not be confirmed; its grant will expire automatically."); }
      })();
      await locking.current;
    }
  }
  function requestNewEvent(day) {
    if (!isParent(profile)) return;
    setEventRequest({date:day}); void openParent();
  }
  async function openParent() {
    setGateOpen(true);
    if (!demo) {
      const epoch = accessEpoch.current;
      const {data,error:e} = await supabase.rpc("parent_portal_status");
      if (epoch !== accessEpoch.current) return;
      if (e) { setPortalStatus(null); setError(e.message); } else setPortalStatus(data);
    }
  }
  async function save(record) {
    if (!workspace.current || !isParent(profile)) return false;
    const epoch = accessEpoch.current;
    setBusy(true); setError("");
    try {
      let next;
      if (demo) next = {...record,id:record.id || `sample-${Date.now()}-${Math.random().toString(36).slice(2)}`};
      else {
        const payload = {kind:record.kind,data:record.data,family_id:profile.family_id};
        const result = record.id
          ? await supabase.from("planner_records").update(payload).eq("id",record.id).eq("family_id",profile.family_id).select().single()
          : await supabase.from("planner_records").insert(payload).select().single();
        if (result.error) throw result.error; next = result.data;
      }
      if (epoch !== accessEpoch.current) return false;
      setRecords(rows => record.id ? rows.map(r => r.id === record.id ? next : r) : [...rows,next]); return true;
    } catch(e) { if (epoch === accessEpoch.current) setError(e.message); return false; }
    finally { if (epoch === accessEpoch.current) setBusy(false); }
  }
  async function remove(id) {
    if (!workspace.current || !isParent(profile)) return false;
    const epoch = accessEpoch.current; setBusy(true); setError("");
    try {
      if (!demo) {
        const {data,error:e} = await supabase.from("planner_records").delete().eq("id",id).eq("family_id",profile.family_id).select("id");
        if (e) throw e; if (!data.length) throw new Error("This item could not be deleted.");
      }
      if (epoch !== accessEpoch.current) return false;
      setRecords(rows => rows.filter(r => r.id !== id)); return true;
    } catch(e) { if (epoch === accessEpoch.current) setError(e.message); return false; }
    finally { if (epoch === accessEpoch.current) setBusy(false); }
  }
  async function submitChore(id) {
    setBusy(true); setError("");
    try {
      const {error:e} = await supabase.rpc("submit_planner_chore",{record_id:id});
      if (e) throw e; if (workspace.current) await load(session.user);
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function signOut() {
    clearWorkspace();
    if (demo) { window.location.href = "/login"; return; }
    const {error:e} = await supabase.auth.signOut();
    if (e) { setError("The display is locked, but signing out failed. Please try Switch account again."); return; }
    setSession(null); setProfile(null); setRecords([]);
  }
  async function manageAccess(action,value,role="member") {
    if (!workspace.current || !isParent(profile)) return false;
    if (demo) { setError("Account authorization is available only in your signed-in family."); return false; }
    const epoch = accessEpoch.current; setBusy(true);
    try {
      const result = action === "role" ? await supabase.rpc("set_family_role",{target_user_id:value,new_role:role})
        : action === "remove" ? await supabase.from("family_access").delete().eq("email",value).eq("family_id",profile.family_id)
        : await supabase.from("family_access").insert({email:value.trim().toLowerCase(),role,family_id:profile.family_id});
      if (result.error) throw result.error;
      if (epoch !== accessEpoch.current) return false;
      await load(session.user); return true;
    } catch(e) { if (epoch === accessEpoch.current) setError(e.message); return false; }
    finally { if (epoch === accessEpoch.current) setBusy(false); }
  }
  const activeKiosk = kioskEnabled && isParent(profile);
  const recovery = window.location.pathname === "/update-password";
  return <>
    {loading ? <main className="auth-scene"><div className="auth-box"><CalendarDays/><h1>Gathering your family plans…</h1></div></main>
      : recovery && session ? <Auth recovery onError={setError}/>
      : demo || (session && profile?.family_id) ? unlocked && isParent(profile)
        ? <Planner eventRequest={eventRequest} onEventRequestHandled={() => setEventRequest(null)} records={records} profile={profile} accounts={accounts} access={access} onManageAccess={manageAccess} onSave={save} onDelete={remove} onSubmitChore={submitChore} onSignOut={signOut} onLock={lock} kioskEnabled={activeKiosk} onStartKiosk={startKiosk} onStopKiosk={stopKiosk} demo={demo} busy={busy}/>
        : <CalendarKiosk familyId={profile.family_id} sample={demo ? records : null} profile={profile} onSubmitChore={submitChore} busy={busy} onOpenParent={openParent} onRequestEvent={requestNewEvent} portalOpen={gateOpen} kioskEnabled={activeKiosk} onStartKiosk={startKiosk} kioskNotice={kioskNotice}/>
      : session ? <FamilyOnboarding email={session.user.email} onComplete={() => load(session.user)} onSignOut={signOut}/>
      : <Auth onError={setError}/>}
    {gateOpen && <ParentGate status={portalStatus} demo={demo} onUnlock={unlock} onClose={closeGate} onSignOut={signOut} allowAccountSwitch={!activeKiosk}/>}
    {error && <div className="error-toast" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
  </>;
}
function Auth({ recovery = false, onError }) {
  const [mode, setMode] = useState(
      recovery
        ? "update"
        : window.location.pathname === "/reset-password"
          ? "reset"
          : "login",
    ),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      onError(
        "Family sign-in is not configured yet. You can explore the sample workspace.",
      );
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "reset"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin + "/update-password",
            })
          : mode === "update"
            ? await supabase.auth.updateUser({ password })
            : mode === "signup"
              ? await supabase.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: window.location.origin },
                })
              : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "update") {
        window.location.href = "/";
        return;
      }
      if (mode === "signup")
        setMessage(
          "Check your email to confirm your account. Then sign in to create or join your family.",
        );
      if (mode === "reset")
        setMessage("If your account exists, a reset link is on its way.");
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function oauth(provider) {
    if (!isSupabaseConfigured) {
      onError("Provider sign-in needs deployment configuration.");
      return;
    }
    setBusy(true);
    onError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + (window.location.pathname.startsWith("/kiosk") ? "/kiosk" : ""),
          ...(provider === "azure" ? { scopes: "email" } : {}),
        },
      });
      if (error) throw error;
    } catch (error) {
      onError(error.message);
      setBusy(false);
    }
  }
  return (
    <main className="auth-scene">
      <section className="auth-story">
        <p>ANDERSON FAMILY HUB</p>
        <h1>
          Sync the schedule.
          <br />
          Share the love
        </h1>
        <p>
          One home for the plans, meals, little wins,
          <br />
          and memories that make a family.
        </p>
        <div className="auth-shapes">
          <span>☀</span>
          <span>✦</span>
          <span>⌂</span>
        </div>
      </section>
      <section className="auth-box">
        <img
          className="auth-brand"
          src="/anderson-family-calendar-logo.png"
          alt="Anderson Family Calendar"
          width="1024"
          height="1024"
        />
        <p className="eyebrow">WELCOME HOME</p>
        <h1>
          {
            {
              login: "Your family, in sync.",
              signup: "Join your family.",
              reset: "A fresh start.",
              update: "Choose a new password.",
            }[mode]
          }
        </h1>
        <p className="muted">
          A little planning makes room for a lot more living.
        </p>
        {(mode === "login" || mode === "signup") && (
          <div className="oauth-buttons">
            <button className="btn" disabled={busy} onClick={() => oauth("google")}>
              Continue with Google
            </button>
            <button className="btn" disabled={busy} onClick={() => oauth("azure")}>
              Continue with Microsoft
            </button>
            <button className="btn" disabled={busy} onClick={() => oauth("apple")}>
              Continue with Apple
            </button>
            <small>Sign in to create or join your family.</small>
          </div>
        )}
        <form onSubmit={submit}>
          {mode !== "update" && (
            <label>
              Email address
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Password
              <input
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                type="password"
                minLength={mode === "login" ? 1 : 10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}
          <button className="btn primary full" disabled={busy}>
            {busy
              ? "Please wait…"
              : {
                  login: "Sign in",
                  signup: "Create account",
                  reset: "Send reset link",
                  update: "Save password",
                }[mode]}
          </button>
        </form>
        {message && <p role="status">{message}</p>}
        {mode !== "update" && (
          <div className="auth-options">
            <button
              className="text-btn"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Back to sign in"
                : "Create an account"}
            </button>
            <button
              className="text-btn"
              onClick={() => setMode(mode === "reset" ? "login" : "reset")}
            >
              {mode === "reset" ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        )}
        <a className="sample-link" href="/demo">
          Explore a sample family →
        </a>
      </section>
    </main>
  );
}
