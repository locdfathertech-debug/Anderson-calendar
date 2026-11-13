# Family Chat staging activation and acceptance

**Status: NOT ACTIVE IN PRODUCTION.** UI exists; `public.family_messages` is not present in the linked live project (`kwaqscxveniaostnmonu`). Do not run the staged migration against production.

## Staging selection and preparation

1. Select a separate disposable Supabase project, confirm its project reference and owner, and designate it *explicitly* as Anderson Calendar staging. The other currently connected Supabase project is empty, **not yet designated** for this use.
2. Reconcile the live project's historical migration versions with the repository before copying its safe schema to staging. The linked development branch currently reports `MIGRATIONS_FAILED`. Do not `db push` blindly or rewrite production migration history.
3. Install and verify the base `families`, `profiles`, `planner_records`, private auth/session functions and RLS in staging, using approved migration history.
4. Apply `supabase/sql/family_chat_review.sql` **only** in that disposable staging database, then query:
   ```sql
   select relrowsecurity from pg_class where oid='public.family_messages'::regclass;
   select policyname,cmd,qual,with_check from pg_policies
     where schemaname='public' and tablename='family_messages';
   select has_table_privilege('authenticated','public.family_messages','SELECT,INSERT');
   select has_table_privilege('anon','public.family_messages','SELECT');
   select count(*) from pg_publication_tables
     where pubname='supabase_realtime' and tablename='family_messages';
   ```
   The authenticated role should have SELECT/INSERT only; anon must not read; the chat table must have RLS and be in the realtime publication.
5. Provision **three disposable confirmed auth identities** through normal Supabase Auth: Parent A, Child A within A's family, Parent B in a different family. Use no real family data.

## GitHub staging secrets

Add the following to the protected `staging` GitHub environment, with required reviewers and allowed deployment branches:
- `E2E_STAGING_PROJECT_REF`: explicit approved Supabase project reference
- `E2E_STAGING_SUPABASE_URL`: exact matching `https://<ref>.supabase.co`
- `E2E_STAGING_SUPABASE_KEY`: publishable key or anon JWT (**never** service_role)
- `E2E_PARENT_A_EMAIL`, `E2E_PARENT_A_PASSWORD`
- `E2E_CHILD_A_EMAIL`, `E2E_CHILD_A_PASSWORD`
- `E2E_PARENT_B_EMAIL`, `E2E_PARENT_B_PASSWORD`

**Run the `Authenticated staging acceptance` workflow manually, from reviewed code only.** Never send these credentials in a chat message or place them in the repository.

## Required test coverage

The scripted acceptance verifies:
- Verified account role and family memberships, parent portal locked at login, cross-family planner-record denial.
- Locked parent and cross-family account-role changes denied; child self-promotion denied.
- Family A and B chat creation, correct-family reads, denied sender impersonation, cross-family writes, disallowed UPDATE/DELETE.
- Realtime delivery from Parent A to Child A, while Parent B receives **no** Family A payload (timeout bounded).
- Sign-out and rejected family history access using Parent A's stale bearer token. This validates the server-side session-state revocation boundary.

The script may write synthetic chat messages to **staging only**. Keep test data disposable. Cleanup requires trusted, isolated staging admin tooling since browser clients intentionally cannot DELETE messages. No production data should be queried or mutated.

## Additional manual browser/device acceptance

Sign in on two isolated devices; verify live read receipt behavior is **not** claimed (not implemented), ordering/history, multiple tabs, connection interruption/recovery, private family B, mobile keyboard usability, kiosk overlap, and session expiry. The `@AI` parser currently gives only local, non-persisted suggestions. It does not approve payments, assign chores, send actual push notifications or invoke an LLM service.

## Release rule

Do not mark chat operational or merge/propose production migration until all staging tests pass, browser and physical Galaxy Tab S7 testing is complete, and GitHub branch protection enforces a human-reviewed release. CI static migration checks are a *guard*, not a substitute for authenticated database tests.
