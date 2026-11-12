# Anderson Family Calendar — release-readiness audit (2026-11-12)

Scope: inspect deployed main, open PRs #10/#11/#12 if accessible, Supabase project `kwaqscxveniaostnmonu`, and Vercel project `vite-anderson-calendar`. Audit/document only; no production deploy, schema writes, PR merges, or real user-data modifications.

## Plan / verification gates
- [ ] Confirm exact GitHub main/PR SHAs, Vercel deployment SHA and configured Supabase project.
- [ ] Inspect existing automated unit/integration tests; execute test runner and build if source/dependencies are accessible; distinguish remote build pass from test pass.
- [ ] Check Vercel build events, deployment readiness, recent runtime errors and HTTP access to pages.
- [ ] Check Supabase RLS, grants, auth/RPC security, storage, migrations, and security/performance advisors using read-only calls.
- [ ] Review critical user journeys: email/OAuth login, onboarding, Parent PIN, child access, CRUD, chores, photos, week/month/year, kiosk/screensaver, installability.
- [ ] Review security and accessibility/performance/reliability risks; compare changes in open PRs with main.
- [ ] Record evidence, blockers, follow-up regressions and lessons; leave unverified checks marked pending.

## Review
Pending evidence. No release approval until authenticated multi-user tests and security issues are resolved.
