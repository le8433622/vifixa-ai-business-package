// AI Care Agent Edge Function
// Proactive customer care: device analysis, maintenance reminders, reorder suggestions, loyalty

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAIProvider, CareAgentInput } from '../_shared/ai-provider.ts';
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts';

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    checkRateLimit(user.id, clientIp, { maxRequests: 10 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Fetch user's devices and orders
    const [devicesResult, ordersResult] = await Promise.all([
      supabase
        .from('device_profiles')
        .select('device_type, brand, model, purchase_date, warranty_expiry')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false }),
      supabase
        .from('orders')
        .select('id, category, status, description, created_at, completed_at, rating, final_price, estimated_price')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const devices = devicesResult.data || [];
    const orders = ordersResult.data || [];

    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalSpent = completedOrders.reduce(
      (sum, o) => sum + (o.final_price ?? o.estimated_price ?? 0), 0
    );
    const totalOrders = orders.length;
    const repeatRate = totalOrders > 0
      ? (totalOrders - new Set(orders.map(o => o.category)).size) / totalOrders
      : 0;

    const careInput: CareAgentInput = {
      user_id: user.id,
      devices: devices.map(d => ({
        device_type: d.device_type,
        brand: d.brand,
        model: d.model,
        purchase_date: d.purchase_date,
        warranty_expiry: d.warranty_expiry,
      })),
      orders: orders.map(o => ({
        id: o.id,
        category: o.category,
        status: o.status,
        created_at: o.created_at,
        completed_at: o.completed_at,
        rating: o.rating,
      })),
      total_spent: totalSpent,
      device_count: devices.length,
      completed_orders: completedOrders.length,
      repeat_rate: repeatRate,
    };

    const requestId = crypto.randomUUID();
    const carePlan = await createAIProvider(requestId).careAgent(careInput);

    await supabase.from('ai_logs').insert({
      user_id: user.id,
      agent_type: 'care_agent',
      input: { device_count: devices.length, order_count: orders.length, total_spent: totalSpent },
      output: carePlan,
    });

    return jsonResponse(carePlan);
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401);
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429);
    console.error('AI Care Agent error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
