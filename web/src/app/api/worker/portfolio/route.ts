import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const worker_id = searchParams.get('worker_id');

    if (!worker_id) return NextResponse.json({ error: 'Missing worker_id' }, { status: 400 });

    const { data, error } = await supabase
      .from('worker_portfolio')
      .select('*')
      .eq('worker_id', worker_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await request.formData();
    const worker_id = formData.get('worker_id') as string;
    const title = formData.get('title') as string;
    const media_type = formData.get('media_type') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const file = formData.get('file') as File | null;

    if (!worker_id || !title || !file) {
      return NextResponse.json({ error: 'Missing required: worker_id, title, file' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `portfolio/${worker_id}/${Date.now()}_${title.replace(/\s+/g, '_')}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('verification-docs').upload(path, file, { upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: pub } = supabase.storage.from('verification-docs').getPublicUrl(path);

    const { data, error } = await supabase.from('worker_portfolio').insert({
      worker_id,
      media_type: media_type || 'worksample',
      title,
      description: description || null,
      media_url: pub.publicUrl,
      thumbnail_url: pub.publicUrl,
      tags: tags ? JSON.parse(tags) : [],
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing portfolio id' }, { status: 400 });

    const { error } = await supabase.from('worker_portfolio').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
