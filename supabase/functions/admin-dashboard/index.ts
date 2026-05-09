// Admin Dashboard Edge Function
// Per 21_API_SPECIFICATION.md - Dashboard, users, workers, disputes
// Per 05_PRODUCT_SOLUTION.md - Admin flow

import { corsHeaders } from '../_shared/cors.ts';


type ApprovalStatus = 'approved' | 'rejected' | 'executed';

type ApprovalPayload = {
  category?: string;
  description?: string;
  location?: unknown;
  urgency?: string;
  preferred_time?: string;
  media_urls?: string[];
  quote?: { estimated_price?: number; confidence?: number; price_breakdown?: unknown; disclaimer?: string };
};

type AIActionRequest = {
  id: string;
  request_id: string;
  session_id?: string;
  order_id?: string;
  user_id: string;
  action_type: string;
  action_payload?: ApprovalPayload;
  status: string;
  approval_mode: string;
  decision_reason: string;
  metadata?: Record<string, unknown>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function restJson(supabaseUrl: string, serviceRoleKey: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${serviceRoleKey}`);
  headers.set('apikey', serviceRoleKey);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(typeof data?.message === 'string' ? data.message : text || `REST request failed: ${response.status}`);
  }
  return data;
}

function buildApprovalPatch(adminId: string, status: ApprovalStatus, previousMetadata?: Record<string, unknown>, note?: string) {
  const now = new Date().toISOString();
  return {
    status,
    approved_by: adminId,
    approved_at: now,
    ...(status === 'executed' ? { executed_at: now } : {}),
    metadata: {
      ...(previousMetadata || {}),
      ...(note ? { admin_note: note } : {}),
    },
    updated_at: now,
  };
}

async function createOrderFromApprovalRequest(
  supabaseUrl: string,
  serviceRoleKey: string,
  request: AIActionRequest,
) {
  if (request.action_type !== 'create_order') {
    throw new Error(`Unsupported approval action: ${request.action_type}`);
  }

  if (request.order_id) return request.order_id;

  if (request.session_id) {
    const existingOrders = await restJson(
      supabaseUrl,
      serviceRoleKey,
      `orders?chat_session_id=eq.${encodeURIComponent(request.session_id)}&select=id&limit=1`,
    );
    if (existingOrders?.[0]?.id) return existingOrders[0].id as string;
  }

  const payload = request.action_payload || {};
  if (!payload.category || !payload.description || !payload.location) {
    throw new Error('Approval payload is missing category, description, or location');
  }

  const estimatedPrice = Number(payload.quote?.estimated_price || 0);
  const orderPayload: Record<string, unknown> = {
    customer_id: request.user_id,
    category: payload.category,
    description: payload.description,
    media_urls: payload.media_urls || [],
    ai_diagnosis: {
      source: 'ai_chat_approval_queue',
      approval_request_id: request.id,
      decision_reason: request.decision_reason,
      urgency: payload.urgency || null,
      preferred_time: payload.preferred_time || null,
      location: payload.location,
      quote: payload.quote || null,
      metadata: request.metadata || {},
    },
    estimated_price: estimatedPrice,
    status: 'pending',
  };

  if (request.session_id) orderPayload.chat_session_id = request.session_id;

  const createdOrders = await restJson(
    supabaseUrl,
    serviceRoleKey,
    'orders?select=id',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(orderPayload),
    },
  );

  const orderId = createdOrders?.[0]?.id;
  if (!orderId) throw new Error('Order creation returned no order id');
  return orderId as string;
}

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
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to verify admin role: ${profileResponse.status}`, detail: errText.slice(0, 200) }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const restHeaders = { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey, 'Accept': 'application/json' };
      const [usersRes, workersRes, ordersRes, aiLogsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, { headers: restHeaders }),
        fetch(`${supabaseUrl}/rest/v1/workers?select=count`, { headers: restHeaders }),
        fetch(`${supabaseUrl}/rest/v1/orders?select=count`, { headers: restHeaders }),
        fetch(`${supabaseUrl}/rest/v1/ai_logs?select=count`, { headers: restHeaders }),
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
            total_users: users[0]?.count ?? 0,
            total_workers: workers[0]?.count ?? 0,
            total_orders: orders[0]?.count ?? 0,
            total_ai_calls: aiLogs[0]?.count ?? 0,
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
            'apikey': serviceRoleKey,
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
            'apikey': serviceRoleKey,
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
            'apikey': serviceRoleKey,
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
            'apikey': serviceRoleKey,
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
            'apikey': serviceRoleKey,
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




    if (action === 'price-accuracy') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days') || '30'), 1), 365);
      const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateFilter = `day=gte.${since}`;

      const [daily, byCategory, recent] = await Promise.all([
        restJson(supabaseUrl, serviceRoleKey, `chat_price_accuracy_daily?${dateFilter}&select=*&order=day.desc`),
        restJson(supabaseUrl, serviceRoleKey, 'chat_price_accuracy_by_category?select=*&order=completed_chat_orders.desc,avg_mismatch_percent.desc&limit=25'),
        restJson(supabaseUrl, serviceRoleKey, `ai_price_feedback?created_at=gte.${since}&select=*,orders!ai_price_feedback_order_id_fkey(status,description)&order=created_at.desc&limit=50`),
      ]);

      const summary = (daily || []).reduce((acc: Record<string, number>, row: any) => {
        const completed = Number(row.completed_chat_orders || 0);
        acc.completed_chat_orders += completed;
        acc.accurate_orders += Number(row.accurate_orders || 0);
        acc.minor_mismatch_orders += Number(row.minor_mismatch_orders || 0);
        acc.moderate_mismatch_orders += Number(row.moderate_mismatch_orders || 0);
        acc.major_mismatch_orders += Number(row.major_mismatch_orders || 0);
        acc.weighted_mismatch_percent += Number(row.avg_mismatch_percent || 0) * completed;
        acc.weighted_abs_mismatch_amount += Number(row.avg_abs_mismatch_amount || 0) * completed;
        return acc;
      }, {
        completed_chat_orders: 0,
        accurate_orders: 0,
        minor_mismatch_orders: 0,
        moderate_mismatch_orders: 0,
        major_mismatch_orders: 0,
        weighted_mismatch_percent: 0,
        weighted_abs_mismatch_amount: 0,
      });

      const acceptableOrders = summary.accurate_orders + summary.minor_mismatch_orders;
      const completedOrders = summary.completed_chat_orders;

      return jsonResponse({
        days,
        since,
        summary: {
          completed_chat_orders: completedOrders,
          accurate_orders: summary.accurate_orders,
          minor_mismatch_orders: summary.minor_mismatch_orders,
          moderate_mismatch_orders: summary.moderate_mismatch_orders,
          major_mismatch_orders: summary.major_mismatch_orders,
          avg_mismatch_percent: completedOrders > 0 ? summary.weighted_mismatch_percent / completedOrders : 0,
          avg_abs_mismatch_amount: completedOrders > 0 ? summary.weighted_abs_mismatch_amount / completedOrders : 0,
          acceptable_accuracy_rate: completedOrders > 0 ? acceptableOrders / completedOrders : 0,
        },
        daily,
        by_category: byCategory,
        recent,
      });
    }

    if (action === 'chat-kpis') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days') || '30'), 1), 365);
      const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateFilter = `day=gte.${since}`;

      const [daily, dropoff, quoteAcceptance, fallbackRate] = await Promise.all([
        restJson(supabaseUrl, serviceRoleKey, `chat_funnel_daily?${dateFilter}&select=*&order=day.desc`),
        restJson(supabaseUrl, serviceRoleKey, `chat_dropoff_by_missing_slot?${dateFilter}&select=*&order=day.desc,occurrences.desc&limit=50`),
        restJson(supabaseUrl, serviceRoleKey, `chat_quote_acceptance?${dateFilter}&select=*&order=day.desc`),
        restJson(supabaseUrl, serviceRoleKey, `chat_ai_fallback_rate?${dateFilter}&select=*&order=day.desc`),
      ]);

      const totals = (daily || []).reduce((acc: Record<string, number>, row: any) => {
        acc.total_sessions += Number(row.total_sessions || 0);
        acc.started_sessions += Number(row.started_sessions || 0);
        acc.qualified_sessions += Number(row.qualified_sessions || 0);
        acc.quoted_sessions += Number(row.quoted_sessions || 0);
        acc.confirmation_shown_sessions += Number(row.confirmation_shown_sessions || 0);
        acc.confirmation_clicked_sessions += Number(row.confirmation_clicked_sessions || 0);
        acc.approval_requested_sessions += Number(row.approval_requested_sessions || 0);
        acc.order_created_sessions += Number(row.order_created_sessions || 0);
        acc.escalated_sessions += Number(row.escalated_sessions || 0);
        return acc;
      }, {
        total_sessions: 0,
        started_sessions: 0,
        qualified_sessions: 0,
        quoted_sessions: 0,
        confirmation_shown_sessions: 0,
        confirmation_clicked_sessions: 0,
        approval_requested_sessions: 0,
        order_created_sessions: 0,
        escalated_sessions: 0,
      });

      const fallbackTotals = (fallbackRate || []).reduce((acc: Record<string, number>, row: any) => {
        acc.total_sessions += Number(row.total_sessions || 0);
        acc.fallback_sessions += Number(row.fallback_sessions || 0);
        return acc;
      }, { total_sessions: 0, fallback_sessions: 0 });

      return jsonResponse({
        days,
        since,
        summary: {
          ...totals,
          chat_to_order_rate: totals.started_sessions > 0 ? totals.order_created_sessions / totals.started_sessions : 0,
          quote_to_confirm_rate: totals.quoted_sessions > 0 ? totals.confirmation_clicked_sessions / totals.quoted_sessions : 0,
          quote_to_order_rate: totals.quoted_sessions > 0 ? totals.order_created_sessions / totals.quoted_sessions : 0,
          escalation_rate: totals.total_sessions > 0 ? totals.escalated_sessions / totals.total_sessions : 0,
          fallback_rate: fallbackTotals.total_sessions > 0 ? fallbackTotals.fallback_sessions / fallbackTotals.total_sessions : 0,
          fallback_sessions: fallbackTotals.fallback_sessions,
        },
        daily,
        dropoff,
        quote_acceptance: quoteAcceptance,
        fallback_rate: fallbackRate,
      });
    }

    if (action === 'ai-action-requests') {
      const status = url.searchParams.get('status') || 'pending';
      const statusFilter = status === 'all' ? '' : `&status=eq.${encodeURIComponent(status)}`;
      const requests = await restJson(
        supabaseUrl,
        serviceRoleKey,
        `ai_action_requests?select=*,profiles!ai_action_requests_user_id_fkey(email,phone)&order=created_at.desc${statusFilter}&limit=100`,
      );
      return jsonResponse({ requests });
    }

    if (action === 'ai-action-request-decision') {
      if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

      const body = await req.json();
      const requestId = body.request_id;
      const decision = body.decision;
      const note = typeof body.note === 'string' ? body.note : undefined;

      if (!requestId || !['approve', 'reject', 'execute'].includes(decision)) {
        return jsonResponse({ error: 'request_id and decision=approve|reject|execute are required' }, 400);
      }

      const requests = await restJson(
        supabaseUrl,
        serviceRoleKey,
        `ai_action_requests?id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`,
      );
      const approvalRequest = requests?.[0] as AIActionRequest | undefined;
      if (!approvalRequest) return jsonResponse({ error: 'AI action request not found' }, 404);

      if (approvalRequest.status === 'blocked') {
        return jsonResponse({ error: 'Blocked requests cannot be approved or executed' }, 409);
      }
      if (approvalRequest.status === 'executed') {
        return jsonResponse({ request: approvalRequest, order_id: approvalRequest.order_id, already_executed: true });
      }

      if (decision === 'reject') {
        const rejected = await restJson(
          supabaseUrl,
          serviceRoleKey,
          `ai_action_requests?id=eq.${encodeURIComponent(requestId)}&select=*`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(buildApprovalPatch(userData.id, 'rejected', approvalRequest.metadata, note)),
          },
        );
        return jsonResponse({ request: rejected?.[0] });
      }

      if (decision === 'approve') {
        const approved = await restJson(
          supabaseUrl,
          serviceRoleKey,
          `ai_action_requests?id=eq.${encodeURIComponent(requestId)}&select=*`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(buildApprovalPatch(userData.id, 'approved', approvalRequest.metadata, note)),
          },
        );
        return jsonResponse({ request: approved?.[0] });
      }

      const orderId = await createOrderFromApprovalRequest(supabaseUrl, serviceRoleKey, approvalRequest);
      const executed = await restJson(
        supabaseUrl,
        serviceRoleKey,
        `ai_action_requests?id=eq.${encodeURIComponent(requestId)}&select=*`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            ...buildApprovalPatch(userData.id, 'executed', approvalRequest.metadata, note),
            order_id: orderId,
          }),
        },
      );

      if (approvalRequest.session_id) {
        await restJson(
          supabaseUrl,
          serviceRoleKey,
          'chat_events',
          {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              session_id: approvalRequest.session_id,
              user_id: approvalRequest.user_id,
              event_type: 'order_created',
              state: 'order_creation',
              intent: 'book',
              metadata: {
                source: 'admin_approval_queue',
                approval_request_id: approvalRequest.id,
                order_id: orderId,
              },
            }),
          },
        );
      }

      return jsonResponse({ request: executed?.[0], order_id: orderId });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Admin dashboard error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
