# Verification and remaining integration work

- Production build passed.
- Domain tests: calendar year/leap boundaries, monthly budget expense/income separation and overspending, child vs parent chore transitions, ICS escaping/exclusive end dates, annual holidays.
- Browser: sample workspace rendered; added event and observed today's count increase; approved chore and observed payable balance increase from $2 to $7; budget totals rendered $1,800 planned / $146.28 spent / $1,653.72 remaining.
- Supabase: migrations applied to kwaqscxveniaostnmonu. All eight public tables have RLS. Transactional integration tests passed for child chore submission, no reward editing, finance privacy, cross-family isolation, role escalation rejection, and parent approval. All synthetic users and records rolled back; zero QA users remain.
- Security advisor: two intentional warnings remain for authenticated SECURITY DEFINER RPCs (set_family_role and submit_planner_chore). Both check caller identity/authorization, use fixed search paths, deny anon/PUBLIC execution, and are covered by authorization tests. Other membership helpers moved to private schema.
- Preview-only Vercel VITE_SUPABASE_URL and publishable key configured. Existing production environment untouched.
- No real family account exists yet in this Supabase project. Owner registers with locdfathertech@gmail.com. Existing approved second parent email retained from the repository. Additional accounts must first be authorized in the parent portal.
- Google/Microsoft provider credentials and redirect allowlists require setup in Supabase; OAuth UI exists but no provider login was verified. Signup/email-confirmation delivery has not been exercised.
- Calendar export is supported. Provider calendar sync, bank sync, automatic payment notifications and transfers are not implemented.
- PWA shell caching contains no family records. Offline edits and background synchronization are not implemented.
- Photo memories use user-supplied HTTPS URLs, not uploads. Wall mode is manually activated.
- Browser: light/dark modes and wall display verified. Fixed wall agenda to omit timed events that have already passed today.
- Publication blocker: automatic approval review rejected public GitHub upload because the payload contains family email addresses and explicit publishing authorization was absent. No remote branch, PR, or Vercel deployment was created. Existing main and production deployment are unchanged. Review approval is needed for the public source upload and preview deployment.
