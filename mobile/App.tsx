// Main App entry point
// Per 15_CODEX_BUSINESS_CONTEXT.md - Mobile Stack

import { StatusBar } from 'expo-status-bar';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import RootLayout from './src/app/_layout';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <RootLayout />
        <StatusBar style="auto" />
      </SupabaseProvider>
    </QueryClientProvider>
  );
}
