import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHealth, useHealthStore } from './src/store/healthStore';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { useThemeColors } from './src/theme/useTheme';
import { initNotifications } from './src/notifications/setup';

function Gate() {
  const { loading, profile, settings } = useHealth();
  const colors = useThemeColors();

  useEffect(() => {
    useHealthStore.getState().initialize();
    return () => useHealthStore.getState().teardown();
  }, []);

  useEffect(() => {
    initNotifications();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      {profile ? <RootNavigator /> : <OnboardingScreen />}
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
