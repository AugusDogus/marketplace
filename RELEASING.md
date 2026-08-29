# Releasing

Pushing a semantic version tag builds a signed APK and publishes it as a GitHub release.

## One-time signing setup

Generate a release signing key:

```sh
keytool -genkeypair -v \
  -storetype JKS \
  -keystore marketplace-release.keystore \
  -alias marketplace \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Back up the keystore and its passwords somewhere secure. Losing them means future APKs cannot update existing installations.

Add the key and its credentials to GitHub Actions:

```sh
base64 -w 0 marketplace-release.keystore | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS
gh secret set ANDROID_KEY_PASSWORD
```

The last three commands prompt for the keystore password, `marketplace`, and the key password respectively.

## Publish a release

Create and push a `vMAJOR.MINOR.PATCH` tag:

```sh
git tag v1.0.0
git push origin v1.0.0
```

The workflow derives the app version from the tag, builds and verifies the signed APK, generates a SHA-256 checksum, and publishes both files to the matching GitHub release.
