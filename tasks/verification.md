# Verification and remaining integration work

- Production build passed.
- Domain tests: calendar year/leap boundaries, monthly budget expense/income separation and overspending, child vs parent chore transitions, ICS escaping/exclusive end dates, annual holidays.
- Browser: sample workspace rendered; added event and observed today's count increase; approved chore and observed payable balance increase from $2 to $7; budget totals rendered $1,800 planned / $146.28 spent / $1,653.72 remaining.
- Supabase: migrations applied to kwaqscxveniaostnmonu. All eight public tables have RLS. Transactional integration tests passed for child chore submission, no reward editing, finance privacy, cross-family isolation, role escalation rejection, and parent approval. All synthetic users and records rolled back; zero QA users remain.
- Security advisor: two intentional warnings remain for authenticated SECURITY DEFINER RPCs (set_family_role and submit_planner_chore). Both check caller identity/authorization, use fixed search paths, deny anon/PUBLIC execution, and are covered by authorization tests. Other membership helpers moved to private schema.
- Preview-only Vercel VITE_SUPABASE_URL and publishable key configured. Existing production environment untouched.
- No real family account exists yet in this Supabase project. Owner registers with [account email omitted]. Existing approved second parent email retained from the repository. Additional accounts must first be authorized in the parent portal.
- Google/Microsoft provider credentials and redirect allowlists require setup in Supabase; OAuth UI exists but no provider login was verified. Signup/email-confirmation delivery has not been exercised.
- Calendar export is supported. Provider calendar sync remains pending.
- PWA shell caching contains no family records. Offline edits and background synchronization are not implemented.
- Photo memories use user-supplied HTTPS URLs, not uploads. Wall mode is manually activated.
- Browser: light/dark modes and wall display verified. Fixed wall agenda to omit timed events that have already passed today.
- Publication blocker: automatic approval review rejected public GitHub upload because the payload contains family email addresses and explicit publishing authorization was absent. No remote branch, PR, or Vercel deployment was created. Existing main and production deployment are unchanged. Review approval is needed for the public source upload and preview deployment.


## Open registration verification

- Auth and Postgres logs confirmed the old invite-only trigger raised SQLSTATE 42501 while saving users.
- Applied open_registration migration at remote version 20261108005052. New users get an unattached member profile.
- Rollback-only tests passed for arbitrary signup, forged metadata isolation, unverified/anonymous denial, verified family creation, duplicate rejection, joining, invitation consumption, and cross-family isolation. Existing chore RLS regression suite passed.
- The connector cannot SET ROLE supabase_auth_admin, so direct Auth-role impersonation was unavailable. Trigger insertion was verified through auth.users using the available database role. Actual email invitation delivery and provider login were not executed.
- Provider authorize endpoints report Google, Apple, and Azure disabled. Provider credentials remain required.
- Database advisories report four intentionally exposed authenticated SECURITY DEFINER RPCs. Authorization checks and fixed search paths are covered by SQL review and the suites.
- One family per account and one pending family authorization per email. Joining uses the verified provider email, including Apple relay addresses.

## Dual-layer parent portal review — November 8, 2026

- 22 Node tests pass; production build passes. Token routing tests cover exact Supabase REST origin, preservation of request headers, no Auth/third-party token transmission, lock/expiry, and invalid receipts.
- Browser sample acceptance: default monthly read-only calendar, first PIN setup, Dashboard/Family navigation, add child with optional HTTPS avatar URL, Lock & Exit, and wrong-PIN rejection. Sample profile additions are browser-only and no real family was modified by browser tests.
- Parent form keeps the reference black/red/yellow/white/green palette and existing calendar, Dinner, Chores, Bounty Board, Vacations and video capabilities. Photos fall back to initials on invalid or failed image loads.
- CORS preflight to the linked Supabase REST endpoint permits x-parent-unlock with apikey/authorization.
- Review deployment 15f4504 is READY. Browser inspection of that protected preview requires Vercel access. Auto-review rejected the authenticated-fetch tool because it creates a temporary share link; protection settings were not changed. Local UI was reviewed instead.
- Database acceptance: rollback-only Parent PIN suite, existing child chore/privacy suite, and meal/video suite all PASS. First run caught a PL/pgSQL counter qualification error; renamed the variable and reran successfully. Migration 20261108154017_parent_portal_session_grants applied. No disposable fixtures remain. Production release verification follows below.
- Physical Tab S7 app pinning, unpin credential check, fullscreen/wake lock, and external video provider playback remain device acceptance tasks. No physical tablet configuration is claimed.

Production: PR #7 merged as b28b4e30fcebc93532eeaa8987b88871505f9fa7. Vercel production dpl_4gbpbSXVAy6E8vYk8RP26bLt4PBp READY, custom-domain aliases assigned without error; public /demo monthly calendar and Parent PIN gate observed. Post-migration rollback suite also PASS. Security advisors retain four intentional public definer RPC warnings and disabled leaked-password-protection warning; new private deny-all tables produce three informational no-policy notices by design (no client table grants). Browser screenshot docs/parent-portal-review.jpg shows public sample gate, not authenticated account setup.

