# Skylight feature study → Anderson Family Calendar (original implementation)

**Source project:** [REA — Reverse Engineer Anything](https://github.com/morluto/rea) (MIT-licensed tooling; **not** Skylight source code). Documentation reviewed from the published REA README/package metadata on 2026-11-15. REA is not installed in this connected GitHub workspace and no Skylight binary, session, APK, or source bundle has been provided. **No source-code reverse engineering of Skylight has been completed.**

**Product behavior references:** [Skylight Calendar 2 product features](https://us.manage.myskylight.com/products/the-skylight-calendar-2-classic-black) and [Skylight Tasks: Routines and Chores](https://skylight.zendesk.com/hc/en-us/articles/36846381293979-The-Tasks-Tab-Routines-and-Chores), reviewed 2026-11-15. These are feature descriptions, **not implementation evidence**.

## REA setup for lawful, authorized observation

REA can inspect *locally available* JavaScript/Electron applications or static web bundles. On an independent developer workstation meeting its current Node requirements (README: Node 22.23.4+, 24.22.1+, or 26.12.1+):

```bash
# Review the upstream README and package before installing:
npx rea-agents setup
# For an app bundle you are actually permitted to inspect:
npx -y rea-agents analyze-javascript-application /absolute/path/to/authorized-bundle --json
```

The user-provided repo is a tool, not a copy of the private Skylight Calendar application. No access to private APIs, firmware, authentication tokens, paid features, proprietary code or DRM is assumed. Don't scrape personal calendars or circumvent access controls. Build independently from public behavior and original code; don't copy Skylight logos, assets, proprietary text, or source.

## Feature-parity matrix (as of review)

| Observed product capability | Current Anderson code | Gap and priority |
| --- | --- | --- |
| Color-coded household calendar | Existing members and individual colors; month/year/week | Enhance event grouping, keyboard navigation (P1) |
| Day / week / month / schedule views | Month default, year, proportional week, day dialog | Dedicated day/schedule agenda not yet present (P1) |
| Time-proportional events | `buildWeekTimeline` with overlap lanes | **This branch:** parent-only hourly quick-add, end time editing and avatar clusters |
| Tasks / chores and routines | Chores, routine-aware morning/evening kiosk panels | Recurring task definitions by morning/afternoon/evening, user-per-task audit (P1) |
| Rewards | Chore submission/approval/payment records | Star-to-reward redemption workflow not implemented/verified (P2) |
| Shared custom lists and groceries | Groceries UI plus prepared family-scoped Supabase SQL | Real staging isolation and Realtime tests are still blocked (P0) |
| Meal planning and recipes | Meals, dinner ingredients, video links | Multi-meal planning templates and recipe import require separate design (P2) |
| Photo screensaver | Fullscreen **monthly calendar** idle screensaver (user-preferred default) | Optional photo album toggle could be built later; keep monthly default (P2) |
| External calendar sync | ICS export and auth providers, not equivalent to event sync | Proper Google/Microsoft/Apple integration with scoped OAuth, refresh/revocation (P1) |
| Magic import (photos/PDF/emails) | No verified production intake workflow | Requires document parsing review and explicit approval per imported event (P2) |
| Sleep mode | Kiosk timer, wall display and Android app pinning guides | Optional overnight blackout schedule (P2) |
| Multiple devices | Authorized Supabase family workspace and sessions | Authenticated actual-device sync still requires acceptance (P0) |

## Phase 1 change set on this branch

1. Retain the original month/year views, family photos, membership security, existing Supabase `planner_records` JSON format and calendar screensaver.
2. Add editable optional `end_time` to the Parent Portal event form, rejecting end times at or before start times on the same date.
3. Show event start/end times and privacy-safe member avatar clusters in the existing weekly proportional/overlap layout. Images still use the app's existing `MemberAvatar` and private-photo authorization hook.
4. Add focusable 60-minute quick-add slots in Week view, accessible **only to parent/admin viewers outside locked kiosk mode**. Clicking routes through the existing server-protected Parent Portal and pre-fills the date and time. Nothing bypasses the PIN/role check.
5. Add sample durations and browser checks for the weekly features across desktop/mobile/Galaxy Tab S7 viewports.

## Release and verification

GitHub PR is draft and **not to be merged/published** until unit tests, build, security checks, and viewport/browser smoke tests pass. Real protected account tests (including two-household RLS, child/parent permissions, session revocation, private photos, and real device testing) remain separate release gates. No new Supabase migration is needed for this first feature: end times reside in the existing event JSON record.

Do not claim the Skylight software was decompiled, or that feature parity is complete. Future REA observations must include exact evidence, target version, licensing/permission, uncertainty, and reproducible tests before implementing a further feature.
