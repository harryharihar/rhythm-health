import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import ActivityScreen from '../screens/ActivityScreen';
import NutritionScreen from '../screens/NutritionScreen';
import SleepScreen from '../screens/SleepScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { glow } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { useHealthStore } from '../store/healthStore';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: 'home',
  Activity: 'pulse',
  Nutrition: 'nutrition',
  Sleep: 'moon',
  Profile: 'person',
};

function TabIcon({ name, focused, accent, onAccent, color }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: accent }, focused && glow(accent, 8, 0.5)]}>
      <Ionicons name={focused ? ICONS[name] : `${ICONS[name]}-outline`} size={18} color={focused ? onAccent : color} />
    </View>
  );
}

export default function RootNavigator() {
  const colors = useThemeColors();
  const isDark = useHealthStore((s) => s.settings.darkMode);
  const insets = useSafeAreaInsets();
  // Some OEM skins (confirmed on a Realme/ColorOS device in gesture-nav mode)
  // report insets.bottom as 0 even though the system still reserves a
  // gesture-hint zone at the bottom of the screen. With no inset, our tab
  // bar drew flush to the edge and the OS drew its own gesture indicator
  // directly across the tab labels. Flooring the inset guarantees clearance
  // even when the real inset is under-reported.
  const tabBarBottomInset = Math.max(insets.bottom, 16);

  const tabAccent = {
    Home: colors.primary,
    Activity: colors.steps,
    Nutrition: colors.water,
    Sleep: colors.sleep,
    Profile: colors.primary,
  };

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.bg, card: colors.bgElevated, border: colors.border } };
  }, [isDark, colors]);

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: tabAccent[route.name],
          tabBarInactiveTintColor: colors.inkFaint,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            // Fixed height with no inset awareness left the labels sitting
            // behind the system nav bar on 3-button-nav Android devices —
            // the tab bar's own background needs to extend into that space
            // (paddingBottom) while the actual icons/labels stay above it.
            height: 58 + tabBarBottomInset,
            paddingTop: 10,
            paddingBottom: tabBarBottomInset,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={route.name} focused={focused} accent={tabAccent[route.name]} onAccent={colors.onAccent} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Nutrition" component={NutritionScreen} />
        <Tab.Screen name="Sleep" component={SleepScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
