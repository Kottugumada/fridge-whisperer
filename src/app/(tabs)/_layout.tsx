import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0C1018',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: Platform.OS === 'ios' ? 92 : 80,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#2CFF7A',
        tabBarInactiveTintColor: '#6E778A',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Mic' }} />
      <Tabs.Screen name="cookbook" options={{ title: 'Cookbook' }} />
    </Tabs>
  );
}

