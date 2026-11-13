import test from "node:test";
import assert from "node:assert/strict";
import { canSendFamilyChat } from "../src/lib/chatReadiness.js";

test("production chat fails closed when private database/RLS not active",()=>{
  assert.equal(canSendFamilyChat({demo:false,available:false,draft:"hello"}),false);
  assert.equal(canSendFamilyChat({demo:false,available:true,draft:"hello"}),true);
  assert.equal(canSendFamilyChat({demo:false,available:true,busy:true,draft:"hello"}),false);
  assert.equal(canSendFamilyChat({demo:false,available:true,draft:"   "}),false);
});
test("demo-only messages remain available without database",()=>{
  assert.equal(canSendFamilyChat({demo:true,available:false,draft:"hello"}),true);
});
