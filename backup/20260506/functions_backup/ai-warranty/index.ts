// AI Warranty Check Edge Function
// Per 12_OPERATIONS_AND_TRUST.md - Warranty claims
// Per Step 7: Trust & Quality - Task 7

import { corsHeaders } from '../_shared/cors.ts';

interface WarrantyCheckRequest {
  order_id: string;
  customer_id: string;
  claim_reason: string;
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

    const { order_id, customer_id, claim_reason }: WarrantyCheckRequest = await req.json();

    if (!order_id || !customer_id || !claim_reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, customer_id, claim_reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (orderError || !order[0]) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = order[0];

    // Check eligibility: 30 days from completion date
    if (!orderData.completed_at) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: 'Order not completed yet',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const completedDate = new Date(orderData.completed_at);
    const thirtyDaysLater = new Date(completedDate);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const now = new Date();

    if (now > thirtyDaysLater) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: 'Warranty period expired (30 days from completion)',
          completed_date: orderData.completed_at,
          warranty_deadline: thirtyDaysLater.toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if warranty already claimed
    const { data: existingClaims } = await fetch(
      `${supabaseUrl}/rest/v1/warranty_claims?order_id=eq.${order_id}&select=count`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (existingClaims && existingClaims.count > 0) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: 'Warranty already claimed for this order',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process warranty claim (in production, use AI to analyze claim reason)
    const warrantyResult = {
      eligible: true,
      order_id,
      completed_date: orderData.completed_at,
      warranty_deadline: thirtyDaysLater.toISOString(),
      days_remaining: Math.ceil((thirtyDaysLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      claim_reason,
      auto_approved: true, // In production, AI would decide this
      message: 'Warranty claim is valid. A technician will be dispatched within 48 hours.',
    };

    // Create warranty claim record
    await fetch(`${supabaseUrl}/rest/v1/warranty_claims`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        order_id,
        customer_id,
        claim_reason,
        status: 'approved',
        approved_by: 'ai-system',
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      }),
    });

    // Update order status to disputed (triggers warranty workflow)
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'disputed',
      }),
    });

    // Log to ai_logs
    await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        agent_type: 'quality',
        input: { order_id, customer_id, claim_reason },
        output: warrantyResult,
        created_at: new Date().toISOString(),
      }),
    });

    return new Response(
      JSON.stringify(warrantyResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Warranty check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
