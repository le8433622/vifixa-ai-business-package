import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#818cf8',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8, backgroundColor: '#111827', borderTopColor: '#1f2937' },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Dashboard',
        tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
      }} />
      <Tabs.Screen name="users/index" options={{
        title: 'Users',
        tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
      }} />
      <Tabs.Screen name="orders/index" options={{
        title: 'Orders',
        tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
      }} />
      <Tabs.Screen name="disputes" options={{
        title: 'Disputes',
        tabBarIcon: ({ color, size }) => <Ionicons name="scale" size={size} color={color} />,
      }} />
      <Tabs.Screen name="integrations" options={{
        title: 'Integrations',
        tabBarIcon: ({ color, size }) => <Ionicons name="puzzle" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