## Weekly timeline verification

27 unit tests and production build pass. New tests cover local DST, leap/year boundaries, exact date filtering, minute positioning, overlap lanes, all-day/malformed times and early/late events. Short events keep their real time labels while minimum 48px visual targets receive non-overlapping lanes. Browser sample flow verified weekly navigation/toggle, month-date→week preservation, family filter, event video action and retained Parent PIN screen. Both sidebars remain in place. Supabase schema, grant helpers and permissions are unchanged. Physical tablet and authenticated real-data acceptance remain pending.

Weekly production release: commit 16b5228773bcf2ac26f2ddec3b53833d5e041db9 on main; Vercel production dpl_5DDuLgBy8X1ndXaDKTqFLRNc6im7 READY with custom domain aliases. Public /demo browser confirmed seven-day hourly timeline, Week/Month controls, member colors, all-day holiday, and both sidebars. Screenshot docs/weekly-timeline-review.jpg contains sample data only.

## Kiosk activation

27 existing tests and production build pass. Browser sample tested Start from parent toolbar, immediate lock, wrong-PIN denial, Stop after unlock, preference reload, no idle screensaver while active, PIN setup prerequisite, and Samsung instructions. Cloud browser denied Fullscreen API; fallback displayed and no fullscreen success claimed. Native app pinning and fullscreen/wake lock need testing on the actual Tab S7. Installed kiosk manifest prefers fullscreen (standard standalone fallback). No Auth/RLS/schema changes; server elevation remains enforced.

Production kiosk activation: main 3002ee8c4ab54be1e006360bf0060822cd94b913, Vercel production dpl_9hUgxhbTy7SjSxqW4mp6icWsA2pD READY. Public sample first PIN setup and parent Start returned to active read-only calendar with manual clock/fullscreen-exit/sign-out absent. Screenshot docs/kiosk-activation-review.jpg. Physical Samsung app pinning remains manual acceptance. Account email detail was removed from these notes before publication after automatic review rejection.

## Full family profile choices

31 tests/build pass. Palette tests cover 24 presets, custom #RRGGBB normalization/preservation, invalid values, stable defaults and readable new/custom ink contrast. Browser sample confirms 35 relationship options, custom Godchild persistence, custom #165dbe save/reopen, invalid hex rejection, and matching kiosk tile/timed event CSS; Month view retains the selected color. Relationship labels are display-only. No database or account permission changes.

Public production sample verified expanded family/type and color fields after release 1482f09659e57b0e8dd9d39b611c1e782e234482 (Vercel READY). Screenshot docs/family-profile-options-review.jpg. Regression covers default assignments avoiding custom colors matching both legacy light and kiosk palettes.

## Family photo uploads

35 tests/build pass. Native picker supports PNG/JPEG/WebP up to5MB, resizes to384px JPEG with200KB cap, clears input for reselection, handles decoding failure, and cancels stale async updates on unmount. Browser sample verifies file selection, compressed preview, save/reopen, corrupt image error/recovery, repeated same file selection, HTTPS alternative and the family profile tile. Thumbnails save using existing family-scoped member records; no public bucket or permissions/schema changes. Screenshots docs/profile-photo-upload-form-review.jpg and docs/profile-photo-upload-review.jpg use a generated nonpersonal test avatar.

Read-only policy inspection confirms family-member shared reads and private.can_manage_family write protection remain unchanged. tests/profile-photo-rls.sql is prepared but NOT confirmed run: Supabase returned expired confirmation/INVALID_ARGUMENT, with no SQL result. No authenticated live photo DB write is claimed; existing save path/RLS are reused. Native cancellation guard reviewed; unsaved Remove then Cancel restores saved thumbnail.

## Direct family tile controls

36 tests/build pass. Exact selected preset/custom colors render inline instead of legacy tint CSS; helper test covers24 presets/custom values. Browser sample verifies Violet and custom#165dbe saves, Navy light/dark consistency, native in-tile upload with384px avatar, navigation away/back persistence and hidden controls after lock. Detailed profile editor remains available. Existing family/PIN authorization unchanged; no new DB write acceptance is claimed. Screenshots docs/direct-family-tiles-review.jpg and docs/direct-family-tiles-dark-review.jpg contain generated sample photo only.

## Calendar reference additions

39 tests/build pass. New year helper tests cover12months/leapdays, full cross-year date keys and valid event counts without mutation. Browser sample verifies kiosk/parent Year views, year arrow and correct month selection, cross-year query results/emptyquery feedback, PIN-protected quickadd with selecteddate, sampleeventsave, wrongPIN denial and canceledintentclearing. Screenshot docs/year-calendar-review.jpg. Existing family tile source and storage/data permissions unchanged. No live authenticated real-data save or physicaltablet validation is claimed. No claim is made that the pasted legacy drag/drop or chore generator sample exists unchanged in this different codebase; existing uploader/chore/bounty flows are retained.
