// Worker Verification API Route
// Per 12_OPERATIONS_AND_TRUST.md - Worker verification
// Per Step 7: Trust & Quality - Task 3

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST: Upload ID document and update verification status
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await request.formData();
    const worker_id = formData.get('worker_id') as string;
    const id_document = formData.get('id_document') as File;

    if (!worker_id || !id_document) {
      return NextResponse.json(
        { error: 'Missing required fields: worker_id, id_document' },
        { status: 400 }
      );
    }

    // Upload ID document to Supabase Storage (private bucket)
    const fileExt = id_document.name.split('.').pop();
    const fileName = `${worker_id}/id_document_${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(fileName, id_document, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload ID document', details: uploadError },
        { status: 500 }
      );
    }

    // Get the file URL
    const { data: urlData } = supabase.storage
      .from('verification-docs')
      .getPublicUrl(fileName);

    // Update worker's verification status and ID document URL
    const { data: worker, error: updateError } = await supabase
      .from('workers')
      .update({
        id_document_url: urlData.publicUrl,
        verification_status: 'pending', // Admin will review and approve
      })
      .eq('user_id', worker_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update worker verification status', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ID document uploaded successfully. Verification pending admin review.',
      id_document_url: urlData.publicUrl,
      verification_status: 'pending',
    });
  } catch (error: any) {
    console.error('Worker verification error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Admin updates verification status (approve/reject)
export async function PATCH(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await request.json();
    const { worker_id, status, admin_notes } = body;

    if (!worker_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: worker_id, status' },
        { status: 400 }
      );
    }

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, verified, or rejected' },
        { status: 400 }
      );
    }

    // Update worker's verification status
    const { data: worker, error } = await supabase
      .from('workers')
      .update({
        verification_status: status,
        is_verified: status === 'verified',
      })
      .eq('user_id', worker_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update verification status', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Worker verification status updated to: ${status}`,
      worker,
    });
  } catch (error: any) {
    console.error('Verification status update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
