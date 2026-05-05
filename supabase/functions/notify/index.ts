// Notify Edge Function
// Creates notification and prepares push/email

interface NotificationRequest {
  user_id: string;
  order_id?: string;
  type: 'order_assigned' | 'order_updated' | 'worker_arriving' | 'order_completed';
  message: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, order_id, type, message, metadata }: NotificationRequest = await req.json();

    if (!user_id || !type || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, type, message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // In a real implementation, you would:
    // 1. Get user's push token from profiles
    // 2. Send push notification via Expo Push API
    // 3. Send email if user has email notifications enabled

    // For now, just log the notification
    console.log(`Notification sent to ${user_id}: ${message}`);

    return new Response(
      JSON.stringify({ success: true, notification: { user_id, type, message } }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Notify error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
