# Rhythm — a local-only health tracker (Expo)

A React Native + Expo health app that tracks steps, water, sleep and weight.
**All data is stored on-device** in a local **SQLite** database via
`expo-sqlite` — there is no backend, no account, no network sync.
Uninstalling the app deletes the data.

## Stack

- **Expo** (SDK 54) + React Native
- **expo-sqlite** — on-device relational storage, schema/migrations in `src/storage/storage.js`
- **expo-sensors** (`Pedometer`) — live step auto-tracking, with platform-specific handling for iOS (`getStepCountAsync`) vs Android (`watchStepCount` delta accumulation)
- **Zustand** — global app state in `src/store/healthStore.js`
- **React Navigation** (bottom tabs)
- **react-native-svg** / **expo-linear-gradient** — custom charts and glow UI, no chart library dependency

## Run it

```bash
cd RhythmHealth
npm install        # if you haven't already
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, `w` for web, or
scan the QR code with the **Expo Go** app on your phone.

Requires Node 18+ and, for on-device testing, the free **Expo Go** app
(iOS App Store / Google Play).

## What's inside

```
App.js                        Root: providers + onboarding gate
src/
  theme/theme.js               Colors, spacing, radius, type, glow tokens — single source of truth
  storage/storage.js           expo-sqlite schema, migrations, and CRUD (the "database")
  store/healthStore.js         Zustand store: loads data once, exposes CRUD + today's totals
  navigation/RootNavigator.js  Bottom tab navigator (5 tabs)
  components/                  DailyArc gauge, Card, StatCard, WeekBars, Pill, QuickAddSheet, ScreenHeader
  screens/
    OnboardingScreen.js         First-run profile setup
    HomeScreen.js                Dashboard: Daily Arc + stat grid + quick add
    WaterScreen.js                Water log + weekly chart
    ActivityScreen.js             Steps log + distance/calorie estimate
    SleepScreen.js                 Sleep log + quality rating
    ProfileScreen.js               Profile, BMI, goals, weight log, settings, clear data
  utils/
    dateUtils.js                Day-key grouping, weekly bucket helpers
    healthCalculations.js       BMI, calorie/distance estimates
    pedometer.js                 Cross-platform live step-count watcher (expo-sensors)
    stepsOffset.js                Tracks the "reset point" for auto-tracked steps
```

## How data flows

1. Every screen reads/writes through `useHealth()` (`src/store/healthStore.js`),
   never through `expo-sqlite` directly.
2. The store calls the functions in `src/storage/storage.js`, which is the
   only place `expo-sqlite` is opened/queried. Migrations run once per app
   launch via `runMigrations()`.
3. Each log type (`water`, `sleep`, `steps`, `weight`) lives in its own table
   (`water_logs`, `sleep_logs`, `steps_logs`, `weight_logs`), each row shaped
   `{ id, timestamp, ...fields }`, generated through one generic `logTable()`
   helper rather than one-off query functions per table.
4. `profile` and `settings` are single-row tables holding goals (`stepsGoal`,
   `waterGoalMl`, `sleepGoalHours`) and personal info (name, age, height, weight).
5. Steps have a manual path (`addSteps`) and an automatic path
   (`syncAutoSteps`, driven by the device pedometer) that both write into the
   same `steps_logs` table — the auto entry is just one upserted row per day.

## Extending it

- **Reminders**: the Profile screen already has a "Reminders" toggle wired to
  settings; hook it up to `expo-notifications` to schedule local pushes.
- **Nutrition/food log**: add a `foodStore` in `storage.js` the same way
  `waterStore` is defined (via `logTable()`), plus a screen following the
  Water screen's pattern.
- **Charts**: `WeekBars` is a plain-View bar chart and `DailyArc` is hand-drawn
  SVG — no charting library dependency. Swap either out if you want richer
  visuals later.

## Data & privacy notes

- No analytics, no network calls, no third-party SDKs.
- "Clear all local data" on the Profile screen wipes every SQLite table used
  by the app (`clearAllData()` in `storage.js`).

## License

All rights reserved — see [`LICENSE`](./LICENSE). This repository is public
for portfolio/demonstration purposes; it is not open source and reuse,
modification, or redistribution is not permitted without permission.
