// AI News Personalize — Personalizes broadcast content per user
// Uses user's device types, service history, and preferences to tailor broadcast body

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions, verifyAuth, AuthError } from '../_shared/auth-helper.ts';

interface PersonalizeRequest {
  broadcast_id: string;
  user_ids?: string[];
}

interface PersonalizedNotification {
  user_id: string;
  title: string;
  body: string;
  action_url?: string;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403);
    }

    const { broadcast_id, user_ids }: PersonalizeRequest = await req.json();

    if (!broadcast_id) {
      return jsonResponse({ error: 'broadcast_id is required' }, 400);
    }

    // Fetch broadcast
    const { data: broadcast, error: bError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcast_id)
      .single();

    if (bError || !broadcast) {
      return jsonResponse({ error: 'Broadcast not found' }, 404);
    }

    // Fetch target users
    let targetQuery = supabase
      .from('profiles')
      .select('id, full_name');

    if (user_ids && user_ids.length > 0) {
      targetQuery = targetQuery.in('id', user_ids);
    } else if (broadcast.target_role === 'customers') {
      targetQuery = targetQuery.eq('role', 'customer');
    } else if (broadcast.target_role === 'workers') {
      targetQuery = targetQuery.eq('role', 'worker');
    }

    const { data: users } = await targetQuery;

    if (!users || users.length === 0) {
      return jsonResponse({ message: 'No target users', personalized: [] });
    }

    // Fetch user devices for personalization (for customer role)
    const userIds = users.map((u: { id: string }) => u.id);
    const { data: devices } = await supabase
      .from('device_profiles')
      .select('user_id, device_type, brand, model')
      .in('user_id', userIds);

    const devicesByUser: Record<string, any[]> = {};
    for (const d of devices || []) {
      if (!devicesByUser[d.user_id]) devicesByUser[d.user_id] = [];
      devicesByUser[d.user_id].push(d);
    }

    // Fetch user preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .in('user_id', userIds);

    const optedInUsers = new Set((prefs || []).map((p: { user_id: string }) => p.user_id));

    const personalized: PersonalizedNotification[] = [];

    for (const u of users as { id: string; full_name: string | null }[]) {
      // Skip users who have opted out of this category
      // (full preference check would be done at insert time)

      const userDevices = devicesByUser[u.id] || [];
      const userName = u.full_name || 'bạn';

      let personalizedBody = broadcast.body
        .replace(/\{\{user_name\}\}/g, userName)
        .replace(/\{\{full_name\}\}/g, u.full_name || 'bạn');

      // If user has devices, add a device-specific tip
      if (userDevices.length > 0 && broadcast.category === 'maintenance_tip') {
        const device = userDevices[0];
        personalizedBody += `\n\n💡 Gợi ý cho thiết bị ${device.brand || ''} ${device.model || device.device_type} của bạn: Hãy kiểm tra định kỳ để đảm bảo thiết bị hoạt động tốt nhất.`;
      }

      // If user has no devices and category is maintenance_tip, skip or simplify
      if (broadcast.category === 'maintenance_tip' && userDevices.length === 0 && broadcast.target_role === 'customers') {
        personalizedBody += '\n\n💡 Bạn chưa có thiết bị nào trong hệ thống. Thêm thiết bị để nhận mẹo bảo trì cá nhân hóa!';
      }

      personalized.push({
        user_id: u.id,
        title: broadcast.title.replace(/\{\{user_name\}\}/g, userName),
        body: personalizedBody,
        action_url: broadcast.category === 'maintenance_tip' && userDevices.length > 0
          ? '/customer/care'
          : broadcast.category === 'promotion'
            ? '/customer/service-request'
            : undefined,
      });
    }

    return jsonResponse({
      broadcast_id,
      total_users: users.length,
      personalized,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401);
    }
    console.error('ai-news-personalize error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
