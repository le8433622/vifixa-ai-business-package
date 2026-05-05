// Customer Requests Edge Function
// Per 21_API_SPECIFICATION.md - Service requests, orders, reviews
// Per 05_PRODUCT_SOLUTION.md - Customer flow

import { corsHeaders } from '../_shared/cors.ts';
import { createAIProvider } from '../_shared/ai-provider.ts';

interface ServiceRequest {
  category: string;
  description: string;
  media_urls?: string[];
  location: { lat: number; lng: number };
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

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
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
    const customerId = userData.id;

    if (req.method === 'POST') {
      const { category, description, media_urls, location }: ServiceRequest = await req.json();

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

      // Create order in database
      const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          customer_id: customerId,
          category,
          description,
          media_urls: media_urls || [],
          ai_diagnosis: diagnosis,
          estimated_price: priceEstimate.estimated_price,
          status: 'pending',
        }),
      });

      const orderData = await orderResponse.json();

      // Log AI diagnosis
      await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderData[0].id,
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
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderData[0].id,
          agent_type: 'pricing',
          input: { category, diagnosis: diagnosis.diagnosis, location, urgency: diagnosis.severity },
          output: priceEstimate,
        }),
      });

      return new Response(
        JSON.stringify({
          request_id: orderData[0].id,
          ai_diagnosis: diagnosis,
          estimated_price: priceEstimate.estimated_price,
          price_breakdown: priceEstimate.price_breakdown,
          status: 'pending',
        }),
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
  } catch (error) {
    console.error('Customer requests error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
