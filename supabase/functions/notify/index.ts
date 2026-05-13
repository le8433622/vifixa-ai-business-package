// Notify Edge Function
// Full implementation: creates in_app_notifications and sends push via Expo

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions, AuthError } from '../_shared/auth-helper.ts';
import { sendPushNotifications } from './push.ts';

interface ManualNotification {
  mode: 'manual';
  user_id: string;
  title: string;
  body: string;
  category?: string;
  priority?: string;
  action_url?: string;
  action_label?: string;
}

interface BroadcastNotification {
  mode: 'broadcast';
  broadcast_id: string;
}

type NotifyRequest = ManualNotification | BroadcastNotification;

interface TargetUser {
  user_id: string;
  push_tokens: string[];
  push_enabled: boolean;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: NotifyRequest = await req.json();

    let targets: TargetUser[];
    let title: string;
    let bodyText: string;
    let category: string;
    let priority: string;
    let actionUrl: string | undefined;
    let actionLabel: string | undefined;
    let broadcastId: string | undefined;
    let statsUpdate = false;

    if (body.mode === 'manual') {
      title = body.title;
      bodyText = body.body;
      category = body.category || 'general';
      priority = body.priority || 'normal';
      actionUrl = body.action_url;
      actionLabel = body.action_label;
      targets = await resolveManualTarget(supabase, body);
    } else if (body.mode === 'broadcast') {
      const broadcast = await resolveBroadcastTargets(supabase, body.broadcast_id);
      if (!broadcast) {
        return jsonResponse({ error: 'Broadcast not found' }, 404);
      }
      title = broadcast.title;
      bodyText = broadcast.summary || broadcast.body;
      category = broadcast.category;
      priority = broadcast.priority;
      actionUrl = broadcast.action_url;
      actionLabel = broadcast.action_label;
      targets = broadcast.targets;
      broadcastId = body.broadcast_id;
      statsUpdate = true;
    } else {
      return jsonResponse({ error: 'Invalid mode: must be "manual" or "broadcast"' }, 400);
    }

    const results = await deliverToTargets(supabase, targets, {
      title, body: bodyText, category, priority, actionUrl, actionLabel, broadcastId,
    });

    if (statsUpdate && broadcastId) {
      await supabase
        .from('broadcasts')
        .update({ sent_count: results.sent })
        .eq('id', broadcastId)
        .catch((err) => console.error('Stats update failed:', err));
    }

    return jsonResponse({
      success: true,
      total_targets: targets.length,
      sent: results.sent,
      push_sent: results.pushSent,
      push_failed: results.pushFailed,
      invalid_tokens_deactivated: results.deactivatedTokens,
    });
  } catch (error) {
    console.error('Notify error:', error);
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, 401);
    }
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

async function resolveManualTarget(
  supabase: ReturnType<typeof createClient>,
  req: ManualNotification,
): Promise<TargetUser[]> {
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('push_enabled')
    .eq('user_id', req.user_id)
    .single();

  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('push_token')
    .eq('user_id', req.user_id)
    .eq('is_active', true);

  return [{
    user_id: req.user_id,
    push_tokens: tokens?.map((t: { push_token: string }) => t.push_token) || [],
    push_enabled: prefs?.push_enabled !== false,
  }];
}

async function resolveBroadcastTargets(
  supabase: ReturnType<typeof createClient>,
  broadcastId: string,
): Promise<{
  title: string;
  summary: string | null;
  body: string;
  category: string;
  priority: string;
  action_url: string | null;
  action_label: string | null;
  targets: TargetUser[];
} | null> {
  const { data: broadcast } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .single();

  if (!broadcast) return null;

  let query = supabase
    .from('profiles')
    .select('id, role');

  if (broadcast.target_role) {
    query = query.eq('role', broadcast.target_role);
  }

  const { data: profiles } = await query;

  if (!profiles?.length) {
    return {
      title: broadcast.title,
      summary: broadcast.summary,
      body: broadcast.body,
      category: broadcast.category,
      priority: broadcast.priority,
      action_url: broadcast.action_url,
      action_label: broadcast.action_label,
      targets: [],
    };
  }

  const userIds = profiles.map((p: { id: string }) => p.id);

  const [prefsResult, tokensResult] = await Promise.all([
    supabase
      .from('user_notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', userIds),
    supabase
      .from('user_push_tokens')
      .select('user_id, push_token')
      .in('user_id', userIds)
      .eq('is_active', true),
  ]);

  const prefsMap = new Map(
    (prefsResult.data || []).map((p: { user_id: string; push_enabled: boolean }) => [p.user_id, p.push_enabled !== false]),
  );

  const tokensMap = new Map<string, string[]>();
  for (const t of (tokensResult.data || []) as { user_id: string; push_token: string }[]) {
    const existing = tokensMap.get(t.user_id) || [];
    existing.push(t.push_token);
    tokensMap.set(t.user_id, existing);
  }

  const targets: TargetUser[] = userIds.map((uid: string) => ({
    user_id: uid,
    push_tokens: tokensMap.get(uid) || [],
    push_enabled: prefsMap.get(uid) ?? true,
  }));

  return {
    title: broadcast.title,
    summary: broadcast.summary,
    body: broadcast.body,
    category: broadcast.category,
    priority: broadcast.priority,
    action_url: broadcast.action_url,
    action_label: broadcast.action_label,
    targets,
  };
}

interface DeliverResult {
  sent: number;
  pushSent: number;
  pushFailed: number;
  deactivatedTokens: number;
}

async function deliverToTargets(
  supabase: ReturnType<typeof createClient>,
  targets: TargetUser[],
  opts: {
    title: string;
    body: string;
    category: string;
    priority: string;
    actionUrl?: string;
    actionLabel?: string;
    broadcastId?: string;
  },
): Promise<DeliverResult> {
  let sent = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let deactivatedTokens = 0;

  const notificationRows = targets.map((t) => ({
    user_id: t.user_id,
    broadcast_id: opts.broadcastId || null,
    title: opts.title,
    body: opts.body,
    category: opts.category,
    priority: opts.priority,
    action_url: opts.actionUrl || null,
    action_label: opts.actionLabel || null,
  }));

  const { error: insertError } = await supabase
    .from('in_app_notifications')
    .insert(notificationRows);

  if (insertError) {
    console.error('Failed to insert notifications:', insertError);
    throw insertError;
  }

  sent = notificationRows.length;

  for (const target of targets) {
    if (!target.push_enabled || !target.push_tokens.length) continue;

    const result = await sendPushNotifications(
      target.push_tokens,
      opts.title,
      opts.body,
      { action_url: opts.actionUrl, broadcast_id: opts.broadcastId, category: opts.category },
    );

    pushSent += result.success;
    pushFailed += result.failed;

    if (result.invalidTokens.length > 0) {
      deactivatedTokens += result.invalidTokens.length;
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .in('push_token', result.invalidTokens);
    }

    if (opts.broadcastId) {
      await supabase
        .from('in_app_notifications')
        .update({ push_sent: true, push_sent_at: new Date().toISOString() })
        .eq('user_id', target.user_id)
        .eq('broadcast_id', opts.broadcastId)
        .eq('push_sent', false);
    }
  }

  return { sent, pushSent, pushFailed, deactivatedTokens };
}
