import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const KYC_BUCKET = 'verification-docs';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await request.formData();
    const worker_id = formData.get('worker_id') as string;
    const idFront = formData.get('id_front') as File | null;
    const idBack = formData.get('id_back') as File | null;
    const selfie = formData.get('selfie') as File | null;

    if (!worker_id) {
      return NextResponse.json({ error: 'Missing worker_id' }, { status: 400 });
    }

    if (!idFront && !idBack && !selfie) {
      return NextResponse.json({ error: 'Missing files: upload at least one document' }, { status: 400 });
    }

    const uploadFile = async (file: File, prefix: string): Promise<{ url: string; path: string } | null> => {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${worker_id}/${prefix}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, { upsert: true });
      if (error) throw new Error(`Upload ${prefix} failed: ${error.message}`);
      const { data: pub } = supabase.storage.from(KYC_BUCKET).getPublicUrl(path);
      return { url: pub.publicUrl, path };
    };

    const results = await Promise.all([
      idFront ? uploadFile(idFront, 'id_front') : null,
      idBack ? uploadFile(idBack, 'id_back') : null,
      selfie ? uploadFile(selfie, 'selfie') : null,
    ]);

    const [idFrontResult, idBackResult, selfieResult] = results;

    const updateData: Record<string, any> = { verification_status: 'pending', kyc_submitted_at: new Date().toISOString() };
    if (idFrontResult) updateData.id_front_url = idFrontResult.url;
    if (idBackResult) updateData.id_back_url = idBackResult.url;
    if (selfieResult) updateData.selfie_url = selfieResult.url;

    const { error: updateError } = await supabase.from('workers').update(updateData).eq('id', worker_id);
    if (updateError) throw new Error(`Update worker failed: ${updateError.message}`);

    // Record each document in kyc_documents table
    const docsToInsert: { worker_id: string; doc_type: string; file_url: string; file_path: string }[] = [];
    if (idFrontResult) docsToInsert.push({ worker_id, doc_type: 'cccd_front', file_url: idFrontResult.url, file_path: idFrontResult.path });
    if (idBackResult) docsToInsert.push({ worker_id, doc_type: 'cccd_back', file_url: idBackResult.url, file_path: idBackResult.path });
    if (selfieResult) docsToInsert.push({ worker_id, doc_type: 'selfie', file_url: selfieResult.url, file_path: selfieResult.path });

    if (docsToInsert.length > 0) {
      const { error: docError } = await supabase.from('kyc_documents').insert(docsToInsert);
      if (docError) console.error('Failed to record KYC documents:', docError);
    }

    return NextResponse.json({
      success: true,
      message: 'KYC documents uploaded. Pending admin review.',
      data: { id_front_url: idFrontResult?.url, id_back_url: idBackResult?.url, selfie_url: selfieResult?.url, verification_status: 'pending' },
    });
  } catch (error: any) {
    console.error('KYC upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const worker_id = searchParams.get('worker_id');

    if (!worker_id) return NextResponse.json({ error: 'Missing worker_id' }, { status: 400 });

    const { data: worker, error } = await supabase
      .from('workers')
      .select('id, verification_status, is_verified, id_front_url, id_back_url, selfie_url, trust_score, kyc_submitted_at, kyc_reviewed_at, kyc_notes')
      .eq('id', worker_id)
      .single();

    if (error || !worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });

    const { data: docs } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('worker_id', worker_id)
      .order('uploaded_at', { ascending: false });

    return NextResponse.json({ success: true, data: { ...worker, documents: docs || [] } });
  } catch (error: any) {
    console.error('KYC status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
