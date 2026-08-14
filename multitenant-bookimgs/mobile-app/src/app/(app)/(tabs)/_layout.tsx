import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Brand } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      // Default (true on every platform) detaches inactive tab screens from
      // the native view tree; re-attaching on tab-back is a known source of
      // content (esp. Text) staying blank until something forces a repaint —
      // exactly the "chips with no name after switching tabs" symptom.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.brand,
        tabBarInactiveTintColor: Brand.text3,
        // react-native-screens freezes a screen's subtree (via react-freeze)
        // the moment it's considered blurred — including the brief instant
        // during a tab's own initial focus transition. That freeze can swap
        // live children for a blank frame, matching "renders the label then
        // it disappears" exactly. Disabling it trades a little re-render
        // perf for correctness, which matters more for this app.
        freezeOnBlur: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="services"
        options={{ title: 'Services', tabBarIcon: ({ color, size }) => <Feather name="tag" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="availability"
        options={{ title: 'Availability', tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
