// Root Layout for Mobile App
// Per Step 4: Mobile Foundation - Expo Router

import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(customer)/_layout" options={{ headerShown: false }} />
      <Stack.Screen name="(worker)/_layout" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)/_layout" options={{ headerShown: false }} />
    </Stack>
  );
}
