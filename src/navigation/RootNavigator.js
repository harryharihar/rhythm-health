import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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

function TabIcon({ name, focused, accent, color }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: `${accent}22` }, focused && glow(accent, 10, 0.5)]}>
      <Ionicons name={focused ? ICONS[name] : `${ICONS[name]}-outline`} size={18} color={color} />
    </View>
  );
}

export default function RootNavigator() {
  const colors = useThemeColors();
  const isDark = useHealthStore((s) => s.settings.darkMode);

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
            height: 86,
            paddingTop: 10,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={route.name} focused={focused} accent={tabAccent[route.name]} color={color} />
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
