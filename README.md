# Together — Anderson Family Organizer

A mobile-friendly React + Vite family organizer concept for keeping schedules, shared tasks, groceries, and household spending in one calm, collaborative space.

## Features

- Today dashboard with family activity, schedule, shared to-dos, and grocery snapshot.
- Weekly family calendar with event creation.
- Shared checklist interactions for tasks and grocery items.
- Household budget overview with the ability to add spending categories.
- Family member profiles and a family-space overview.
- Responsive desktop sidebar and mobile bottom navigation.
- Calendar, task, grocery, and budget changes persist in browser `localStorage`.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`, then preview it with `npm run preview`.

The app is a front-end concept and uses sample family information. Data is saved only in the current browser; it is not synced to other family members and does not connect to financial accounts.

## Deploy

For Vercel, use the standard Vite configuration: build command `npm run build`, output directory `dist`.
