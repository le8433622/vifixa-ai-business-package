// Admin Stack
// Per 15_CODEX_BUSINESS_CONTEXT.md - Admin flow

import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="users" />
      <Stack.Screen name="workers" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="ai-logs" />
    </Stack>
  );
}
