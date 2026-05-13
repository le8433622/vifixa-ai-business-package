// Auth Register Edge Function
// Per 21_API_SPECIFICATION.md - Supabase Auth wrapper
// Per 15_CODEX_BUSINESS_CONTEXT.md - Tech stack

import { corsHeaders } from '../_shared/cors.ts';

interface RegisterRequest {
  email: string;
  password: string;
  role: 'customer' | 'worker' | 'admin';
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, role, phone, referral_code }: RegisterRequest & { referral_code?: string } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Handle Referral (Optional)
    let referrerId: string | null = null;
    if (referral_code) {
      const refCheckRes = await fetch(`${supabaseUrl}/rest/v1/user_referral_codes?code=eq.${referral_code}&select=user_id`, {
        headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
      });
      const refCheckData = await refCheckRes.json();
      if (refCheckData && refCheckData.length > 0) {
        referrerId = refCheckData[0].user_id;
      }
    }

    // 2. Register user with Supabase Auth (email only - phone goes to profiles)
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
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
        JSON.stringify({ error: authData.msg || 'Registration failed' }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Auto-confirm email (admin API)
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${authData.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({ email_confirm: true }),
    });

    // 4. Upsert profile record
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        id: authData.id,
        email,
        phone,
        role,
      }),
    });

    const profileData = await profileResponse.json();

    // 5. Record Referral link if applicable
    if (referrerId && authData.id) {
      await fetch(`${supabaseUrl}/rest/v1/referrals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
          referrer_id: referrerId,
          referred_id: authData.id,
          status: 'pending',
          reward_amount: 50000, // 50k VND bonus
        }),
      });
    }

    return new Response(
      JSON.stringify({
        user: authData,
        profile: profileData[0],
        message: 'Registration successful',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Register error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
