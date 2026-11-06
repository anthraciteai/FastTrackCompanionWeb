# FastTrack web

Companion app for the FastTrack Android client. Dashboard, fasting timer, food/water/workout logging, schedule, and profile. Data is saved in this browser and can sync with the phone.

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Google sign-in (client id)

This repo is standalone, so the dev server no longer reads the Android app's `local.properties`.
Provide the Google OAuth client id via an environment variable before `npm run dev`:

```bash
# PowerShell
$env:VITE_GOOGLE_CLIENT_ID="<your-id>.apps.googleusercontent.com"; npm run dev
```

Without it, sign-in is disabled but the rest of the app still runs.

## Phone sync

The Vite server exposes `PUT/GET /v1/sync`. On an emulator, FastTrack posts to `http://10.0.2.2:5173/v1/sync`. On a real phone, set `SYNC_BASE_URL` in `local.properties` to your computer’s LAN address, e.g. `http://192.168.1.20:5173/`.

Then: **Profile → Connections → FastTrack Web → Sync now**.
