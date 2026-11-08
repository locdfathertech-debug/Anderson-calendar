# Lessons

- Registration and family membership are separate operations. A signup trigger must permit new identities and must never grant a shared household or administrator role from user-editable metadata.
- Test signup through the auth database role and cover unconfirmed emails, arbitrary new emails, duplicate onboarding, and cross-family access.
- Keep provider readiness separate from database readiness. A signup-capable schema still requires OAuth credentials and a completed provider sign-in test.

- Apply requested branding throughout the signed-in experience as well as authentication. Keep member identity colors consistent across calendar filters and event cards.

- When the user asks for deep blacks, keep signed-in surfaces near black and use bright brand colors for outlines, icons, active states, and actions. Avoid muted green or large gray surfaces.

- A supplied theme reference supersedes prior palette requests. For theme-only changes, preserve layout and components; verify geometry rather than adding new sections or visualizations.

- Adapt sample blueprints to the existing tenant model. Never replace family RLS with unscoped tables or treat a client PIN/member color tab as authentication. Clear household snapshots on identity changes and render alert records from the same filtered source that triggered them.

- A shared tablet signed in as a parent still needs server-enforced elevation: hiding edit controls or comparing a bundled PIN does not restrict direct API calls. Clear private snapshots and in-memory elevation on lock, expiry, reload, and account changes.
- Keep display-profile labels separate from authenticated account permissions; adding a child photo must never grant administrator access.

- Verify pasted audit findings against published source before applying a patch. A photo URL form is not an upload dropzone; do not invent missing handlers, publish a public child-photo bucket, or replace stable chosen colors with random values on every save.

- When the user asks to customize a tile, expose photo/color controls directly within that tile and verify the visible tile changes after saving. A hidden arrow plus a long modal does not satisfy an in-tile interaction request.
