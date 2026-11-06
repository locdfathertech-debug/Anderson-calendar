import { useEffect, useRef, useState } from "react";
import Planner from "./Planner.jsx";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { sampleRecords } from "./lib/planner.js";
import { CalendarDays } from "lucide-react";
import "./hub.css";
const emptyProfile = {
  id: "sample-parent",
  role: "super_admin",
  email: "sample@example.com",
};
export default function App() {
  const demo = window.location.pathname === "/demo";
  const [session, setSession] = useState(null),
    [profile, setProfile] = useState(demo ? emptyProfile : null),
    [records, setRecords] = useState(demo ? sampleRecords : []),
    [accounts, setAccounts] = useState([]),
    [access, setAccess] = useState([]),
    [loading, setLoading] = useState(!demo),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  async function load(user) {
    const current = ++generation.current;
    if (!user) {
      setProfile(null);
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      const { data: p, error: e } = await supabase
        .from("profiles")
        .select("id,email,role,family_id")
        .eq("id", user.id)
        .maybeSingle();
      if (e) throw e;
      if (current !== generation.current) return;
      setProfile(p);
      if (p) {
        const result = await supabase
          .from("planner_records")
          .select("*")
          .eq("family_id", p.family_id)
          .order("created_at");
        if (result.error) throw result.error;
        if (current === generation.current) setRecords(result.data || []);
        if (p.role === "super_admin") {
          const [a, b] = await Promise.all([
            supabase
              .from("profiles")
              .select("id,email,role")
              .eq("family_id", p.family_id),
            supabase
              .from("family_access")
              .select("email,role")
              .eq("family_id", p.family_id),
          ]);
          if (a.error) throw a.error;
          if (b.error) throw b.error;
          if (current === generation.current) {
            setAccounts(a.data || []);
            setAccess(b.data || []);
          }
        }
      }
    } catch (e) {
      if (current === generation.current) setError(e.message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (demo || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) setError(e.message);
        setSession(data.session);
        load(data.session?.user);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setLoading(true);
      setTimeout(() => active && load(s?.user), 0);
    });
    return () => {
      active = false;
      generation.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  async function save(record) {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        const next = {
          ...record,
          id:
            record.id ||
            `sample-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        setRecords((rows) =>
          record.id
            ? rows.map((r) => (r.id === record.id ? next : r))
            : [...rows, next],
        );
        return true;
      }
      const payload = {
        kind: record.kind,
        data: record.data,
        family_id: profile.family_id,
      };
      const result = record.id
        ? await supabase
            .from("planner_records")
            .update(payload)
            .eq("id", record.id)
            .eq("family_id", profile.family_id)
            .select()
            .single()
        : await supabase
            .from("planner_records")
            .insert(payload)
            .select()
            .single();
      if (result.error) throw result.error;
      setRecords((rows) =>
        record.id
          ? rows.map((r) => (r.id === record.id ? result.data : r))
          : [...rows, result.data],
      );
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      if (!demo) {
        const { data, error: e } = await supabase
          .from("planner_records")
          .delete()
          .eq("id", id)
          .eq("family_id", profile.family_id)
          .select("id");
        if (e) throw e;
        if (!data.length) throw new Error("This item could not be deleted.");
      }
      setRecords((rows) => rows.filter((r) => r.id !== id));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submitChore(id) {
    setBusy(true);
    setError("");
    try {
      const { error: e } = await supabase.rpc("submit_planner_chore", {
        record_id: id,
      });
      if (e) throw e;
      await load(session.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (demo) {
      window.location.href = "/login";
      return;
    }
    generation.current++;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRecords([]);
  }
  async function manageAccess(action, value, role = "member") {
    if (demo) {
      setError(
        "Account authorization is available only in your signed-in family.",
      );
      return false;
    }
    setBusy(true);
    try {
      let result;
      if (action === "role")
        result = await supabase.rpc("set_family_role", {
          target_user_id: value,
          new_role: role,
        });
      else if (action === "remove")
        result = await supabase
          .from("family_access")
          .delete()
          .eq("email", value)
          .eq("family_id", profile.family_id);
      else
        result = await supabase.from("family_access").insert({
          email: value.trim().toLowerCase(),
          role,
          family_id: profile.family_id,
        });
      if (result.error) throw result.error;
      await load(session.user);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const recovery = window.location.pathname === "/update-password";
  return (
    <>
      {loading ? (
        <main className="auth-scene">
          <div className="auth-box">
            <CalendarDays />
            <h1>Gathering your family plans…</h1>
          </div>
        </main>
      ) : recovery && session ? (
        <Auth recovery onError={setError} />
      ) : demo || (session && profile) ? (
        <Planner
          records={records}
          profile={profile}
          accounts={accounts}
          access={access}
          onManageAccess={manageAccess}
          onSave={save}
          onDelete={remove}
          onSubmitChore={submitChore}
          onSignOut={signOut}
          demo={demo}
          busy={busy}
        />
      ) : session ? (
        <main className="auth-scene">
          <div className="auth-box">
            <h1>Your family profile needs setup</h1>
            <p>
              Your login is valid, but it has not been linked to this family.
              Contact the family administrator.
            </p>
            <button className="btn" onClick={() => load(session.user)}>
              Retry
            </button>
            <button className="btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </main>
      ) : (
        <Auth onError={setError} />
      )}{" "}
      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
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
          "Check your email to confirm your account. Only authorized family accounts receive access.",
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
          redirectTo: window.location.origin,
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
          src="/anderson-family-hub-logo.webp"
          alt="Anderson Family Hub"
          width="720"
          height="216"
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
        {mode === "login" && (
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
            <small>Use an email authorized for your family.</small>
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
                : "Create an authorized family account"}
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
