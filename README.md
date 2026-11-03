# Anderson Family Calendar & Parent Portal

A responsive React + Vite family calendar and parent portal. The app is designed to work on desktop, tablet, and mobile screens.

## Features

- Month and week calendar views with month navigation and an upcoming agenda.
- Add family events with a date, time, member, and location.
- Event data persists in the browser using `localStorage`.
- School updates and child/school information sections.
- No UI component library or backend required for the demo.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`; preview it with `npm run preview`.

The portal currently includes sample family and school information. Event changes are stored only in the current browser and are not synced between family members.

## Deploy

This is a standard Vite app. For Vercel, import the repository and use the default Vite settings: build command `npm run build`, output directory `dist`.
