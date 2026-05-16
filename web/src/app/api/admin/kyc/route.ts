import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const { data: workers, error } = await supabase
      .from('workers')
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        verification_status,
        is_verified,
        id_front_url,
        id_back_url,
        selfie_url,
        trust_score,
        kyc_submitted_at,
        kyc_reviewed_at,
        kyc_notes,
        profiles!inner(email, created_at)
      `)
      .eq('verification_status', status)
      .order('kyc_submitted_at', { ascending: false, nullsLast: true })
      .limit(50);

    if (error) throw error;

    // Get documents for each worker
    const workerIds = (workers || []).map(w => w.id);
    const { data: allDocs } = await supabase
      .from('kyc_documents')
      .select('*')
      .in('worker_id', workerIds.length > 0 ? workerIds : ['none'])
      .order('uploaded_at', { ascending: false });

    const docsByWorker: Record<string, any[]> = {};
    for (const doc of allDocs || []) {
      if (!docsByWorker[doc.worker_id]) docsByWorker[doc.worker_id] = [];
      docsByWorker[doc.worker_id].push(doc);
    }

    const result = (workers || []).map(w => ({
      ...w,
      documents: docsByWorker[w.id] || [],
    }));

    const { count: pendingCount } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    const { count: verifiedCount } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified');

    const { count: rejectedCount } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'rejected');

    return NextResponse.json({
      success: true,
      data: result,
      stats: { pending: pendingCount || 0, verified: verifiedCount || 0, rejected: rejectedCount || 0 },
    });
  } catch (error: any) {
    console.error('Admin KYC list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await request.json();
    const { worker_id, status, admin_notes, reviewed_by } = body;

    if (!worker_id || !status) {
      return NextResponse.json({ error: 'Missing required: worker_id, status' }, { status: 400 });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be verified or rejected' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      verification_status: status,
      is_verified: status === 'verified',
      kyc_reviewed_at: new Date().toISOString(),
    };
    if (admin_notes) updateData.kyc_notes = admin_notes;
    if (reviewed_by) updateData.kyc_reviewed_by = reviewed_by;

    const { error: updateError } = await supabase.from('workers').update(updateData).eq('id', worker_id);
    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    // If verified, auto-create identity badge
    if (status === 'verified') {
      await supabase.from('verification_badges').upsert({
        user_id: worker_id,
        badge_type: 'identity',
        badge_level: 'gold',
        issued_at: new Date().toISOString(),
      }, { onConflict: 'user_id, badge_type' });
    }

    // Recalculate trust score on verification
    if (status === 'verified') {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_trust_score`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker_uuid: worker_id }),
        });
      } catch (e) {
        console.error('Trust score recalculation error:', e);
      }
    }

    return NextResponse.json({ success: true, message: `KYC ${status === 'verified' ? 'approved' : 'rejected'} successfully` });
  } catch (error: any) {
    console.error('Admin KYC review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
