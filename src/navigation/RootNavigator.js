import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ActivityScreen from '../screens/ActivityScreen';
import WaterScreen from '../screens/WaterScreen';
import SleepScreen from '../screens/SleepScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors, glow } from '../theme/theme';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: '🏠',
  Activity: '👣',
  Water: '💧',
  Sleep: '🌙',
  Profile: '👤',
};

const TAB_ACCENT = {
  Home: colors.primary,
  Activity: colors.steps,
  Water: colors.water,
  Sleep: colors.sleep,
  Profile: colors.primary,
};

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bgElevated, border: colors.border },
};

function TabIcon({ name, focused }) {
  const accent = TAB_ACCENT[name];
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: `${accent}22` }, focused && glow(accent, 10, 0.5)]}>
      <Text style={{ fontSize: 17, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
    </View>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: TAB_ACCENT[route.name],
          tabBarInactiveTintColor: colors.inkFaint,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 86,
            paddingTop: 10,
          },
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Water" component={WaterScreen} />
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
