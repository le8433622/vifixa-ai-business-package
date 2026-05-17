import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WorkerLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#059669',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="map" options={{
        title: 'Bản đồ',
        tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
      }} />
      <Tabs.Screen name="jobs/index" options={{
        title: 'Việc làm',
        tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
      }} />
      <Tabs.Screen name="earnings" options={{
        title: 'Thu nhập',
        tabBarIcon: ({ color, size }) => <Ionicons name="cash" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Hồ sơ',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
