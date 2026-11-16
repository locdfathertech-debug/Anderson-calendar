# Recurring Chores and Family Routines — Release and Security Contract

## Implemented on review branch

- Parent-managed reusable templates with a Morning or Evening period, weekdays (Sunday=0 through Saturday=6), optional end date, assigned verified family account UUID, custom display name, proposed points and optional dollar reward.
- Seven-day preview, pause/resume. Children can see due templates. The kiosk shows whether a due item is only scheduled or has a generated chore.
- **Parent-controlled materialization** turns a due template into a normal `planner_records` chore with `status='open'`. The existing child `submit_planner_chore` RPC changes it to `submitted`; a parent reviews and approves it, then separately records payment. Neither a point amount nor an approved record sends money automatically.
- On the current branch, materialization requires a parent to click **Generate due chores**; background generation remains **OFF**. Do not advertise tasks as created automatically until the separate optional scheduler is activated and proven in staging.

## Database review and staging sequence

1. Read-only audit confirmed production `planner_records` has an exact `kind` CHECK and currently has no routine tables. Avoid attempting `kind='routine'` in that existing table.
2. In an **explicitly designated disposable staging** Supabase project with the correct baseline migrations, review/apply `supabase/sql/recurring_routines_review.sql`. It provisions:
   - `routine_templates`: tenant read RLS, parent-PIN-granted creation, verified member assignment, immutable configuration after creation; only `enabled` may change.
   - `routine_occurrences`: tenant read RLS, server-only insert, unique `(template_id,due_date)` and FK back to `planner_records`.
   - `materialize_family_routines(date)`: checks a real live auth session and an active parent grant, validates dates and assignee, serializes same-template/day concurrent requests, creates exactly one regular chore.
   - RLS-filtered INSERT/UPDATE Realtime subscription for templates, plus a 30-second polling fallback. No raw DELETE events are subscribed to.
3. Add disposable confirmed Parent A, Child A and Parent B identities with **different families**. Do not share live family data, PINs, auth tokens or `service_role` keys in source files.
4. In GitHub's protected `staging` environment, configure the existing `E2E_STAGING_SUPABASE_URL`, `E2E_STAGING_SUPABASE_KEY` (publishable or anon only), `E2E_STAGING_PROJECT_REF`, Parent A/B and Child A credentials, and **`E2E_PARENT_A_PIN`**. Require an environment reviewer and manually dispatch the staging acceptance workflow from a reviewed branch. Do not automatically supply secrets to PRs.
5. Run `tests/routine-staging-acceptance.mjs` and existing `tests/staging-acceptance.mjs`, then verify: child writes denied, cross-family reads/updates denied, invalid/locked PIN denied, parent template created, exactly one occurrence after two materialization calls, child submits assigned chore, parent approves without marking paid, grant is revoked after lock. Repeat with concurrent parent clients. Test account/session expiration and template pause/resume.
6. Verify shared tablet kiosk display, parent unlock and lock, mobile touch and family isolation on an actual Samsung Galaxy Tab S7. Automated viewport emulation is necessary but not physical acceptance.

## Optional unattended recurrence

A separate opt-in `supabase/sql/recurring_routines_cron_OPTIONAL_review.sql` contains an isolated privileged worker and **commented-out** Supabase Cron installation/scheduling instructions. The worker uses the **America/Chicago** local date and creates only not-yet-materialized due chores after 05:00 local time, using the same unique occurrence keys/advisory locking strategy.

Do **not** enable this optional worker until an administrator reviews its privileged function, tests DST transitions, measures query load, validates family timezone assumptions, monitors `cron.job_run_details`, and approves an installation plan. For households outside Central Time, add a reviewed per-household timezone before enabling the job. Cron scheduling must be performed by a trusted database administrator, never by clients or a public RPC. `pg_cron` is currently *available but not installed* in the linked production project.

## Release rules

No Supabase migration, cron installation, merge or Vercel production promotion without authenticated cross-household acceptance, passing unit/build/security/browser CI and explicit approval. Existing calendar default Month, monthly screensaver, secure family avatars and separate child/parent permissions must remain unchanged.
