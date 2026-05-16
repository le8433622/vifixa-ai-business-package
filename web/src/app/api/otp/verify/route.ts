import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await request.json();
    const { user_id, phone, otp_code } = body;

    if (!user_id || !phone || !otp_code) {
      return NextResponse.json({ error: 'Missing required fields: user_id, phone, otp_code' }, { status: 400 });
    }

    // Find valid OTP
    const { data: otpRecord, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('phone', phone)
      .eq('otp_code', otp_code)
      .eq('purpose', 'phone_verification')
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Mark OTP as verified
    await supabase.from('otp_codes').update({ verified_at: new Date().toISOString() }).eq('id', otpRecord.id);

    // Update profile phone_verified
    await supabase.from('profiles').update({ phone: phone, phone_verified: true }).eq('id', user_id);

    // Create phone verification badge
    await supabase.from('verification_badges').upsert({
      user_id,
      badge_type: 'phone',
      badge_level: 'silver',
      issued_at: new Date().toISOString(),
    }, { onConflict: 'user_id, badge_type' });

    return NextResponse.json({ success: true, message: 'Phone verified successfully' });
  } catch (error: any) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
