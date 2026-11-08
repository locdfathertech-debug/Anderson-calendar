# Anderson Family Hub workflow audit

Scope: draft PR #2 at `ec9efdc`, base `a63b9d6`, its Vercel preview, and Supabase project `kwaqscxveniaostnmonu`. Audit only. Findings are prioritized for a follow-up change.

- [x] Compare published PR files with the local files and the base branch.
- [x] Check tests, build, GitHub checks, Vercel status, and Supabase evidence.
- [x] Review all 15 checklist items with focused code and verification subagents.
- [x] Document findings, limits, and release blockers below.

## Review

**Release decision:** Keep PR #2 in draft. The build is ready for preview review. Production readiness is blocked by data continuity, migration history, functional defects, and missing authenticated acceptance evidence.

| Priority | Finding | Evidence and next check |
| --- | --- | --- |
| P1 | Legacy records would disappear from the new UI. | Main reads events, chores, vacations, and grades from separate tables. The PR reads `planner_records` and provides no migration or compatibility read. Linked Supabase currently has zero legacy rows, planner rows, and profiles, so no data loss was observed. Prove continuity with representative legacy fixtures before release. |
| P1 | Supabase migration history differs from Git. | The remote versions are `20261104020314`, `20261104020326`, and `20261104020621`. Git uses `20261104000100`, `20261104014010`, and `20261104020519` for the corresponding migration names. Compare applied SQL and reconcile history before a CLI push. |
| P1 | Authenticated preview acceptance is unproven. | The ready Vercel build and earlier sample browser flows do not prove login, writes, reload persistence, or account isolation in the preview. No real profile exists in the linked project. |
| P2 | Timed ICS exports become all-day events. | `src/lib/planner.js:56` emits date-only DTSTART and puts the time in DESCRIPTION. A 07:30 event reproduced as all-day. |
| P2 | Uncategorized expenses understate spending. | `src/lib/planner.js:17` aggregates only expenses that match existing budget categories. A $35 uncategorized expense against a $100 plan reproduced $0 spent and $100 remaining. |
| P2 | Child assignment and account offboarding are incomplete. | A child name alone does not enable chore submission. The form accepts a raw UUID, and regular admins have no account lookup. Removing registration authorization does not revoke an existing family profile. |
| P2 | CI and release notes are incomplete. | GitHub reports Vercel success and its preview comment check, with no GitHub Actions workflows or runs. `tasks/verification.md` still describes an earlier publication block that was resolved. |

All published PR source blobs matched local file hashes. Five logic tests, the Vite build, and the whitespace check passed. Vercel reported READY for the exact PR commit. Supabase lists all three migrations by name. Its two security advisory warnings concern the authenticated `set_family_role` and `submit_planner_chore` RPCs. The repo includes role and tenant guard tests and a prior rollback-only run is documented. This audit used read-only database queries and did not rerun the transactional suite. No payment notification dispatch was found in the audited app and manual payment recording remains.

### Checklist

| Area | Item | Result | Evidence |
| --- | --- | --- | --- |
| Workflow | Plan Node Default | Partial | Prior plan includes scope and validation. The audit wrote a checklist up front and used it for verification. Formal Plan mode was unavailable in this session and prior replanning after blockers is not consistently documented. |
| Workflow | Subagent Strategy | Pass for this audit | Code and verification were delegated to separate agents with narrow read-only scopes. Prior execution cannot be verified from repo files alone. |
| Workflow | Self-Improvement Loop | Gap | No `tasks/lessons.md` exists, including after earlier scope corrections. No evidence of startup lesson review or repeated measurement. |
| Workflow | Verification Before Done | Partial | Exact source comparison, tests, build, and Vercel status passed. Staff-level review surfaced release blockers. Authenticated preview acceptance and independent CI remain missing. |
| Workflow | Demand Elegance | Partial | Domain helpers and scoped RPCs show useful separation. The main planner is roughly 1,489 lines and combines many feature areas. Prefer splitting where ownership or tests justify it. |
| Workflow | Autonomous Bug Fixing | Partial | Prior notes document a wall agenda fix and previous browser evidence. This audit reproduced two uncovered logic defects and traced their causes. No failing CI run was available to diagnose. |
| Task management | Plan First | Pass for this audit | This checklist was written before substantive verification. Earlier work used `tasks/plan.md` without checkboxes. |
| Task management | Verify Plan | Partial | Audit scope was shared before substantive work. No implementation was in scope, and no prior implementation checkpoint is documented in repo files. |
| Task management | Track Progress | Partial | Audit checklist was completed and an interim finding was shared. Earlier plan lacks item-by-item progress. |
| Task management | Explain Changes | Partial | Audit commentary and prior verification notes explain major steps. Some release notes are stale. |
| Task management | Document Results | Pass for this audit | This review records evidence, decisions, and open defects. |
| Task management | Capture Lessons | Gap | Earlier corrections were not captured in `tasks/lessons.md`. |
| Core | Simplicity First | Partial | Manual payment tracking and shared helpers are straightforward. The consolidated planner has broader responsibilities than its current test coverage supports. |
| Core | No Laziness | Partial | Root causes were identified for legacy continuity, export, and budget totals. Release verification still needs authenticated evidence and regression coverage. |
| Core | Minimal Impact | Partial | Changes are isolated to a draft PR and preview. The feature changes the primary record store and introduces regression risk for existing data. |

