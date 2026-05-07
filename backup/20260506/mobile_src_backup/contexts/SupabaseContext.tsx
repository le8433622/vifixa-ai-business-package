// Supabase Context for Mobile App
// Per Step 4: Mobile Foundation - Supabase Integration

import React from 'react';
import { supabase } from '../lib/supabase';

interface SupabaseContextType {
  supabase: typeof supabase;
}

export const SupabaseContext = React.createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = React.useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
