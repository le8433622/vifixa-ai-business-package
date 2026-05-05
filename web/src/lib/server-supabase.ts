// Supabase Server Client Utility
// Per 21_API_SPECIFICATION.md - Server-side Supabase client

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables for server client');
}

// Server-side client with service role key
export const serverClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to get user from session
export async function getUserFromSession(accessToken: string): Promise<User | null> {
  const { data, error } = await serverClient.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export type { User };
