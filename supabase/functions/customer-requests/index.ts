// Customer Requests Edge Function
// Per 21_API_SPECIFICATION.md - Service requests, orders, reviews
// Per 05_PRODUCT_SOLUTION.md - Customer flow

import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, requireManualApproval } from '../_shared/auth-helper.ts';
import { createAIProvider } from '../_shared/ai-provider.ts';

interface ServiceRequest {
  category: string;
  description: string;
  media_urls?: string[];
  location: { lat: number; lng: number };
  chat_session_id?: string;
  payment_method?: 'wallet' | 'gateway';
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

    // Use verifyAuth from shared helper (same as other functions)
    const user = await verifyAuth(req);
    const customerId = user.id;

    // Env vars for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (req.method === 'POST') {
      const { category, description, media_urls, location, chat_session_id, payment_method }: ServiceRequest = await req.json();

      if (!category || !description || !location) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: category, description, location' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call AI Diagnosis
      const aiProvider = createAIProvider();
      const diagnosis = await aiProvider.diagnose({
        category,
        description,
        media_urls,
        location,
      });

      // Call AI Pricing
      const priceEstimate = await aiProvider.estimatePrice({
        category,
        diagnosis: diagnosis.diagnosis,
        location,
        urgency: diagnosis.severity,
      });

      const isManual = await requireManualApproval(supabaseUrl, serviceRoleKey);

      const orderPayload: any = {
        customer_id: customerId,
        category,
        description,
        media_urls: media_urls || [],
        ai_diagnosis: diagnosis,
        estimated_price: priceEstimate.estimated_price,
        status: 'pending',
        payment_method: payment_method || 'gateway',
      };

      if (chat_session_id) {
        orderPayload.chat_session_id = chat_session_id;
      }

      let orderId: string;

      if (isManual) {
        // Manual mode: create review queue entry instead of order
        const reviewPayload = {
          entity_type: 'order',
          entity_id: crypto.randomUUID(),
          ai_decision: {
            diagnosis,
            priceEstimate,
            category,
            description,
            location,
            severity: diagnosis.severity,
          },
          review_status: 'pending',
          created_by: customerId,
        };

        const reviewResponse = await fetch(`${supabaseUrl}/rest/v1/admin_review_queue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(reviewPayload),
        });

        const reviewText = await reviewResponse.text();
        if (!reviewResponse.ok) {
          throw new Error(`Failed to create review queue entry: ${reviewText}`);
        }

        return new Response(
          JSON.stringify({
            status: 'pending_approval',
            message: 'Yêu cầu cần admin phê duyệt (chế độ thủ công)',
            ai_diagnosis: diagnosis,
            estimated_price: priceEstimate.estimated_price,
            price_breakdown: priceEstimate.price_breakdown,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202,
          }
        );
      }

      // Auto mode: create order directly
      const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResponseText = await orderResponse.text();

      if (!orderResponse.ok) {
        console.error('Order creation failed:', orderResponseText);
        throw new Error(`Failed to create order: ${orderResponseText}`);
      }

      let orderData;
      try {
        orderData = JSON.parse(orderResponseText);
      } catch (_e) {
        throw new Error(`Failed to parse order response: ${orderResponseText}`);
      }

      if (!orderData || !orderData[0] || !orderData[0].id) {
        throw new Error(`Invalid order response: ${orderResponseText}`);
      }

      orderId = orderData[0].id;

      // Log AI diagnosis
      await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderId,
          agent_type: 'diagnosis',
          input: { category, description, media_urls, location },
          output: diagnosis,
        }),
      });

      // Log AI pricing
      await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderId,
          agent_type: 'pricing',
          input: { category, diagnosis: diagnosis.diagnosis, location, urgency: diagnosis.severity },
          output: priceEstimate,
        }),
      });

      // Wallet payment: call atomic RPC via wallet-pay (forward user JWT)
      let walletResult: any
      if (payment_method === 'wallet') {
        const walletPayUrl = `${supabaseUrl}/functions/v1/wallet-pay`
        const walletResp = await fetch(walletPayUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader, // forward user's original JWT
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order_id: orderId }),
        })

        walletResult = await walletResp.json()
        if (!walletResp.ok) {
          // Rollback: delete order since payment failed
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey },
          })
          return new Response(
            JSON.stringify({ error: 'Wallet payment failed', detail: walletResult }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const responsePayload: any = {
        request_id: orderId,
        ai_diagnosis: diagnosis,
        estimated_price: priceEstimate.estimated_price,
        price_breakdown: priceEstimate.price_breakdown,
        status: 'pending',
        payment_method: payment_method || 'gateway',
      }

      // Include wallet info if paid via wallet
      if (payment_method === 'wallet' && walletResult) {
        responsePayload.wallet_balance = walletResult.balance
        responsePayload.wallet_locked = walletResult.locked_amount
      }

      return new Response(
        JSON.stringify(responsePayload),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      );
    }

    if (req.method === 'GET') {
      // List customer's orders
      const ordersResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?customer_id=eq.${customerId}&select=*&order=created_at.desc`,
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

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('=== Customer requests error ===:', error);
    console.error('Stack:', err.stack);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
