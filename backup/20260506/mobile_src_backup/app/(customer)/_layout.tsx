// Customer Stack
// Per 15_CODEX_BUSINESS_CONTEXT.md - Customer flow

import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="service-request" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="orders/[id]/review" />
      <Stack.Screen name="warranty" />
      <Stack.Screen name="complaint" />
    </Stack>
  );
}
