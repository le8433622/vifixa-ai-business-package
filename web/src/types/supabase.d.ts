// Beehive type declarations for Supabase
// Tạm thời cho phép Supabase queries không cần generated types

import { SupabaseClient } from '@supabase/supabase-js'

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from(table: string): any
  }
}
