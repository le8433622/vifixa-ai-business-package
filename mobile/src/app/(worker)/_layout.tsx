// Worker Stack
// Per 15_CODEX_BUSINESS_CONTEXT.md - Worker flow

import { Stack } from 'expo-router';

export default function WorkerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="jobs/[id]" />
      <Stack.Screen name="history" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="coach" />
      <Stack.Screen name="trust" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
