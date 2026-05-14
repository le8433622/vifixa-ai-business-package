// Admin Stack — tất cả màn hình quản trị
import { Stack } from 'expo-router'

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="workers" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="wallets" />
      <Stack.Screen name="payouts" />
      <Stack.Screen name="ai-logs" />
      <Stack.Screen name="ai/index" />
      <Stack.Screen name="ai/cost" />
      <Stack.Screen name="ai/accuracy" />
      <Stack.Screen name="ai/feedback" />
      <Stack.Screen name="ai/monitor" />
      <Stack.Screen name="ai/analytics" />
      <Stack.Screen name="ai/abtests" />
      <Stack.Screen name="ai/upsell" />
      <Stack.Screen name="ai/retention" />
      <Stack.Screen name="ai/revenue" />
      <Stack.Screen name="ai/search" />
      <Stack.Screen name="ai/autopilot" />
    </Stack>
  )
}