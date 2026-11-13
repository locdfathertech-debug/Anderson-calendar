/**
 * Advisory-only command parser. It makes NO database writes, payment
 * approvals or device notification claims. Real LLM actions must be mediated
 * by a server with household authorization and explicit parent confirmation.
 */
export function familyChatSuggestion(message, records = [], familyLabels = []) {
  const input = String(message || "");
  if (!/(?:^|\s)@ai\b/i.test(input)) return null;
  const lower = input.toLowerCase();
  if (/dinner|meal|recipe|eat/.test(lower)) {
    const meals = records.filter(r => r.kind === "meal" && r.data?.title);
    const titles = [...new Set(meals.map(r => r.data.title))].slice(0, 3);
    return titles.length
      ? `For dinner, consider ${titles.join(", ")}. A parent can add or adjust the meal in the Parent Portal.`
      : "I don't see saved dinner ideas yet. Try tacos, pasta, or a family favorite. A parent can add a meal in the Parent Portal.";
  }
  if (/payout|points|reward|allowance|pay\b/.test(lower)) {
    const completed = records.filter(r => r.kind === "chore" && r.data?.status === "completed");
    return completed.length
      ? `There are ${completed.length} completed chores. Ask a parent to review rewards in the Parent Portal; I cannot approve or send payments.`
      : "No completed chores were found in the calendar view. Only a verified parent can approve rewards or payments.";
  }
  if (/chore|task|bounty/.test(lower)) {
    return "I can suggest a chore, but I won't create an assignment without a parent's approval. Use the Parent Portal to add it.";
  }
  const mentions = familyLabels.filter(name => name && new RegExp(`@${escapeRegExp(name)}(?=$|\\s|[.,!?])`, "i").test(input));
  if (mentions.length) return `I see ${mentions.slice(0, 3).map(name=>`@${name}`).join(", ")} in your message. It will appear in the family chat; push/device alerts are not enabled yet.`;
  return "I can suggest dinners and help review chore ideas. For calendar changes or payouts, a parent must approve them in the Parent Portal.";
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
export function cleanedChatMessage(value) { return String(value || "").trim().slice(0, 2000); }
