/**
 * Display only: role values must come from Supabase public.profiles RLS reads,
 * never planner/member tile labels or client-selected access_level values.
 * Authorization remains enforced by private.can_manage_family and related RPCs.
 */
export function accountAccessLabel(role, parentUnlocked = false) {
  if (role === "super_admin") return parentUnlocked ? "Family owner · Unlocked" : "Family owner · Locked";
  if (role === "admin") return parentUnlocked ? "Parent · Unlocked" : "Parent · Locked";
  if (role === "member") return "Child / Member · View only";
  return "Access not verified";
}
export function accountAccessTone(role, parentUnlocked = false) {
  if (!["super_admin", "admin", "member"].includes(role)) return "unverified";
  return role !== "member" && parentUnlocked ? "unlocked" : "locked";
}
