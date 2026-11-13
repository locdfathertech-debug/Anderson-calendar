import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const gate = readFileSync(new URL("../src/ParentGate.jsx", import.meta.url), "utf8");

test("cross-device calendar uses Supabase session and identity-scoped profile", () => {
  assert.match(app, /supabase\.auth\.getSession\(\)/);
  assert.match(app, /supabase\.auth\.onAuthStateChange\(/);
  assert.match(app, /\.eq\("id", user\.id\)/);
  assert.match(app, /\.eq\("family_id", p\.family_id\)/);
  assert.match(app, /supabase\.auth\.signInWithPassword\(/);
  assert.match(app, /supabase\.auth\.signOut\(/);
});
test("login works with password-manager autofill without bundling credentials", () => {
  assert.match(app, /autoComplete="username"/);
  assert.match(app, /"current-password"/);
  assert.match(app, /Each device signs in separately/);
  assert.doesNotMatch(app, /password\s*:\s*["'][^"']{6,}["']/i);
});
test("parent portal remains server-unlocked and no fixed four-digit PIN returns", () => {
  assert.match(app, /supabase\.rpc\(setup \? "set_parent_pin" : "unlock_parent_portal"/);
  assert.match(app, /clearParentGrant\(\)/);
  assert.match(gate, /\^\\d\{6,12\}\$/);
  assert.doesNotMatch(app + gate, /pin\s*===\s*["']\d{4}["']/i);
});