Follow-up order: reconcile migration history and preserve legacy records, fix timed export and spending totals with regression checks, add independent CI, then verify authenticated parent and child workflows against the new preview before promotion.

## Google and Apple sign-in

- [x] Review the existing login, provider documentation, and family access rules.
- [x] Add Apple alongside Google and Microsoft, with provider error handling.
- [x] Run the tests and build, then update draft PR #2.
- [x] Verify provider readiness and document any external setup.

Review: five tests and the Vite build passed. Draft PR #2 includes commit `21295c7`. Supabase rejected unauthenticated authorize requests for both providers because they are disabled. Enable them using provider credentials, allow the preview URL, then verify an authorized family account can complete each sign-in.

## Galaxy Tab S7 calendar kiosk

- [x] Review the existing wall display, authentication, and Samsung pinning options.
- [x] Add a signed-in weekly calendar view with refresh, fullscreen, and screen wake lock.
- [x] Verify the build and publish the review branch preview.

Review: the browser displayed the sample week and handled unsupported fullscreen and wake lock. The build and five existing tests passed. Signed-in sync, fullscreen, wake lock, and Samsung app pinning need acceptance on the tablet. The live route is /kiosk and the sample route is /demo/kiosk.

## Open registration and family onboarding

- [x] Diagnose the Auth invite failure in server logs and inspect existing schema.
- [x] Replace rejecting signup trigger with a personal profile.
- [x] Add verified-user create-family and accept-authorization RPCs with tenant isolation.
- [x] Add onboarding UI and remove invite-only signup wording.
- [x] Run rollback-only signup, role, family isolation, and legacy authorization tests.
- [ ] Apply the migration, publish draft PR changes, and verify Vercel.

## Signed-in branding and child calendar tabs

- [x] Apply sign-in black/teal/orange branding to signed-in controls, sidebar and dashboard surfaces.
- [x] Assign member colors and show colored calendar filters and matching event accents.
- [x] Verify existing colors, new member assignment, build, and browser appearance.

Review: eight tests and the production build passed. Browser verified the branded dark calendar, matching member/event accents, Mia-only filter, and light mode. Existing custom member role labels remain editable. No database migration is required; colors use existing member records.

Published review: PR #6, commit 04fd48093364e96fd014a1db83cc645c57f14027. Vercel preview deployment dpl_Fbh8ocy4DZPMAnbVMqxPjNWzxUcL.

## Deeper signed-in blacks and brighter branding
- [x] Refine dark surfaces, bright teal detail, and vivid orange actions.
- [x] Verify calendar readability and preserve light mode/member colors.
- [x] Build and update the existing review preview.

Review: production build passed; browser verified overview and calendar in the deep-black theme with bright brand detail. Dark-only rules preserve light mode and member identity colors.

## Reference palette only
- [x] Match black/charcoal surfaces and red/yellow/white/green accents from supplied image.
- [x] Preserve component structure, layout dimensions, content and interactions.
- [x] Verify unchanged geometry, calendar readability, build, and publish review preview.

Review: production build passed. Browser comparisons confirmed unchanged dashboard and calendar bounding boxes. Verified member filtering. Independent review caught and resolved a notice border regression, selected-state selector, and small-text contrast on red. CSS-only publication; no components, records, content, or section order changed.

