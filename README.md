# FamilyWall — Supabase-connected family calendar

Responsive React/Vite family calendar with Supabase Auth and Postgres persistence. Routes include `/calendar`, `/tasks`, `/vacations`, `/grades`, and `/admin`.

## Supabase setup

1. In the Supabase project `https://pxusdjpjsdzmrjgbobgp.supabase.co`, open **SQL Editor** and run `supabase/migrations/20261104000100_familywall.sql`.
2. In **Authentication → Providers**, enable email/password sign-in and require email confirmation. Keep public sign-up disabled; create/invite only the two authorized accounts from the Supabase Dashboard:
   - `Locdfathertech@gmail.com` — the database trigger assigns `super_admin`.
   - `Kapreceh88@outlook.com` — the database trigger assigns `admin`.
3. Set the project URL and publishable key as frontend environment variables (the publishable/anon key is intended for browser use; never use the service-role key in the client):

   ```sh
   VITE_SUPABASE_URL=https://pxusdjpjsdzmrjgbobgp.supabase.co
   VITE_SUPABASE_ANON_KEY=<your Supabase publishable key>
   ```

4. Add both variables to Vercel for the required deployment environments, then redeploy. Add your production domain to Supabase **Authentication → URL Configuration** as the site URL and redirect URL.
5. Use password reset from the sign-in page if invited accounts need to set or recover their password.

The database trigger rejects auth users outside the two-email allowlist. To authorize another person, update the protected trigger allowlist and role assignment through a reviewed database migration. The `set_family_role` RPC lets only the super admin change an existing family profile between `member` and `admin`; the client cannot write profile roles directly. RLS policies enforce family scoping and role checks even if someone bypasses the UI.

## Run locally

Requires Node.js 18+.

```sh
cp .env.example .env.local
# Put the project URL and publishable key in .env.local
npm install
npm run dev
```

Build using `npm run build`. Vercel uses `npm run build` and `dist`; `vercel.json` sends app routes to the Vite entry point.

## Production security notes

The frontend contains only the Supabase publishable key. Never expose a Supabase service-role/secret key in `VITE_*`, source code, GitHub, or browser settings. Database RLS is authoritative; the React role guards are only navigation UX. Grade records are restricted to admins. Supabase Auth, email confirmation, and provider-level rate limits should be configured before production use. Configure backups and review data-retention/privacy obligations before storing real student information.
