# Anderson Family Hub

A responsive family planner built from the supplied calendar, budgeting, activity dashboard and wall-display references. React + Vite + Supabase, deployed through the existing Vercel project.

## Workspaces

Overview; color-coded day/week/month calendar with member filtering, holidays and ICS export; chores with completion, approval and manual payment records; meals, pantry and shopping; school assignments and parent-only grades; trips; monthly category budgets and transactions; family members, photo wall display, theme controls and account authorization.

`/demo` is an explicit sample workspace. It never reads or writes family records; changes reset on reload. Live pages require Supabase authentication and a family profile. Existing `/calendar`, `/tasks`, `/vacations`, `/grades`, and `/admin` paths map to their corresponding workspaces.

## Local development

Use Node 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, set this project's URL and **publishable** key, then run `npm run dev`. `npm test` runs domain tests; `npm run build` creates the production bundle. Never put a service-role key in a VITE variable.

## Database and accounts

Migrations in `supabase/migrations` are applied in timestamp order to a new database. The existing FamilyWall tables are retained. Planner records and email authorizations are family-scoped under RLS. Membership helpers live in a private schema. Children can submit only their own open chores through `submit_planner_chore`; reward approval/payment edits require a parent. Only the family owner (super admin) manages roles and authorizes family membership emails.

Anyone can register using email/password or an enabled social provider. The Auth trigger creates a personal profile with no household access. After verifying their email, new users choose Create my family to become the owner of a new household, or Join my family after an existing owner authorizes their sign-in email in Parent portal → Family login access. Supabase dashboard invitations create an identity through the same flow. Dashboard invitations alone do not choose a household.

Existing family memberships are preserved. A profile belongs to one household. The create/join RPCs lock the caller profile to prevent competing onboarding requests from creating two families. Roles come from the new-household operation or the owner-issued authorization. User metadata cannot assign roles or household IDs. Adding a planner member name is separate from login access. The account UUID in the portal can be assigned to a chore to enable that child's completion button.

### Social sign-in

Enable Google and Apple in Supabase Auth under Sign In / Providers. Use the callback URL shown there, `https://kwaqscxveniaostnmonu.supabase.co/auth/v1/callback`, as the Google web OAuth redirect URI and Apple Services ID return URL. Apple also requires the Supabase project hostname as a website domain. Store the Google OAuth client ID and secret and the Apple Services ID and generated client secret in Supabase. Apple web client secrets must be renewed every six months.

In Supabase Auth URL Configuration, allow the exact app URL (including the root path) for each deployment being tested, plus its `/update-password` URL for password recovery. After sign-in, create a family or join an authorized household. For Apple private relay addresses, the owner must authorize the relay email shown in the app before the user joins an existing family.

Microsoft uses its own provider credentials and requests the email scope. Social sign-in grants app access under the existing family rules. Calendar synchronization requires a separate integration.

## Vercel

Use the existing `vite-anderson-calendar` project in `locdfathertech-9238`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the public URL and publishable key for the relevant environment. The current implementation configures preview variables only. Vercel builds with `npm run build` and serves `dist`; `vercel.json` preserves SPA navigation. Feature branch deployment leaves production unchanged.

## Integration limits

Parents record chore payments manually. Calendars export to ICS; two-way sync is future work. No bank connection is configured. Photo display accepts HTTPS URLs; image uploads are future work. A service worker caches the app shell and static assets only; private family records and offline edits are not cached. See `tasks/verification.md` for verified behavior and current limits.

SQL integration checks in `tests/rls.sql and tests/onboarding.sql` use rollback-only test accounts and records and must be run against the intended project. They leave no users or records behind.
