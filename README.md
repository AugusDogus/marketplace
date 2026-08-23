# Marketplace mobile

An Expo mobile client that signs in through an embedded Facebook page, then makes authenticated Marketplace requests directly from iOS or Android. It does not use a local proxy server.

## Run

```sh
npm install
npm start
```

Scan the QR code with Expo Go, or press `a` or `i` for Android or iOS. The web preview can show the interface, but browsers block the direct Facebook requests with CORS. Background alert checks require a native development or release build.

## Facebook session

Open the account sheet from the header, then either:

- Continue to Facebook's real login page inside the app. Facebook handles credentials, encryption, checkpoints, and two-factor authentication. After authentication, the app reads the embedded browser's native cookie store and closes the login page.
- Import an authenticated Facebook HAR, including `login www.facebook.com.har`. The app finds the post-login Marketplace request and extracts its request profile and cookies.

Session cookies are kept in the device's encrypted SecureStore. The HAR is read from the document picker and is not copied into this repository. Logging out deletes the saved session from this app. It does not log out other Facebook apps or browsers.

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

Facebook may require a checkpoint or two-factor challenge. Complete that in a browser, export a fresh authenticated HAR, then import it in the app.
