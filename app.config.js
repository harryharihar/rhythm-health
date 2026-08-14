// Dynamic config so one codebase produces two installable variants:
// APP_ENV=dev   -> "PocketVitals Dev", orange icon, .dev bundle id
// APP_ENV=production (default) -> "PocketVitals", green icon, real bundle id
// Both can be installed on the same device at once since their bundle ids
// differ, which is the whole point of a separate Dev/UAT testing app.
const APP_ENV = process.env.APP_ENV === 'dev' ? 'dev' : 'production';

const ENV = {
  production: {
    name: 'PocketVitals',
    bundleId: 'com.harryharihar.pocketvitals',
    icon: './assets/icon.png',
    adaptiveIconBg: '#2FEFAA',
  },
  dev: {
    name: 'PocketVitals Dev',
    bundleId: 'com.harryharihar.pocketvitals.dev',
    icon: './assets/icon-dev.png',
    adaptiveIconBg: '#FF7A45',
  },
}[APP_ENV];

module.exports = {
  expo: {
    name: ENV.name,
    slug: 'pocketvitals',
    version: '1.0.0',
    orientation: 'portrait',
    icon: ENV.icon,
    userInterfaceStyle: 'automatic',
    extra: {
      appEnv: APP_ENV,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: ENV.bundleId,
      // Set by CI to the workflow's run number (always increasing) so every
      // release build gets a strictly higher build number than the last —
      // required for an update to install over an existing one. Falls back
      // to a fixed value for local builds, where that doesn't matter.
      buildNumber: process.env.IOS_BUILD_NUMBER || '1',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: ENV.adaptiveIconBg,
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['ACTIVITY_RECOGNITION'],
      package: ENV.bundleId,
      // Same idea as ios.buildNumber above, via CI's run number.
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || '1', 10),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      // Registered before expo-notifications: Expo's mod compiler runs
      // same-type mods in the reverse of plugin registration order, so this
      // has to come first in the array to actually run after
      // expo-notifications adds the aps-environment entitlement.
      './plugins/withoutPushEntitlement',
      [
        'expo-sensors',
        {
          motionPermission: `Allow ${ENV.name} to count your steps automatically.`,
        },
      ],
      'expo-sqlite',
      [
        '@kingstinct/react-native-healthkit',
        {
          NSHealthShareUsageDescription: `${ENV.name} reads heart rate, exercise minutes, and sleep data from Health to show them on your dashboard. This data never leaves your device.`,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: ENV.adaptiveIconBg,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0A0C0F',
        },
      ],
      './plugins/withNodeBinaryFix',
      './plugins/withAndroidReleaseSigning',
      './plugins/withSplashWindowBackground',
    ],
  },
};
