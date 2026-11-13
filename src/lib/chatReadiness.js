/** Messaging is unavailable until the tenant-scoped table and RLS work. */
export function canSendFamilyChat({demo=false, available=false, busy=false, draft=""}) {
  return !busy && (demo || available) && typeof draft === "string" && draft.trim().length > 0;
}
