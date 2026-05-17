import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Trang chủ',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="map" options={{
        title: 'Bản đồ',
        tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
      }} />
      <Tabs.Screen name="orders/index" options={{
        title: 'Đơn hàng',
        tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
      }} />
      <Tabs.Screen name="devices" options={{
        title: 'Thiết bị',
        tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Tài khoản',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
