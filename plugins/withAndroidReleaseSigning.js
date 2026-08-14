const { withAppBuildGradle } = require('expo/config-plugins');

// Adds a `release` signingConfig that reads the keystore from environment
// variables (set by CI) instead of hardcoding secrets into the repo. Falls
// back to the debug keystore when those env vars aren't set, so local
// `./gradlew assembleRelease` still works without needing the real keystore.
const RELEASE_SIGNING_BLOCK = `
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('ANDROID_KEYSTORE_PATH')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {${RELEASE_SIGNING_BLOCK}`
    );
    config.modResults.contents = config.modResults.contents.replace(
      /release\s*\{\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
      (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
    );
    return config;
  });
};
