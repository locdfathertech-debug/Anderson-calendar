# Anderson Family Calendar release acceptance

No production approval is implied by a Vercel READY build, a merged pull request, or passing unit tests.

## 1. Security checks
- Confirm no hard-coded PINs or demo auth flows exist in the shipping app.
- Verify account badges come from authenticated `profiles.role`; view-only family tiles never grant privileges.
- Run `npm ci && npm test && npm run build && npm audit --audit-level=high`.
- Review any low-severity residual advisories separately. As of November 2026, `deepmerge@4.3.1` has an unpatched low advisory (GHSA-gcqx-w48m-w2h4) through `react-player`.

## 2. Two-household staging
Create/identify a **separate, disposable** Supabase staging project with the reviewed migrations and three accounts:
- Parent A: real auth role admin/super_admin, family A.
- Child A: real auth role member, same family A.
- Parent B: real auth role admin/super_admin, different family B.

Configure secrets in GitHub **staging Environment**, not as plaintext PR secrets:
`E2E_STAGING_SUPABASE_URL`, `E2E_STAGING_SUPABASE_KEY` (publishable/anon, never service-role),
`E2E_PARENT_A_EMAIL`, `E2E_PARENT_A_PASSWORD`, `E2E_CHILD_A_EMAIL`, `E2E_CHILD_A_PASSWORD`, `E2E_PARENT_B_EMAIL`, `E2E_PARENT_B_PASSWORD`.

Configure required environment reviewers and restrict staging environment deployments to trusted refs. **Only dispatch the authenticated staging acceptance workflow manually after reviewing the branch code.** Never auto-inject staging credentials into a pull request.

Required assertions: parent/child roles, A/B read isolation, locked role escalation rejected, cross-household role edit rejected, unauthorized child role escalation rejected, sign-out removes local session. Manual add-on: parent PIN unlock, grant expired/revoked on lock and fresh session, writes denied without an unexpired grant.

## 3. Private photo acceptance
Current production database has no `family-photos` bucket. The proposed SQL is at `supabase/sql/private_family_photos_review.sql`, **not applied**. Apply it to isolated staging only after migration state is healthy; verify:
- Bucket `public=false`, JPEG only, <=256 KiB.
- Authenticated child and parent B cannot upload to family A or sign family A downloads.
- Locked parent A cannot upload. Unlocked parent A can upload immutable family-A JPEG and create a 300-second signed read URL.
- No public URL, listing across families, UPDATE, DELETE or upsert. Handle test-object cleanup using trusted staging service tooling; never grant service-role to the browser or PR scripts.
- Verify Storage forwards the temporary `x-parent-unlock` request header to Postgres RLS; do not enable `VITE_PRIVATE_FAMILY_PHOTOS=true` until this is proven.
- Confirm old inline JPEG thumbnails still render, selection/replace/cancel works and family tile reload persists.
- Do not apply to production or convert legacy records until separate release approval.

## 4. Calendar device checks
Automated Chromium checks exercise /demo on 1440x900 desktop, 390x844 mobile, Tab S7 2560x1600 landscape and 1600x2560 portrait:
default Month, switch Year and back, screen-wide monthly overlay, 5/6-week grid, on-screen bounds, wake tap, JS errors. Screenshot artifacts generated in GitHub Actions.
For acceptance, additionally verify an **actual Galaxy Tab S7** in PWA fullscreen/kiosk mode: page load, dark mode, month rollover, idle after 60 seconds, touch wake, parent PIN lock, app pinning and Android Home/Recents restrictions. Browser viewport emulation is not a physical tablet acceptance test.

## 5. GitHub / Vercel release controls
Required before future merges:
1. Enable main branch protection/ruleset using GitHub **Settings → Rules → Rulesets** (admin privileges required). Block direct pushes, require reviewed PRs, and require passing `Anderson Family Calendar release audit / verify`, `Calendar browser viewport checks / browser-layout`, plus the manually approved `Authenticated staging acceptance / verify-staging-roles` on the exact reviewed head commit.
2. Disable auto-production promotion until checks/reviews are enforced. Check connected Vercel build/deployment settings; READY is not an acceptance stamp.
3. Require at least one reviewer other than the author and explicit release sign-off. Do not reuse an approval for new commits.
4. Confirm deployment SHA matches the exact accepted commit and run a post-release smoke test.

## Status (2026-11-12)
- PR #14 was merged/deployed before acceptance; security audit still requires authenticated staging.
- PR #15 introduces automated browser test evidence and a safer manually dispatched secret-bearing workflow.
- No Storage migration, real cross-family test with disposable accounts, or physical tablet QA has been completed.
- Repository integration cannot read/change branch protection (GitHub returned HTTP 403). Configure the rules in GitHub with admin access.
