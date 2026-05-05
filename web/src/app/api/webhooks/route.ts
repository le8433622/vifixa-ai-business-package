// Next.js API Route - Webhook Handler
// Per 21_API_SPECIFICATION.md - Webhooks

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature (example for Supabase)
    const signature = request.headers.get('x-supabase-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const eventType = body.type;

    // Handle different webhook events
    switch (eventType) {
      case 'user.created':
        // Handle new user signup
        console.log('New user created:', body.record);
        break;
      case 'order.completed':
        // Handle completed order
        console.log('Order completed:', body.record);
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
