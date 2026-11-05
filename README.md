# Anderson Family Hub

A responsive family planner built from the supplied calendar, budgeting, activity dashboard and wall-display references. React + Vite + Supabase, deployed through the existing Vercel project.

## Workspaces

Overview; color-coded day/week/month calendar with member filtering, holidays and ICS export; chores with completion, approval and manual payment records; meals, pantry and shopping; school assignments and parent-only grades; trips; monthly category budgets and transactions; family members, photo wall display, theme controls and account authorization.

`/demo` is an explicit sample workspace. It never reads or writes family records; changes reset on reload. Live pages require Supabase authentication and a family profile. Existing `/calendar`, `/tasks`, `/vacations`, `/grades`, and `/admin` paths map to their corresponding workspaces.

## Local development

Use Node 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, set this project's URL and **publishable** key, then run `npm run dev`. `npm test` runs domain tests; `npm run build` creates the production bundle. Never put a service-role key in a VITE variable.

## Database and accounts

Migrations in `supabase/migrations` are applied in timestamp order to a new database. The existing FamilyWall tables are retained. Planner records and email authorizations are family-scoped under RLS. Membership helpers live in a private schema. Children can submit only their own open chores through `submit_planner_chore`; reward approval/payment edits require a parent. Only the super admin manages roles and authorizes registration emails.

The owner email `locdfathertech@gmail.com` and existing second parent `kapreceh88@outlook.com` are retained from the starter. Register an authorized email using the app; confirmation delivery depends on Supabase Auth configuration. Adding a member name does not create a login. Authorize additional emails in Parent portal → Family login access before signup. The account UUID displayed there can be assigned to a chore to enable that child's completion button.

### Social sign-in

Enable Google and Apple in Supabase Auth under Sign In / Providers. Use the callback URL shown there, `https://kwaqscxveniaostnmonu.supabase.co/auth/v1/callback`, as the Google web OAuth redirect URI and Apple Services ID return URL. Apple also requires the Supabase project hostname as a website domain. Store the Google OAuth client ID and secret and the Apple Services ID and generated client secret in Supabase. Apple web client secrets must be renewed every six months.

In Supabase Auth URL Configuration, allow the exact app URL (including the root path) for each deployment being tested, plus its `/update-password` URL for password recovery. Sign in with an email already authorized for the family. If Apple shares a private relay address, that address must be authorized before first sign-in, or choose Share My Email to use the existing authorized address.

Microsoft uses its own provider credentials and requests the email scope. Social sign-in grants app access under the existing family rules. Calendar synchronization requires a separate integration.

## Vercel

Use the existing `vite-anderson-calendar` project in `locdfathertech-9238`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the public URL and publishable key for the relevant environment. The current implementation configures preview variables only. Vercel builds with `npm run build` and serves `dist`; `vercel.json` preserves SPA navigation. Feature branch deployment leaves production unchanged.

## Integration limits

Parents record chore payments manually. Calendars export to ICS; two-way sync is future work. No bank connection is configured. Photo display accepts HTTPS URLs; image uploads are future work. A service worker caches the app shell and static assets only; private family records and offline edits are not cached. See `tasks/verification.md` for verified behavior and current limits.

SQL integration checks in `tests/rls.sql` use rollback-only test accounts and records and must be run against the intended project. They leave no users or records behind.
