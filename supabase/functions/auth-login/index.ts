// Auth Login Edge Function
// Per 21_API_SPECIFICATION.md - Supabase Auth wrapper
// Per 15_CODEX_BUSINESS_CONTEXT.md - Tech stack

import { corsHeaders } from '../_shared/cors.ts';

interface LoginRequest {
  email: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Login with Supabase Auth
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: authData.msg || 'Login failed' }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${authData.user.id}&select=*`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const profileData = await profileResponse.json();

    return new Response(
      JSON.stringify({
        session: {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
        },
        user: authData.user,
        profile: profileData[0],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
