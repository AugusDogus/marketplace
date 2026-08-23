# Marketplace

An Android-focused Expo app for browsing Facebook Marketplace without installing the Facebook app. It loads live listings, supports Marketplace search and filters, saves listings locally, and can surface Facebook saved-search matches as device notifications.

This is an unofficial personal project. It is not affiliated with Meta or Facebook, and it relies on undocumented Facebook web interfaces that may change without notice.

## Features

- Live Marketplace results with load-on-scroll pagination
- Search with debounced network requests
- Location autocomplete and distance, category, price, and pickup filters
- Listing details and saved listings
- Facebook saved-search alerts
- Local notifications for new Marketplace matches
- Device-local Facebook session and app state

Marketplace messaging is not included.

## Authentication and data flow

Sign-in opens `facebook.com` in an in-app browser. Credentials are submitted directly to Facebook. After Facebook finishes signing in, the app captures the resulting session cookies and stores them with Expo SecureStore.

Marketplace requests go directly from the device to Facebook. There is no project backend or proxy. Logging out deletes the SecureStore session and clears the in-app browser's cookie store.

## Requirements

- Node.js and npm
- Bun, for the test suite
- An Android SDK and either an emulator or an Android device
- A Facebook account with Marketplace access

Expo Go is not supported because the app uses native cookie, notification, background-task, and bottom-sheet dependencies.

## Development

Install dependencies and create a native development build:

```sh
npm install
npm run android
```

After the native app is installed, start Metro for later development sessions with:

```sh
npm start
```

Useful checks:

```sh
npm run typecheck
npm test
npm run doctor
```

## Build an APK

Generate a clean Android project and build a release APK with the JavaScript bundle embedded:

```sh
npx expo prebuild --platform android --clean --no-install
NODE_ENV=production ./android/gradlew -p android :app:assembleRelease
```

The APK is written to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The generated `android/` directory is intentionally ignored. Native configuration belongs in `app.json` and Expo config plugins so a clean prebuild remains reproducible.

## Project layout

```text
src/components/      Reusable native UI
src/screens/         Browse, saved, alerts, and listing detail screens
src/facebook/        Session handling, Facebook requests, and response parsing
src/notifications/   Background polling and local notification delivery
src/domain/          Marketplace domain types and filtering logic
```

## Limitations

- Facebook can change its login flow, request parameters, or response shapes at any time.
- Background checks are scheduled by Android and are not guaranteed to run exactly every 15 minutes.
- Local notifications reflect Facebook Marketplace notifications, not an independent server-side listing monitor.
- The current release workflow has been tested on Android, not iOS.
