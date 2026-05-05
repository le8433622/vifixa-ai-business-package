// Supabase client for web app
// Per 15_CODEX_BUSINESS_CONTEXT.md - Tech stack: Supabase + Next.js

import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid module-level errors in Next.js 16 SSR/prerender
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

export function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _supabaseClient;
}

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  }
});

// Server-side client with service role for admin operations
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
