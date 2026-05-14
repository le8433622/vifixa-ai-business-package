// 🏗️ V4 Mobile Layout — 3 tabs: Map + Chat + Dashboard
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function V4Layout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Bản đồ',
        tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
      }} />
      <Tabs.Screen name="chat" options={{
        title: 'Chat AI',
        tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
      }} />
      <Tabs.Screen name="dashboard" options={{
        title: 'Tổng quan',
        tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
      }} />
    </Tabs>
  )
}