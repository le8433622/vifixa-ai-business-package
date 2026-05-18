import { verifyAuth, jsonResponse, handleOptions, corsHeaders } from '../_shared/auth-helper.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const user = await verifyAuth(req, { maxRequests: 30, windowMs: 60000 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const workerId = user.id;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'profile') {
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/workers?user_id=eq.${workerId}&select=*`,