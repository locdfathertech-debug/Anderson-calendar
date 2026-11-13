import test from "node:test";
import assert from "node:assert/strict";
import { accountAccessLabel, accountAccessTone } from "../src/lib/accountAccess.js";

test("only server profile role values produce access badges", () => {
  assert.equal(accountAccessLabel("member"), "Child / Member · View only");
  assert.equal(accountAccessLabel("admin", false), "Parent · Locked");
  assert.equal(accountAccessLabel("admin", true), "Parent · Unlocked");
  assert.equal(accountAccessLabel("super_admin", true), "Family owner · Unlocked");
  assert.equal(accountAccessLabel("Parent"), "Access not verified");
  assert.equal(accountAccessLabel("full_access"), "Access not verified");
  assert.equal(accountAccessLabel(undefined), "Access not verified");
});
test("unverified account access cannot be styled as unlocked", () => {
  assert.equal(accountAccessTone("member", true), "locked");
  assert.equal(accountAccessTone("full_access", true), "unverified");
  assert.equal(accountAccessTone("admin", true), "unlocked");
});
