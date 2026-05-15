// 🧠 Vifixa AI Companion Memory Edge Function
// Retrieves user memories as specified in docs/COMPANION.md

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

interface CompanionMemoryRequest {
  user_id: string;
  category?: string;
}

interface CompanionMemoryResponse {
  memories: Array<{
    key: string;
    value: string;
    category: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse query parameters
    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get('user_id');
    const category = url.searchParams.get('category');

    if (!requestedUserId) {
      return jsonResponse({ error: 'Missing user_id parameter' }, 400);
    }

    // Verify the user can only access their own memories
    if (requestedUserId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Initialize Supabase client with service role for backend operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('companion_memories')
      .select('key, value, category')
      .eq('user_id', requestedUserId);

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Exclude expired memories (where expires_at is in the past) unless expires_at is null
    query = query
      .is('expires_at', null)
      .or('expires_at.gt.', new Date().toISOString());

    // Order by creation time (newest first)
    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: memories, error } = await query;

    if (error) {
      console.error('Error fetching memories:', error);
      return jsonResponse({ error: 'Failed to fetch memories' }, 500);
    }

    // Format response as per spec
    const response: CompanionMemoryResponse = {
      memories: memories || []
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('Companion memory error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});