// Main App entry point
// Per 15_CODEX_BUSINESS_CONTEXT.md - Mobile Stack

import { StatusBar } from 'expo-status-bar';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import RootLayout from './src/app/_layout';
import { usePushNotifications } from './src/hooks/usePushNotifications';

function AppContent() {
  usePushNotifications()
  return <RootLayout />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <AppContent />
        <StatusBar style="auto" />
      </SupabaseProvider>
    </QueryClientProvider>
  );
}
