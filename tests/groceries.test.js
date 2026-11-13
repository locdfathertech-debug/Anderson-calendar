import test from "node:test";
import assert from "node:assert/strict";
import {groceryItem,requestedGroceryItem,mealShoppingItems} from "../src/lib/groceryItems.js";
test("grocery items are bounded, trimmed and collapsed",()=>{
  assert.equal(groceryItem("  whole   milk  "),"whole milk");
  assert.equal(groceryItem("x".repeat(500)).length,120);
  assert.equal(groceryItem("   "),"");
});

test("AI grocery commands request confirmation without writing",()=>{
  assert.equal(requestedGroceryItem("@AI add milk to the grocery list"),"milk");
  assert.equal(requestedGroceryItem("@AI groceries: eggs"),"eggs");
  assert.equal(requestedGroceryItem("@AI add milk to groceries"),"milk");
  assert.equal(requestedGroceryItem("add milk to the grocery list"),null);
  assert.equal(requestedGroceryItem("@AI add <script> to groceries list"),null);
});

test("dinner shopping ingredient list is bounded and de-duplicated",()=>{
  assert.deepEqual(mealShoppingItems("milk, eggs, milk; rice"),["milk","eggs","rice"]);
  assert.deepEqual(mealShoppingItems(""),[]);
  assert.equal(mealShoppingItems(Array(60).fill("item").map((x,i)=>x+i).join(",")).length,30);
});
