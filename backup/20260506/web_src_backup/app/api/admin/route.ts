// Admin API Route - Handle all admin operations
// Per 21_API_SPECIFICATION.md - Web APIs for admin

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client
function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const serverClient = createServerClient();
    
    // Verify admin
    const { data: { user }, error: authError } = await serverClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Handle different actions
    switch (action) {
      case 'workers':
        const { data: workers, error: workersError } = await serverClient
          .from('workers')
          .select('*, profiles(email, phone)')
          .order('created_at', { ascending: false });
        
        if (workersError) throw workersError;
        return NextResponse.json({ workers });
        
      case 'orders':
        const { data: orders, error: ordersError } = await serverClient
          .from('orders')
          .select('*, profiles(email), workers(user_id, profiles(email))')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (ordersError) throw ordersError;
        return NextResponse.json({ orders });
        
      case 'disputes':
        const { data: disputes, error: disputesError } = await serverClient
          .from('orders')
          .select('*, profiles(email)')
          .in('status', ['disputed', 'cancelled'])
          .order('created_at', { ascending: false });
        
        if (disputesError) throw disputesError;
        return NextResponse.json({ disputes });
        
      case 'ai-logs':
        const { data: logs, error: logsError } = await serverClient
          .from('ai_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (logsError) throw logsError;
        return NextResponse.json({ logs });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const serverClient = createServerClient();
    const body = await request.json();
    const { action } = body;
    
    // Verify admin
    const { data: { user }, error: authError } = await serverClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Handle different actions
    switch (action) {
      case 'verify-worker':
        const { user_id, is_verified } = body;
        const { error } = await serverClient
          .from('workers')
          .update({ is_verified })
          .eq('user_id', user_id);
        
        if (error) throw error;
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
