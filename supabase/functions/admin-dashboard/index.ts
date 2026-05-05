// Admin Dashboard Edge Function
// Per 21_API_SPECIFICATION.md - Dashboard, users, workers, disputes
// Per 05_PRODUCT_SOLUTION.md - Admin flow

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify admin role
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const profile = await profileResponse.json();

    if (!profile[0] || profile[0].role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'dashboard') {
      // Get dashboard stats
      const [usersRes, workersRes, ordersRes, aiLogsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Accept': 'application/json' },
        }),
        fetch(`${supabaseUrl}/rest/v1/workers?select=count`, {
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Accept': 'application/json' },
        }),
        fetch(`${supabaseUrl}/rest/v1/orders?select=count`, {
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Accept': 'application/json' },
        }),
        fetch(`${supabaseUrl}/rest/v1/ai_logs?select=count`, {
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Accept': 'application/json' },
        }),
      ]);

      const [users, workers, orders, aiLogs] = await Promise.all([
        usersRes.json(),
        workersRes.json(),
        ordersRes.json(),
        aiLogsRes.json(),
      ]);

      return new Response(
        JSON.stringify({
          stats: {
            total_users: users.count || 0,
            total_workers: workers.count || 0,
            total_orders: orders.count || 0,
            total_ai_calls: aiLogs.count || 0,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'users') {
      const usersResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const users = await usersResponse.json();
      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'workers') {
      const workersResponse = await fetch(
        `${supabaseUrl}/rest/v1/workers?select=*,profiles(email,phone)&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const workers = await workersResponse.json();
      return new Response(
        JSON.stringify({ workers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'orders') {
      const ordersResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?select=*,profiles(email)&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const orders = await ordersResponse.json();
      return new Response(
        JSON.stringify({ orders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disputes') {
      const disputesResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?status=eq.disputed&select=*,profiles(email)`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const disputes = await disputesResponse.json();
      return new Response(
        JSON.stringify({ disputes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'ai-logs') {
      const logsResponse = await fetch(
        `${supabaseUrl}/rest/v1/ai_logs?select=*&order=created_at.desc&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const logs = await logsResponse.json();
      return new Response(
        JSON.stringify({ logs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
