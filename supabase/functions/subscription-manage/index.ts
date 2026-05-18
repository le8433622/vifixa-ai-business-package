// Subscription & Membership Edge Function
// Handles: plans list, subscribe, cancel, boost purchase
// POST /functions/v1/subscription-manage

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/subscription-manage', '');

    // GET /plans — List all membership plans
    if (req.method === 'GET' && path === '/plans') {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return jsonResponse({ plans: data });
    }

    // GET /my — User's active subscription
    if (req.method === 'GET' && path === '/my') {
      const user = await verifyAuth(req);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, membership_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ subscription: data });
    }

    // GET /boost-pricing — Boost pricing
    if (req.method === 'GET' && path === '/boost-pricing') {
      const { data, error } = await supabase
        .from('boost_pricing')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return jsonResponse({ plans: data });
    }

    // GET /my-boosts — Worker's active boosts
    if (req.method === 'GET' && path === '/my-boosts') {
      const user = await verifyAuth(req);
      const { data, error } = await supabase
        .from('worker_boosts')
        .select('*')
        .eq('worker_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());
      if (error) throw error;
      return jsonResponse({ boosts: data });
    }

    // POST /subscribe
    if (req.method === 'POST' && path === '/subscribe') {
      const user = await verifyAuth(req);
      const body = await req.json();
      const { plan_id } = body;
      if (!plan_id) return jsonResponse({ error: 'Missing plan_id' }, 400);

      const { data: plan } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('id', plan_id)
        .single();
      if (!plan) return jsonResponse({ error: 'Plan not found' }, 404);

      const endDate = new Date();
      if (plan.interval === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        return jsonResponse({ error: 'Đã có gói đang hoạt động. Hủy gói hiện tại trước.' }, 409);
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: endDate.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ subscription: data }, 201);
    }

    // POST /cancel
    if (req.method === 'POST' && path === '/cancel') {
      const user = await verifyAuth(req);
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!sub) return jsonResponse({ error: 'Không có gói đang hoạt động' }, 404);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', sub.id)
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ subscription: data });
    }

    // POST /boost — Purchase worker boost
    if (req.method === 'POST' && path === '/boost') {
      const user = await verifyAuth(req);
      const body = await req.json();
      const { pricing_id, service_type, district } = body;

      if (!pricing_id || !service_type) {
        return jsonResponse({ error: 'Missing pricing_id or service_type' }, 400);
      }

      const { data: pricing } = await supabase
        .from('boost_pricing')
        .select('*')
        .eq('id', pricing_id)
        .single();
      if (!pricing) return jsonResponse({ error: 'Pricing not found' }, 404);

      const expiresAt = new Date(Date.now() + pricing.duration_days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('worker_boosts')
        .insert({
          worker_id: user.id,
          service_type,
          district: district || null,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          amount_paid: pricing.price,
        })
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ boost: data }, 201);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    console.error('[VIFIXA] subscription error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});