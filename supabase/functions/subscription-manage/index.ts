// Subscription Management Edge Function
// Care Plan: subscribe, cancel, list plans

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 30 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop() || 'plans';

    if (req.method === 'GET') {
      if (action === 'plans') {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true });
        if (error) throw error;
        return jsonResponse({ plans: data });
      }

      if (action === 'my') {
        const { data, error } = await supabase
          .from('customer_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ subscription: data });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'subscribe') {
        const { plan_id } = body;
        if (!plan_id) return jsonResponse({ error: 'Missing plan_id' }, 400);

        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', plan_id)
          .single();
        if (!plan) return jsonResponse({ error: 'Plan not found' }, 404);

        const endDate = new Date();
        if (plan.interval === 'month') endDate.setMonth(endDate.getMonth() + 1);
        else if (plan.interval === 'quarter') endDate.setMonth(endDate.getMonth() + 3);
        else endDate.setFullYear(endDate.getFullYear() + 1);

        const { data: existing } = await supabase
          .from('customer_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (existing) {
          return jsonResponse({ error: 'Already have an active subscription' }, 409);
        }

        const { data, error } = await supabase
          .from('customer_subscriptions')
          .insert({
            user_id: user.id,
            plan_id,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ subscription: data }, 201);
      }

      if (action === 'cancel') {
        const { data: sub } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (!sub) return jsonResponse({ error: 'No active subscription' }, 404);

        const { data, error } = await supabase
          .from('customer_subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('id', sub.id)
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ subscription: data });
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('Subscription error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
