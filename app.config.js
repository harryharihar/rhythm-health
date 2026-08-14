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
    },
    android: {
      adaptiveIcon: {
        backgroundColor: ENV.adaptiveIconBg,
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['ACTIVITY_RECOGNITION'],
      package: ENV.bundleId,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
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
    ],
  },
};
