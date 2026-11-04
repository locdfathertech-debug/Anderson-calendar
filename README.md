# FamilyWall — Anderson Family

A responsive family wall calendar and organizer built with React and Vite. The interface is inspired by the supplied tablet calendar concept and adapts to tablets, desktop, and phones.

## What’s included

- Month calendar with day selection, family events, and 2026 holidays.
- Family-member status, school grades, upcoming trips, and daily chores.
- Add events and mark tasks complete.
- Parent-space demo for managing tasks, vacations, grades, and screensaver photos.
- Idle screensaver with a live clock and upcoming events.
- Responsive layout and a basic installable-app manifest.
- Calendar, chores, vacations, grades, and settings are stored in the browser’s local storage.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Create and preview a production build with `npm run build` and `npm run preview`.

## Production and privacy notes

This is a front-end prototype. There is no account system, server-side authentication, shared database, or cross-device synchronization. The parent space is **not access-controlled**; do not put real student records, grades, or other sensitive family data in it. Browser local storage is accessible to people using the same browser profile. Screensaver image URLs and sample records are for demonstration.

To launch as a real multi-family product, add server-side identity and authorization, protected storage, data validation, and an appropriate privacy/security review before storing real family or student data.

## Vercel

The project uses the standard Vite settings: build command `npm run build`, output directory `dist`. Pushing to `main` should trigger a production deployment if this GitHub repository is connected to a Vercel project with production deployments enabled. Confirm the deployment in the Vercel dashboard; this repository update alone cannot verify or guarantee a live deploy.
