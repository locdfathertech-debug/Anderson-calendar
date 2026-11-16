# Anderson Family Calendar — isolated Supabase staging

Designated staging project: `npoqzqtwlhvvqzryjvkm` (`supabase-alizarin-magnet`). This project is **separate** from the live family database `kwaqscxveniaostnmonu`.

## Applied by ChatGPT in staging

- Sanitized baseline migrations: familywall, planner, access hardening, open registration, planner Realtime, 15-minute Parent Portal session grants.
- The reviewed and corrected `recurring_routines_review.sql`, providing `routine_templates`, `routine_occurrences`, and `materialize_family_routines(date)`, with tenant RLS and Realtime.
- Two isolated staging-only fixture family records named `Anderson E2E Family A` and `Anderson E2E Family B`.
- Read-only checks: table RLS is enabled; anonymous clients lack SELECT; `authenticated` lacks DELETE; routine Realtime publication is present; unauthenticated chore-generation RPC correctly raises `42501 Parent unlock required`.
- **Not created:** Supabase Auth users, real signed-in Auth sessions, approved parent/child fixture PIN, routine-generated chores, Cron extension or schedule. Live production was not changed.

## Provision disposable accounts with supported Auth Admin API

The connected Supabase plugin does not expose the Auth Admin `createUser` action. Do **not** insert users manually into `auth.users` or `auth.sessions`; use the official Auth Admin API with the included `scripts/provision-routine-staging.mjs`, or create users in the staging dashboard **Authentication → Users → Add user** with confirmed email.

For local script use: check out this reviewed branch, run `npm ci` and set **only in your private shell or secret manager**:

| Environment variable | Value |
| --- | --- |
| `E2E_STAGING_PROJECT_REF` | `npoqzqtwlhvvqzryjvkm` |
| `E2E_STAGING_SUPABASE_URL` | `https://npoqzqtwlhvvqzryjvkm.supabase.co` |
| `E2E_STAGING_SUPABASE_KEY` | Staging publishable/anon key |
| `E2E_STAGING_SERVICE_ROLE_KEY` | Staging-only secret key, **never** production |
| `E2E_PARENT_A_EMAIL` | Disposable address e.g. `parent.a@example.invalid` |
| `E2E_PARENT_A_PASSWORD` | Unique random 16+ characters |
| `E2E_PARENT_A_PIN` | Disposable 6–12 digit PIN |
| `E2E_CHILD_A_EMAIL` | `child.a@example.invalid` |
| `E2E_CHILD_A_PASSWORD` | Unique random 16+ characters |
| `E2E_PARENT_B_EMAIL` | `parent.b@example.invalid` |
| `E2E_PARENT_B_PASSWORD` | Unique random 16+ characters |

Do not send the keys/passwords/PIN through chat, place them into `.env` tracked by Git, or expose the service role to Vite (`VITE_*`). Use process environment variables for the one-time script.

```bash
npm ci
node scripts/provision-routine-staging.mjs
node tests/routine-staging-acceptance.mjs
```

The script refuses other project URLs, requires disposable email domains, creates/validates three identities with `auth.admin.createUser`, assigns roles using the staging-only privileged client, signs in with normal Auth to verify sessions, and configures or checks the parent PIN. It **never prints credentials**. If the script fails, retain the original error without pasting secrets.

## Authenticated acceptance and Cron gate

In the protected GitHub `staging` Environment, configure the **nonprivileged** acceptance variables from the table, but **do not** add `E2E_STAGING_SERVICE_ROLE_KEY` to the acceptance workflow. Enable reviewers and restrict deployment branches to reviewed code. Manually run `.github/workflows/routine-acceptance.yml` from the approved branch. It checks:
- Parent A and Child A share a family, and Parent B is in a separate family.
- Child A and a locked parent cannot create templates or generate chores.
- The unlocked Parent A can create an assigned template and materialize it exactly once.
- Family B cannot read or alter Family A's template/chores.
- Child A can submit only its assigned chore. Parent A can approve separately from payment.
- A revoked Parent grant can no longer generate chores.

**Additional tests:** concurrent generation by two clients, session revocation, wrong PIN/rate limiting, template update restrictions, Realtime two-device delivery, DST and Central Time scheduling, real Tab S7 and mobile validation.

The `pg_cron` extension is **not installed**, and no schedule is enabled. Activation requires separate reviewed approval after real Auth acceptance and a job-health monitoring plan.

Do not merge any feature PR or promote the production database from this staging branch solely because static checks pass.
