// 🧠 Vifixa AI Companion Memory Edge Function
// Retrieves and stores user memories as specified in docs/COMPANION.md

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

interface CompanionMemoryStoreRequest {
  user_id: string;
  key: string;
  value: string;
  category: string;
  importance?: number;
  expires_at?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  // Handle GET requests (retrieve memories)
  if (req.method === 'GET') {
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
  }

  // Handle POST requests (store memories)
  if (req.method === 'POST') {
    try {
      // Verify authentication
      const user = await verifyAuth(req);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      // Parse request body
      let body: CompanionMemoryStoreRequest;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
      }

      const { user_id, key, value, category, importance = 1, expires_at } = body;
      
      if (!user_id || !key || value === undefined || !category) {
        return jsonResponse({ error: 'Missing required fields' }, 400);
      }

      // Verify the user can only store their own memories
      if (user_id !== user.id) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Initialize Supabase client with service role for backend operations
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

      // Store the memory
      const { data, error } = await supabase
        .from('companion_memories')
        .upsert({
          user_id,
          key,
          value,
          category,
          importance,
          expires_at: expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days
        }, { onConflict: ['user_id', 'key'] });

      if (error) {
        console.error('Error storing memory:', error);
        return jsonResponse({ error: 'Failed to store memory' }, 500);
      }

      return jsonResponse({ success: true, data });
    } catch (error) {
      console.error('Companion memory error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  }

  // Handle unsupported methods
  return jsonResponse({ error: 'Method not allowed' }, 405);
});