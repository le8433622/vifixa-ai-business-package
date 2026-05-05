// Trust Score API Route
// Per 12_OPERATIONS_AND_TRUST.md - Trust score calculation
// Per Step 7: Trust & Quality - Task 2

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: Return trust score for a worker
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const worker_id = searchParams.get('worker_id');

    if (!worker_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: worker_id' },
        { status: 400 }
      );
    }

    // Fetch worker's trust score and related data
    const { data: worker, error } = await supabase
      .from('workers')
      .select('user_id, trust_score, total_orders, avg_rating, dispute_rate, verification_status')
      .eq('user_id', worker_id)
      .single();

    if (error || !worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Get trust score history
    const { data: history } = await supabase
      .from('trust_scores')
      .select('*')
      .eq('worker_id', worker_id)
      .order('last_calculated', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      worker_id: worker.user_id,
      trust_score: worker.trust_score || 50,
      total_orders: worker.total_orders || 0,
      avg_rating: worker.avg_rating || 0,
      dispute_rate: worker.dispute_rate || 0,
      verification_status: worker.verification_status || 'pending',
      history: history || [],
    });
  } catch (error: any) {
    console.error('Trust score GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: Recalculate trust score (called after order completion)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { worker_id } = body;

    if (!worker_id) {
      return NextResponse.json(
        { error: 'Missing required field: worker_id' },
        { status: 400 }
      );
    }

    // Use service role key for secure server-side calculation
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Call the database function to calculate trust score
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/calculate_trust_score`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ worker_uuid: worker_id }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to calculate trust score', details: error },
        { status: 500 }
      );
    }

    const newScore = await response.json();

    return NextResponse.json({
      success: true,
      worker_id,
      new_trust_score: newScore,
      message: 'Trust score recalculated successfully',
    });
  } catch (error: any) {
    console.error('Trust score POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
