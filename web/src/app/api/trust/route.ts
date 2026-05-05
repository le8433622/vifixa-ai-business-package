// API Route - Trust Score Calculation
// Per 12_OPERATIONS_AND_TRUST.md - Dynamic trust scores
// Per Step 7: Trust & Quality

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Verify admin or worker
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();

    // Get worker profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const profile = await profileResponse.json();

    if (!profile[0] || (profile[0].role !== 'admin' && profile[0].role !== 'worker')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get request body (optional worker_id for admin to update specific worker)
    const body = await request.json().catch(() => ({}));
    const workerId = body.worker_id || userData.id;

    // Calculate trust score
    // Formula: (completed_orders × 10) + (avg_rating × 20) - (disputes × 30)
    
    const workerResponse = await fetch(
      `${supabaseUrl}/rest/v1/workers?user_id=eq.${workerId}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const workers = await workerResponse.json();
    if (!workers.length) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    const worker = workers[0];

    // Get completed orders count
    const completedResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?worker_id=eq.${workerId}&status=eq.completed&select=count`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Accept': 'application/json',
        },
      }
    );
    const completedData = await completedResponse.json();
    const completedOrders = completedData.count || 0;

    // Get average rating from orders (assuming orders have rating field)
    const ratingResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?worker_id=eq.${workerId}&rating=not.is.null&select=rating`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Accept': 'application/json',
        },
      }
    );
    const ratings = await ratingResponse.json();
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length 
      : 0;

    // Get disputes count
    const disputesResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?worker_id=eq.${workerId}&status=eq.disputed&select=count`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Accept': 'application/json',
        },
      }
    );
    const disputesData = await disputesResponse.json();
    const disputes = disputesData.count || 0;

    // Calculate trust score
    const trustScore = Math.max(0, Math.min(100, 
      (completedOrders * 10) + (avgRating * 20) - (disputes * 30)
    ));

    // Update worker's trust_score
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/workers?user_id=eq.${workerId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ trust_score: trustScore }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Failed to update trust score');
    }

    return NextResponse.json({
      success: true,
      trust_score: trustScore,
      breakdown: {
        completed_orders: completedOrders,
        avg_rating: avgRating,
        disputes: disputes,
      },
    });
  } catch (error: any) {
    console.error('Trust score calculation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
