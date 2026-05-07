// Customer Tabs - AI-Centric Design
// Per user request: AI as centerpiece, Chat AI in middle tab

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CustomerLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: { 
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      headerShown: false,
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Trang chủ', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Chat AI', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
          tabBarBadge: 'NEW', // Remove after 1 month
        }} 
      />
      <Tabs.Screen 
        name="orders/index" 
        options={{ 
          title: 'Đơn hàng', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Tài khoản', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}
