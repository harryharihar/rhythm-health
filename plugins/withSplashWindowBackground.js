const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

// Without an explicit windowBackground, the gap between the OS splash screen
// dismissing and React Native's first paint falls back to the theme's
// default (light) background, showing a white flash. expo-splash-screen's
// generated styles.xml doesn't set this on its own.
module.exports = function withSplashWindowBackground(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.DayNight.NoActionBar' },
      name: 'android:windowBackground',
      value: '@color/splashscreen_background',
    });
    return config;
  });
};
