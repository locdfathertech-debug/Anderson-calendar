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
- [x] Publish tested changes to main/Vercel as requested, then verify deployment.

Spec: PIN is chosen by a parent (6–12 digits), never 1234. Display profile labels cannot grant real account permissions. Admin API writes require an expiring server grant and an unpredictable in-memory token, not client state. The normal planner remains the unlocked parent workspace. Existing video/meal/calendar and child-owned chore workflow remain. Avatar URL support matches the supplied form; no public child-photo bucket.

Review: 22 Node tests and production build passed. Rollback-only Parent PIN/RLS, existing chore/privacy, and meal/video suites passed. Direct locked CRUD, header/session/family replay, role RPC, throttling, rotation, expiry and revoked-session checks passed. Migration 20261108154017 applied to linked Supabase. Browser sample first setup, family add/photo URL, lock, wrong PIN and theme verified. Hardware steps remain physical-device acceptance; no real account PIN was set by the agent.

Release: PR #7 merged as b28b4e30fcebc93532eeaa8987b88871505f9fa7. Vercel production dpl_4gbpbSXVAy6E8vYk8RP26bLt4PBp is READY and aliases www.anderfamcalendar.app. Public /demo browser displayed the monthly kiosk and new Parent PIN gate. Live authenticated account/PIN setup remains for the parent; no real credential was created during testing.

## Weekly kiosk timeline
- [x] Add Week/Month pill toggle, default Week, preserving both sidebars and current palette.
- [x] Anchor Sunday–Saturday navigation to local calendar dates; keep selected date when switching views.
- [x] Position timed events by minute, handle overlapping blocks and all-day events, include early/late plans.
- [x] Verify date boundaries, member filters, event details/video, PIN gate preservation, layout and build.
- [x] Publish selected changes to GitHub/main and verify Vercel production.

Spec: use existing family-scoped planner records and protected Parent Portal. Timeline has a time gutter and seven day columns, scrollable hours (07:00–20:00 by default), member-colored event blocks, and all-day row. Missing event durations default to one hour; explicit valid end_time is supported. All dates match YYYY-MM-DD directly to avoid UTC date shifts. Preserve Dinner, chores, bounty board, vacations, idle clock, videos, and read-only behavior.

Weekly review: 27 Node tests and Vite production build pass. Browser verified default Week, 07:30 minute placement, Today/next-week, Month toggle, Nov26→Nov22–28 week preservation, Mia-only filter, all-day holiday, event video action, and Parent PIN gate. Current black/red/yellow/white/green theme and both sidebars retained. Pure display change; no database migration or Auth/RLS changes. Physical Tab S7 acceptance and authenticated live-data acceptance remain outside desktop/sample verification.

Weekly release: main commit 16b5228773bcf2ac26f2ddec3b53833d5e041db9; Vercel production dpl_5DDuLgBy8X1ndXaDKTqFLRNc6im7 READY, www.anderfamcalendar.app alias assigned. Public /demo browser confirmed Week default, colored timeline events and unchanged sidebars. Screenshot docs/weekly-timeline-review.jpg.

## More family tile colors
- [x] Add six distinct colors while preserving saved assignments and current layout.
- [x] Match new colors across profile choices, tiles, filters and calendar events.
- [x] Verify palette assignment, build, browser appearance and publish to GitHub/Vercel.

Family color review: added Turquoise, Sky blue, Violet, Rose, Lime and Coral (12 total choices). 27 existing tests and production build pass. Direct assertions confirm 12 distinct automatic assignments and all six new kiosk colors match the shared palette. Browser sample changed Mia to Violet through the parent form and verified matching tile/event CSS and visible violet events. Real family assignments were not changed.

Family colors released: 2945d475830ad213256136c040c67d1a1a7a6722 on main; Vercel production dpl_9ekD6Eqs1XckymBc1NwzGx5zRa5t READY with www.anderfamcalendar.app alias.

## Activate calendar kiosk mode
- [x] Add persistent Start Kiosk Mode control in calendar and parent workspace; immediately clear parent elevation.
- [x] Keep live calendar visible without idle screensaver; request fullscreen and retain wake-lock recovery.
- [x] Restrict stop/sign-out controls to unlocked Parent Portal; report fullscreen/device-lock limits honestly.
- [x] Add on-screen Samsung app-pinning instructions; verify activation, reload, PIN gate and stop flow.
- [x] Run existing tests/build and publish selected changes to GitHub/Vercel.

