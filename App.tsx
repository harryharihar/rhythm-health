import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHealth, useHealthStore } from './src/store/healthStore';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import AppLoader from './src/components/AppLoader';
import { useThemeColors } from './src/theme/useTheme';
import { initNotifications } from './src/notifications/setup';

function Gate() {
  const { loading, profile, settings } = useHealth();
  const colors = useThemeColors();
  const [showLoader, setShowLoader] = useState(true);
  const loaderOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Android notification channels must exist before initialize() schedules
    // any reminders against them, so this has to resolve first.
    (async () => {
      await initNotifications();
      await useHealthStore.getState().initialize();
    })();
    return () => useHealthStore.getState().teardown();
  }, []);

  useEffect(() => {
    // Dissolve the animated loader into the real content rather than
    // cutting away instantly — the app underneath is already mounted and
    // ready by the time this fires, so the fade reveals it directly.
    if (!loading) {
      Animated.timing(loaderOpacity, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => setShowLoader(false));
    }
  }, [loading]);

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      {!loading && (profile ? <RootNavigator /> : <OnboardingScreen />)}
      {showLoader && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: loaderOpacity }]} pointerEvents={loading ? 'auto' : 'none'}>
          <AppLoader colors={colors} />
        </Animated.View>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Gate />
    </SafeAreaProvider>
  );
}
