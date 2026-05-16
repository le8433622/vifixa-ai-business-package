import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await request.json();
    const { user_id, phone } = body;

    if (!user_id || !phone) {
      return NextResponse.json({ error: 'Missing user_id or phone' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate old OTPs for this user+phone
    await supabase.from('otp_codes')
      .update({ verified_at: new Date(0).toISOString() })
      .eq('user_id', user_id)
      .eq('phone', phone)
      .eq('purpose', 'phone_verification')
      .is('verified_at', null);

    // Insert new OTP
    const { error } = await supabase.from('otp_codes').insert({
      user_id,
      phone,
      otp_code: otp,
      purpose: 'phone_verification',
      expires_at: expiresAt,
    });

    if (error) throw error;

    // TODO: Integrate real SMS provider (Twilio, etc.)
    // For now, log OTP for development
    console.log(`[OTP] User ${user_id} phone ${phone}: code=${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // Only include code in development mode
      ...(process.env.NODE_ENV === 'development' ? { debug_code: otp } : {}),
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
