// AI News Scheduler — Processes scheduled broadcasts and fans out notifications
// Intended to be triggered by cron or admin action

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions, AuthError } from '../_shared/auth-helper.ts';

interface Broadcast {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  category: string;
  priority: string;
  target_role: string;
  target_provinces: string[] | null;
  target_skills: string[] | null;
  target_user_ids: string[] | null;
  exclude_user_ids: string[] | null;
  action_url: string | null;
}

function isCronCall(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return token === serviceRoleKey;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!isCronCall(req)) {
      const { verifyAuth } = await import('../_shared/auth-helper.ts');
      const user = await verifyAuth(req);
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || profile.role !== 'admin') {
        return jsonResponse({ error: 'Forbidden: admin only' }, 403);
      }
    }

    const { broadcast_id, simulate } = await req.json().catch(() => ({}));

    // Fetch broadcasts ready to publish
    let query = supabase
      .from('broadcasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (broadcast_id) {
      query = query.eq('id', broadcast_id);
    }

    const { data: broadcasts, error: fetchError } = await query;

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    if (!broadcasts || broadcasts.length === 0) {
      return jsonResponse({ message: 'No broadcasts to schedule', processed: 0 });
    }

    let totalNotifications = 0;

    for (const broadcast of broadcasts as Broadcast[]) {
      // Determine target users
      let targetQuery = supabase
        .from('profiles')
        .select('id');

      if (broadcast.target_role === 'customers') {
        targetQuery = targetQuery.eq('role', 'customer');
      } else if (broadcast.target_role === 'workers') {
        targetQuery = targetQuery.eq('role', 'worker');
      }
      // 'all' — no role filter

      if (broadcast.exclude_user_ids && broadcast.exclude_user_ids.length > 0) {
        targetQuery = targetQuery.not('id', 'in', `(${broadcast.exclude_user_ids.join(',')})`);
      }

      if (broadcast.target_user_ids && broadcast.target_user_ids.length > 0) {
        targetQuery = targetQuery.in('id', broadcast.target_user_ids);
      }

      const { data: targetUsers } = await targetQuery;

      if (!targetUsers || targetUsers.length === 0) {
        console.log(`No target users for broadcast ${broadcast.id}`);
        continue;
      }

      if (simulate) {
        totalNotifications += targetUsers.length;
        continue;
      }

      // Create in-app notifications for each user
      const notifications = targetUsers.map((u: { id: string }) => ({
        user_id: u.id,
        broadcast_id: broadcast.id,
        title: broadcast.title,
        body: broadcast.summary || broadcast.body.substring(0, 200),
        category: broadcast.category,
        priority: broadcast.priority,
        is_read: false,
      }));

      const { error: insertError } = await supabase
        .from('in_app_notifications')
        .insert(notifications);

      if (insertError) {
        console.error(`Failed to insert notifications for broadcast ${broadcast.id}:`, insertError);
        continue;
      }

      // Mark broadcast as published
      await supabase
        .from('broadcasts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          sent_count: targetUsers.length,
        })
        .eq('id', broadcast.id);

      totalNotifications += targetUsers.length;
    }

    return jsonResponse({
      message: `Processed ${broadcasts.length} broadcasts`,
      notifications_created: totalNotifications,
      broadcasts_processed: broadcasts.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401);
    }
    console.error('ai-news-scheduler error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