## Glossy black background
- [x] Apply subtle reflected-light gradients over black, preserving colors and layout.
- [x] Verify appearance and build; update review preview.

Review: glossy reflected-light background verified in browser; production build passed. CSS paint-only changes preserve layout and reference accent colors.

## Tab S7 master blueprint integration
- [x] Adapt to existing tenant-scoped planner_records; preserve parent Auth/RLS and glossy reference palette.
- [x] Add scoped 20/60/20 monthly kiosk, real dates, member filters/status, chores, bounties, vacations, alerts.
- [x] Add 15s idle clock with live tick/up-next, accessible wake, 48px controls, scoped scroll handling.
- [x] Add family-filtered Realtime refresh plus polling and offline/error states; verify database publication safely.
- [x] Verify date helpers, build, browser kiosk/idle/navigation, and review branch deployment.

Acceptance: main workspace structure is retained; /kiosk shows real data, /demo/kiosk uses sample data. No hardcoded PIN or new unscoped tables. Tablet fullscreen and device pinning remain device acceptance checks.

Review: implementation and review-preview preparation complete. 13 tests/build and rollback RLS suite pass. Browser verified sample layout/navigation/filter/details/idle-wake and 48px controls. Realtime publication enabled with RLS intact. See docs/TABLET_KIOSK.md for authenticated, offline and physical tablet acceptance gaps; these are not claimed complete.

Published draft PR #7 with commit 22475a02b1e645f77d17f8667b09dae7534ba415. Website remains on a review branch; Supabase publication migration is applied.

## Kiosk video recipes and calendar layers
- [x] Add pinned ReactPlayer compatible with the current React version.
- [x] Add optional recipe/event video URLs and Work/Daycare/Activity categories to parent forms; preserve tenant/RLS model.
- [x] Add bounded floating player with touch/keyboard positioning and close controls; suppress idle clock while open.
- [x] Add Dinner below chores and category/video indicators with accessible event-detail playback.
- [x] Verify URL validation, date filtering, build, browser playback/drag/close/idle behavior, and publish review branch.

Acceptance: no duplicate meals/events tables, no PIN bypass, no removed panels. Kiosk fetches existing meal records. External provider or autoplay restrictions must be visible; native MP4 should have deterministic local browser QA.

Review: 19 unit tests, clean dependency install, production build, and rollback-only meal/video RLS tests passed. Browser verified recipe/event native playback, drag bounds, keyboard/reset, 48px controls, idle suppression/resume, parent URL validation and error/retry recovery. External provider playback and physical tablet acceptance remain open. Existing Speed Insights dependency was preserved after comparing with the remote branch.

Pushed video update 86a504f8b7075890f125a266c94dcf552c3c4c73 to draft PR #7. No production website release and no video schema migration.

## Dual-layer kiosk and family management
- [x] Design server-enforced PIN grants bound to authenticated sessions, with private hashes and throttling.
- [x] Make signed-in main screen read-only kiosk; require PIN to enter parent workspace; lock clears grants/tokens.
- [x] Add parent Dashboard/Family/Chores navigation and child/parent display profiles with photo URLs/colors.
- [x] Verify PIN/API bypass denial, account/family isolation, grant expiry, photo fallback, browser flows and build.
- [x] Document verified Samsung app-pinning paths and physical-device acceptance.
- [ ] Publish tested changes to main/Vercel as requested, then verify deployment.

Spec: PIN is chosen by a parent (6–12 digits), never 1234. Display profile labels cannot grant real account permissions. Admin API writes require an expiring server grant and an unpredictable in-memory token, not client state. The normal planner remains the unlocked parent workspace. Existing video/meal/calendar and child-owned chore workflow remain. Avatar URL support matches the supplied form; no public child-photo bucket.

Review: 22 Node tests and production build passed. Rollback-only Parent PIN/RLS, existing chore/privacy, and meal/video suites passed. Direct locked CRUD, header/session/family replay, role RPC, throttling, rotation, expiry and revoked-session checks passed. Migration 20261108154017 applied to linked Supabase. Browser sample first setup, family add/photo URL, lock, wrong PIN and theme verified. Hardware steps remain physical-device acceptance; no real account PIN was set by the agent.
