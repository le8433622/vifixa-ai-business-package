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
        title: 'Người dùng',
        tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
      }} />
      <Tabs.Screen name="orders/index" options={{
        title: 'Đơn hàng',
        tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
      }} />
      <Tabs.Screen name="kyc/index" options={{
        title: 'KYC',
        tabBarIcon: ({ color, size }) => <Ionicons name="id-card" size={size} color={color} />,
      }} />
      <Tabs.Screen name="payments/index" options={{
        title: 'Thanh toán',
        tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
      }} />
      <Tabs.Screen name="disputes" options={{
        title: 'Khiếu nại',
        tabBarIcon: ({ color, size }) => <Ionicons name="scale" size={size} color={color} />,
      }} />
      <Tabs.Screen name="settings/index" options={{
        title: 'Cài đặt',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
