# Anderson Family Hub

Build on the existing repository and Supabase auth; deliver changes on a review branch.

Reference coverage:
- Family weekly calendar: per-person color, day/week/month views, member filters.
- Ledgerly: category budgets, spending and remaining funds, transactions, dark/light modes.
- Connectify: pastel activity cards, category navigation and family member rail.
- Marketing calendar: spacious day columns, clear date navigation and event detail editing.
- Calmendar: dark schedule, mini calendar, agenda, event dialog.
- Uploaded TSX: trips, grades, parent portal and photo screensaver; replace the demo PIN with authenticated roles.
- Existing family requirements: chore submission/approval/payment tracking, meals, pantry, shopping, school and vacations.

Implementation: authenticated family records protected by RLS, administrator-only finances and edits; child chore completion via a narrowly scoped RPC. Explicit sample workspace for review only. Do not imply payment-provider notifications or external calendar synchronization exist before integration.

Validation: build, domain logic tests, browser flows in sample mode, SQL access checks, schema advisories. Vercel preview pending workspace authorization. Keep main unchanged.

Completed: reference synthesis, implementation, migrations, protected account authorization, domain tests, rollback-only RLS integration tests and desktop browser QA. Preview-only Vercel client configuration created. Production branch remains unchanged. Provider OAuth setup and automatic calendar/payment integrations remain explicitly documented work.
