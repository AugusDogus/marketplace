import { readFile, writeFile } from 'node:fs/promises';

const buildGradlePath = 'android/app/build.gradle';

const replaceExactlyOnce = (source, expected, replacement, description) => {
  const firstMatch = source.indexOf(expected);
  if (firstMatch < 0 || source.indexOf(expected, firstMatch + expected.length) >= 0) {
    throw new Error(`Expo generated an unexpected Android project. Could not configure ${description}.`);
  }
  return source.replace(expected, replacement);
};

const replacePatternExactlyOnce = (source, pattern, replacement, description) => {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expo generated an unexpected Android project. Could not configure ${description}.`);
  }
  return source.replace(pattern, replacement);
};

let buildGradle = await readFile(buildGradlePath, 'utf8');

buildGradle = replacePatternExactlyOnce(
  buildGradle,
  /^        versionCode \d+\n        versionName "[^"\n]+"$/gm,
  `        versionCode Integer.parseInt(System.getenv('MARKETPLACE_VERSION_CODE') ?: '1')
        versionName (System.getenv('MARKETPLACE_VERSION_NAME') ?: "1.0.0")`,
  'release versioning',
);

buildGradle = replaceExactlyOnce(
  buildGradle,
  `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
  `    signingConfigs {
        release {
            def keystoreFile = System.getenv('ANDROID_KEYSTORE_FILE')
            def keystorePassword = System.getenv('ANDROID_KEYSTORE_PASSWORD')
            def keyAliasValue = System.getenv('ANDROID_KEY_ALIAS')
            def keyPasswordValue = System.getenv('ANDROID_KEY_PASSWORD')
            if ([keystoreFile, keystorePassword, keyAliasValue, keyPasswordValue].any { !it }) {
                throw new GradleException('Android release signing environment is incomplete.')
            }
            storeFile file(keystoreFile)
            storePassword keystorePassword
            keyAlias keyAliasValue
            keyPassword keyPasswordValue
        }
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
  'release signing credentials',
);

buildGradle = replaceExactlyOnce(
  buildGradle,
  `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
  `        release {
            signingConfig signingConfigs.release`,
  'the release signing config',
);

await writeFile(buildGradlePath, buildGradle);
