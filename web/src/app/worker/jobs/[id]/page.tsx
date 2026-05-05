// Web Worker Job Detail
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Accept/start/complete job, upload photos
// Per Step 6: Web Flows with TanStack Query

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Job {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  estimated_price: number;
  final_price?: number;
  before_media?: string[];
  after_media?: string[];
  materials?: string;
  created_at: string;
}

export default function WebWorkerJobDetail() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const queryClient = useQueryClient();

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['web-worker-job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID not found');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data as Job;
    },
    enabled: !!jobId,
  });

  const [materials, setMaterials] = useState('');

  async function updateStatus(newStatus: string) {
    if (!job) return;

    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.final_price = job.estimated_price;
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['web-worker-job', jobId] });
      alert(`Job marked as ${newStatus}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function uploadPhotos(type: 'before' | 'after') {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = e.target.files;
        if (!files.length) return;

        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${type}-${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage
            .from('order-evidence')
            .upload(fileName, file);

          if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
              .from('order-evidence')
              .getPublicUrl(data.path);
            urls.push(publicUrl);
          }
        }

        const field = type === 'before' ? 'before_media' : 'after_media';
        const existing = type === 'before' ? job?.before_media || [] : job?.after_media || [];
        const newUrls = [...existing, ...urls];

        const { error } = await supabase
          .from('orders')
          .update({ [field]: newUrls })
          .eq('id', jobId);

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['web-worker-job', jobId] });
        alert(`Uploaded ${urls.length} photos`);
      };
      input.click();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'matched': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Job not found</p>
          <button 
            onClick={() => router.push('/worker')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <button 
          onClick={() => router.back()}
          className="text-white mb-2 hover:underline"
        >
          ← Quay lại
        </button>
        <h1 className="text-3xl font-bold">Chi tiết việc làm</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Status */}
        <div className={`inline-block px-4 py-2 rounded-lg mb-6 ${getStatusColor(job.status)}`}>
          <p className="font-bold uppercase">{job.status}</p>
        </div>

        {/* Job Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Thông tin việc làm</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Danh mục</p>
              <p className="font-semibold">{job.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Giá dự kiến</p>
              <p className="font-semibold text-blue-600">${job.estimated_price}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Mô tả</p>
            <p className="mt-1">{job.description}</p>
          </div>
          {job.final_price && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Giá cuối cùng</p>
              <p className="font-semibold text-green-600">${job.final_price}</p>
            </div>
          )}
        </div>

        {/* Before Photos */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Ảnh trước khi sửa</h2>
            {job.status === 'in_progress' && (
              <button 
                onClick={() => uploadPhotos('before')}
                className="text-blue-600 hover:underline"
              >
                + Thêm ảnh
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {job.before_media?.map((url: string, idx: number) => (
              <img key={idx} src={url} alt="Before" className="w-24 h-24 object-cover rounded" />
            ))}
          </div>
        </div>

        {/* After Photos */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Ảnh sau khi sửa</h2>
            {job.status === 'in_progress' && (
              <button 
                onClick={() => uploadPhotos('after')}
                className="text-blue-600 hover:underline"
              >
                + Thêm ảnh
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {job.after_media?.map((url: string, idx: number) => (
              <img key={idx} src={url} alt="After" className="w-24 h-24 object-cover rounded" />
            ))}
          </div>
        </div>

        {/* Materials */}
        {job.status === 'in_progress' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Vật tư sử dụng</h2>
            <textarea
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="Enter materials used..."
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          {job.status === 'matched' && (
            <button
              onClick={() => updateStatus('in_progress')}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold"
            >
              Bắt đầu làm việc
            </button>
          )}

          {job.status === 'in_progress' && (
            <button
              onClick={() => updateStatus('completed')}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold"
            >
              Hoàn thành
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
