// Upload Complete Edge Function
// Marks uploaded file as completed and triggers next workflow

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

    const { file_path, bucket_name, order_id, media_type } = await req.json();

    if (!file_path || !bucket_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file_path, bucket_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log upload completion
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Update order with media URL if order_id provided
    if (order_id) {
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          media_urls: [`${supabaseUrl}/storage/v1/object/public/${bucket_name}/${file_path}`],
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, file_path, bucket_name }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Upload complete error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
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
