# Marketplace mobile

An Expo mobile client for browsing Facebook Marketplace, saving listings, and creating search alerts.

## Run

```sh
npm install
npm start
```

Scan the QR code with Expo Go, or press `a` or `i` for Android or iOS. Live Marketplace results and background alerts require a native development or release build.

## Facebook account

Open the account sheet from the header and continue with Facebook. Sign-in happens on Facebook's page, including checkpoints and two-factor authentication when required.

Sign-in data is stored in the device's encrypted SecureStore. Logging out removes it from this app without logging out other Facebook apps or browsers.

## Included flows

- Browse and search live Marketplace listings
- Apply category, distance, price, and pickup filters
- Open live listing details and continue on Facebook
- Save listings for later
- Create and remove real Facebook Marketplace saved-search alerts
- Check Marketplace notifications when the app opens or resumes
- Poll for new Marketplace notifications with Android WorkManager, with a minimum interval of about 15 minutes
- Deliver deduplicated local device notifications for new Facebook results
- Persist saved listings and alerts on the device
