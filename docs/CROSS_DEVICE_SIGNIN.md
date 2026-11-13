# Secure cross-device family calendar sign-in (no CSV)

## Goals

Use the **same family workspace** on the Samsung Galaxy Tab S7, mobile phones and PCs. Each device authenticates independently with Supabase Auth and shares authorized family records from Supabase; there is **no password CSV migration** and no application code containing account passwords.

## Existing secure architecture

- `src/App.jsx` already listens for Supabase session events and restores the signed-in identity on reload.
- The signed-in profile determines the family's ID and account role. Family members can use separate approved accounts without sharing an owner password.
- Data reads are family-scoped and subject to PostgreSQL Row Level Security. Membership and the trusted server determine who may read/write records.
- The Parent Portal is *additional authorization*: a parent account enters its own **6–12-digit PIN**; Supabase verifies it server-side, returns a short-lived grant and revokes it on lock/logout. Never use a bundled `1234` PIN.
- The shared tablet can remain in calendar kiosk mode while Parent Portal controls are locked. Android app pinning and physical lock settings must be configured on the device; a PWA cannot fully lock down Android itself.
- Password-manager autofill saves/fills the password; **it does not copy a Supabase authentication session between devices**. Each device signs in to obtain its own session.

## Setup without passwords in code

1. On a trusted device, open the calendar's existing **Sign in** page. For a parent account, choose the existing owner account; for children, sign in with individually authorized family member accounts.
2. If that account does not exist, use **Create account** and follow email confirmation and family onboarding, or use a correctly configured Google/Microsoft/Apple sign-in provider. Do not assume an email is automatically an owner just because it has a family name.
3. If an earlier password was pasted into a file or chat, **replace it immediately using Forgot password** and a unique password, and revoke other sessions if needed. Never put passwords, session tokens, refresh tokens or service-role keys in GitHub, browser source or task documents.
4. On the Galaxy Tab S7, enable your preferred trusted password manager in Android Settings (menu names vary by Android/One UI version). Sign into the password manager and enable password sync. Verify that the calendar's login appears as a matching saved website credential. On other devices, use the same password manager or sign in manually.
5. On each device, visit the same calendar URL and complete **its own** Supabase login. Verify the same **authorized** family calendar events appear after refresh.
6. Unlock the Parent Portal using the PIN configured for the family. Turn on Kiosk Mode on the Galaxy Tab S7. If using Android screen/app pinning, configure it under device security settings separately; keep the shared display physically secured.
7. Use **Switch account/Sign out** when changing family members. A family member's calendar access must not depend on using the parent's password or bypassing a PIN.

## Acceptance tests before a production change

- Parent and child logins use separate Supabase identities; login restores the correct family after reload and synchronizes edits across authorized devices.
- A user from family B cannot read family A's events, photos or chat.
- On shared tablet: Parent Portal locks on timeout, reload, kiosk activation and sign-out; wrong PIN and stale token cannot authorize writes.
- No fixed password or PIN is present in React source or SQL migrations. Credential autofill succeeds on a real Tab S7, phone and PC without copying a session.
- Sign-out on one device invalidates that device's session and clears sensitive cached records. Cross-device sign-out is an **explicit** feature to test separately; don't promise it automatically happens everywhere.

## Release

The HTML autofill hint and copy update require no Supabase schema changes. **Do not** restrict all Auth sign-ins to a single hard-coded email; that would disable distinct parent and child accounts and undermine family-level access control. The test suite and browser preview still need to pass before merging this review branch.