Spec: kiosk preference is a local display setting, never an authorization grant. Admin writes remain protected by existing server PIN grants. Kiosk activation locks parent workspace before asynchronous work; fullscreen is requested only from a user gesture, with actionable fallback. Browser cannot lock Android Home/Recents; Samsung credential-protected app pinning or managed-device kiosk is required for hardware lockdown. No fake OS-lock status.

Kiosk activation review: 27 tests/build pass. Browser sample verified activation from unlocked parent toolbar immediately returns to the locked calendar, Stop is parent-only, wrong PIN rejection, hidden sign-out/manual clock/fullscreen-exit controls, persisted mode after reload, live calendar beyond idle timeout, setup guide, and fullscreen unsupported fallback. First activation requires configured Parent PIN. Preferences do not grant roles or edit access. Physical Samsung pinning, installed fullscreen and hardware wake lock remain device acceptance checks, not claimed remotely configured.

Kiosk activation released: main 3002ee8c4ab54be1e006360bf0060822cd94b913; Vercel production dpl_9hUgxhbTy7SjSxqW4mp6icWsA2pD READY. Public /demo verified setup-first→parent Start→active calendar. Fullscreen unsupported fallback observed. Review notes were sanitized to remove account email details after automatic publication review blocked those details. No physical tablet lock is claimed.

## Audit supplied upload hardening patch
- [x] Compare requested handlers against published main and current avatar controls.
- [x] Harden missing/invalid profile color at save while retaining selected or existing supported colors.
- [x] Verify tests/build and publish the applicable fix.

Finding: published main has HTTPS avatar URLs, no file picker/dropzone, handleFileUpload, avatars bucket integration, or CalendarApp.jsx. Native cancellation/reselection handlers cannot be patched in code that is absent. New profiles already choose an unused palette color; randomizing every save would overwrite explicit colors and may create collisions. Preserve chosen colors and assign an unused fallback only when the saved value is missing/invalid. Do not introduce unscoped public child-photo uploads from the supplied snippet.

Upload audit review: no uploader/dropzone in published main; no cancellation/reselection/upload changes claimed. Fixed supported-color validation and save fallback. 28 tests/build pass, including missing/invalid/prototype-name color values. Browser sample verified clearing Mia’s color preserves White, and a new profile with blank color saves Deep red (unused); photo URL and color controls remain present. Real family records and Supabase schema/storage are unchanged.

Applicable hardening released: 89fe936489d04ffc57dc3ec8819c4e737bb64c82 on main. Vercel production dpl_73nRnQLDQgZpUbt1aX5CNfUSZggt READY. Upload-specific findings remain not applicable to the published URL-only avatar form; an uploader source/branch is needed to patch those handlers.

## All theme colors and family member types
- [x] Offer 24 named presets plus any custom hex color; retain saved colors and readable text.
- [x] Expand family profile types and allow custom relationship labels without changing login roles.
- [x] Verify profile saves, custom tile/event colors, tests/build, then publish to GitHub/Vercel.

Spec: preserve existing named assignments, palette layout and kiosk protection. Custom #RRGGBB colors work across family tiles, avatars, filters and both calendar views. Relationship labels cover immediate, extended, blended and caregiving households; custom labels remain display-only. No permissions, schema or storage changes.

Family controls review: 31 tests and production build pass. Browser sample saved/restored Godchild and custom #165dbe, blocked invalid hex via form validation, and showed matching custom tile/event styles plus the relationship label in the kiosk. 24 presets plus native color picker/hex input; 35 named household/family types plus custom relationships. Existing assignments and private Auth/Parent PIN permissions retained. No real family records were changed during sample QA.

Family choices released: main 1482f09659e57b0e8dd9d39b611c1e782e234482; production dpl_EmEZqU2URLqph71H7mWKbYX224LB READY. Public sample profile form verified all controls. Followup prevents automatic defaults duplicating custom colors matching legacy kiosk colors. All 31 tests/build pass.
