# Anderson Family Calendar — GitHub branch protection and release gates

**Status:** This is a proposed configuration. The GitHub connector currently cannot read/modify branch protection (HTTP 403, administration permission missing). It cannot add required reviewers to GitHub Environments or create protected secret values. The workflow on this branch is **not active on default `main`** until it is explicitly reviewed and merged by an administrator. Do not rely on its mere existence as enforcement.

## Verified staging and production scope

- GitHub: `locdfathertech-debug/Anderson-calendar`; main is the Vercel production branch.
- Vercel team: `locdfathertech-9238`, project `vite-anderson-calendar`.
- Production Supabase: `kwaqscxveniaostnmonu`. **No new production routine schema or Cron installed.**
- Approved isolated staging Supabase: `npoqzqtwlhvvqzryjvkm`. Baseline + routine migrations, two disposable families, **zero Auth users** and no Cron installed.
- Latest merged PR #27 was automatically deployed to Vercel before its old browser check failed. A subsequent branch-only corrective browser test passed, but signed-in staging tests have NOT run.
- Vercel project now has `autoAssignCustomDomains=false` and an **Ignored Build Step** command: `if [ "$VERCEL_ENV" = "preview" ]; then echo "Preview permitted"; exit 1; else echo "Production build blocked pending staging approval"; exit 0; fi`, with system environment variables exposed at build. This is an **interim deployment hold**: it skips production builds triggered through the Git integration while continuing preview builds. Vercel UI/API manual promotions, CLI pushes with alternative flags, redeploy with Ignore Build Step unchecked, or configuration overrides may bypass this hold, so restrict who can promote and audit deployment activity. Do not present it as a full approval policy or a guaranteed restriction on administrators. Existing production domains are attached.

## Admin-only GitHub setup

Open [GitHub Settings → Rules → Rulesets](https://github.com/locdfathertech-debug/Anderson-calendar/settings/rules). Add an active **branch ruleset** targeting `main` with:

1. Require a pull request before merging, at least **one independent approving review**, and dismiss stale reviews after further commits. Do not allow bypass by default or automatic merge before approval.
2. Require status checks from trusted GitHub Actions: `verify` (release audit), `browser-layout` (four-viewport browser checks), and relevant dependency evaluation. Confirm the exact current check names in a recent PR before setting.
3. Require branches to be current with `main` before merge and block force pushes and deletions. Require conversation resolution and signed commits if supported.
4. Restrict who can bypass and who can push to `main`, including bots. Require administrator approval for workflow changes and any database migration/Cron SQL.
5. For the **authenticated staging gate**, use a protected GitHub `staging` Environment with independent reviewers, a branch/repository policy and the disposable credentials in environment secrets; never use production credentials.

GitHub Settings → Environments: create or edit environments `staging` and `production`. Configure **required reviewers** (not the author, where your GitHub plan supports this); prevent self-review; and restrict deployment branches. A production environment without configured required reviewers does *not* provide approval.

The proposed `.github/workflows/manual-production-release.yml` requires a manual dispatch and an exact reviewed commit SHA on `main`. The staging job runs unit/build/dependency security checks and the **real authenticated Parent A/Child A/Parent B acceptance**. Only on success does a separate `production` environment approval job become eligible. **Neither job deploys anything:** an authorized operator must promote the explicitly reviewed and tested production build after the approval.

## Configure disposable Supabase Auth identities

The staging database currently has zero Auth users. Run the [approved Auth Admin provisioning script](../scripts/provision-routine-staging.mjs) using a staging-only service role through a trusted local environment (never through a public UI or unreviewed pull-request workflow). The service role key is *only* for provisioning and must not be placed in the staging acceptance CI environment.

Required protected staging environment secrets:
`E2E_STAGING_PROJECT_REF`, `E2E_STAGING_SUPABASE_URL`, `E2E_STAGING_SUPABASE_KEY` (publishable/anon), `E2E_PARENT_A_EMAIL`, `E2E_PARENT_A_PASSWORD`, `E2E_PARENT_A_PIN`, `E2E_CHILD_A_EMAIL`, `E2E_CHILD_A_PASSWORD`, `E2E_PARENT_B_EMAIL`, `E2E_PARENT_B_PASSWORD`. See [provisioning guide](./RECURRING_STAGING_PROVISIONING.md).

Run the manual [routine acceptance workflow](../.github/workflows/routine-acceptance.yml) in the approved staging environment, and review the results. It must demonstrate signed-in cross-family RLS, parent unlock and revoke, child submit, parent approval (without payout), and idempotent creation. Supplement with concurrency, realtime, expired session and physical Tab S7 tests before release.

## Vercel controlled promotion

In Vercel project **Settings → Build and Deployment**, verify the Ignored Build Step command and ensure *only preview* builds automatically. Custom domains should remain attached to the last authorized release. The command returns **0 (skip)** for production, **1 (build)** for preview.

After all required GitHub checks, authenticated staging tests and reviewer sign-off pass, an authorized operator can explicitly stage a production build (e.g. `vercel deploy --prod --skip-domain`), inspect the exact SHA and environment, and then promote **that exact deployment**, recording the deployment ID and rollback candidate. Do **not** use `vercel --prod` on unreviewed code or run Cron automatically. Re-enable normal auto-assignment only through a separately documented release policy; the present request is for approval-gated releases.

## Current security evidence

Read-only staging SQL checks passed:
- Auth-role without a valid login: no family routine rows visible.
- Anonymous SELECT returns permission denied; anon EXECUTE of `materialize_family_routines(date)` is not granted.
- Authenticated DELETE of routine templates is denied by grants.
- Invoking generation without a valid unlocked parent returns PostgreSQL `42501`.

**These are not substitutes for Auth-backed acceptance**, which remains blocked until disposable users and secret-managed CI environment are configured. The latest verified staging check still had zero users; Cron is OFF.
