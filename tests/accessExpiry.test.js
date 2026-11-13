import test from "node:test";
import assert from "node:assert/strict";
import { setParentGrant, getParentToken, clearParentGrant } from "../src/lib/parentAccess.js";

test("parent grant expires, cannot be reused, and clearing revokes its client state", () => {
  clearParentGrant();
  const token = "a".repeat(64);
  const expiresAt = new Date(Date.now()+30000).toISOString();
  setParentGrant({token,expires_at:expiresAt});
  assert.equal(getParentToken(), token);
  assert.equal(getParentToken(Date.now()+60000),null);
  assert.equal(getParentToken(),null);
  setParentGrant({token,expires_at:new Date(Date.now()+60000).toISOString()});
  clearParentGrant();
  assert.equal(getParentToken(),null);
});
test("invalid grants never elevate access", () => {
  clearParentGrant();
  assert.throws(() => setParentGrant({token:"1234",expires_at:new Date(Date.now()+60000).toISOString()}), /valid/);
  assert.equal(getParentToken(),null);
  assert.throws(() => setParentGrant({token:"b".repeat(64),expires_at:new Date(Date.now()-1000).toISOString()}),/valid/);
  assert.equal(getParentToken(),null);
});
