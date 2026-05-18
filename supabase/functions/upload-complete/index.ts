import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req, { maxRequests: 20, windowMs: 60000 })
    const { file_path, bucket_name, order_id, media_type } = await req.json()

    if (!file_path || !bucket_name) {
      return jsonResponse({ error: 'Missing required fields: file_path, bucket_name' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
      })
    }

    return jsonResponse({ success: true, file_path, bucket_name, user_id: user.id })
  } catch (error: unknown) {
    console.error('Upload complete error:', error)
    if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
      return jsonResponse({ error: error.message }, 401)
    }
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})
