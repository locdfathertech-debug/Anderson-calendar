import test from "node:test";
import assert from "node:assert/strict";
import {groceryItem,requestedGroceryItem} from "../src/lib/groceryItems.js";
test("grocery items are bounded, trimmed and collapsed",()=>{
  assert.equal(groceryItem("  whole   milk  "),"whole milk");
  assert.equal(groceryItem("x".repeat(500)).length,120);
  assert.equal(groceryItem("   "),"");
});

test("AI grocery commands request confirmation without writing",()=>{
  assert.equal(requestedGroceryItem("@AI add milk to the grocery list"),"milk");
  assert.equal(requestedGroceryItem("@AI groceries: eggs"),"eggs");
  assert.equal(requestedGroceryItem("add milk to the grocery list"),null);
  assert.equal(requestedGroceryItem("@AI add <script> to groceries list"),null);
});
