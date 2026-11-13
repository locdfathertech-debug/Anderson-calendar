import test from "node:test";
import assert from "node:assert/strict";
import {groceryItem} from "../src/lib/useFamilyGroceries.js";
test("grocery items are bounded, trimmed and collapsed",()=>{
  assert.equal(groceryItem("  whole   milk  "),"whole milk");
  assert.equal(groceryItem("x".repeat(500)).length,120);
  assert.equal(groceryItem("   "),"");
});
