/** Pure bounded grocery text and confirmation parser. No database effects. */
export function groceryItem(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0,120);
}
export function requestedGroceryItem(message) {
  const text = String(message || "");
  if (!/(?:^|\s)@ai\b/i.test(text)) return null;
  const match = text.match(/\badd\s+(.+?)\s+to\s+(?:the\s+)?(?:grocery|groceries|shopping)(?:\s+list)?\b/i) ||
    text.match(/\b(?:groceries|grocery list)\s*:\s*(.+)$/i);
  if (!match) return null;
  const item = groceryItem(match[1]);
  return item && !/[<>\r\n]/.test(item) ? item : null;
}

export function mealShoppingItems(value) {
  return [...new Set(String(value||"").split(/[,\n;]/).map(groceryItem).filter(Boolean))].slice(0,30);
}
