import { test } from "node:test";
import assert from "node:assert/strict";
import { familyChatSuggestion, cleanedChatMessage } from "../src/lib/familyChat.js";
test("AI only answers explicit @AI messages", () => {
  assert.equal(familyChatSuggestion("what is for dinner",[]),null);
  assert.match(familyChatSuggestion("@AI dinner?",[{kind:"meal",data:{title:"Dirty rice"}}]),/Dirty rice/);
});
test("AI cannot approve payouts, push alerts or write chores", () => {
  assert.match(familyChatSuggestion("@AI approve payout",[]),/Only a verified parent|cannot approve/i);
  assert.match(familyChatSuggestion("@AI @Mia",[],["Mia"]),/push\/device alerts are not enabled/i);
  assert.match(familyChatSuggestion("@AI new chore",[]),/parent/i);
});
test("message length is bounded",()=> {
  assert.equal(cleanedChatMessage("  hello  "), "hello");
  assert.equal(cleanedChatMessage("x".repeat(2200)).length,2000);
});
