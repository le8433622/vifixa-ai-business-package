// Web Worker Job Detail
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Accept/start/complete job, upload photos
// Per Step 6: Web Flows with TanStack Query

'use client';


import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import QueryProvider from '@/components/QueryProvider';

interface Job {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  final_price?: number;
  before_media?: string[];
  after_media?: string[];
  created_at: string;
  customer_email?: string;
}

export default function WebWorkerJobDetail() {
  return (
    <QueryProvider>
      <JobDetailContent />
    </QueryProvider>
  );
}

function JobDetailContent() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [actionLoading, setActionLoading] = useState(false);

  const { data: job, isLoading } = useQuery({
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
        .select('*, profiles!orders_customer_id_fkey(email)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return {
        ...data,
        customer_email: data.profiles?.email,
      } as Job;
    },
    enabled: !!jobId,
  });

  async function updateStatus(newStatus: string) {
    if (!job || !window.confirm(`Update job status to ${newStatus}?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;
      alert(`Job ${newStatus} successfully!`);
      router.refresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadPhoto(type: 'before' | 'after') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('service-media')
        .upload(fileName, file);

      if (error) {
        alert(`Upload error: ${error.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('service-media')
        .getPublicUrl(data.path);

      const field = type === 'before' ? 'before_media' : 'after_media';
      const currentUrls = type === 'before' 
        ? (job?.before_media || [])
        : (job?.after_media || []);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ [field]: [...currentUrls, publicUrl] })
        .eq('id', jobId);

      if (updateError) {
        alert(`Update error: ${updateError.message}`);
        return;
      }

      alert('Photo uploaded successfully!');
      router.refresh();
    };
    input.click();
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!job) {
    return <div className="min-h-screen flex items-center justify-center">Job not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button 
          onClick={() => router.push('/worker')}
          className="text-white mb-2 hover:underline"
        >
          ← Quay lại Dashboard
        </button>
        <h1 className="text-3xl font-bold">Chi tiết công việc</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{job.category}</h2>
              <p className="text-gray-600 mt-1">{job.description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              job.status === 'completed' ? 'bg-green-100 text-green-800' :
              job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              job.status === 'disputed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {job.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Khách hàng</p>
              <p className="font-semibold">{job.customer_email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Giá chốt</p>
              <p className="font-semibold text-blue-600">${job.final_price || 'Chưa có'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ngày tạo</p>
              <p className="font-semibold">{new Date(job.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {job.status === 'matched' && (
              <button
                onClick={() => updateStatus('in_progress')}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Đang xử lý...' : 'Bắt đầu làm việc'}
              </button>
            )}

            {job.status === 'in_progress' && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Đang xử lý...' : 'Hoàn thành'}
              </button>
            )}
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Hình ảnh</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Trước khi làm</h4>
                <button
                  onClick={() => uploadPhoto('before')}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Thêm ảnh
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {job.before_media?.map((url, idx) => (
                  <img key={idx} src={url} alt="" className="w-full h-24 object-cover rounded" />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Sau khi làm</h4>
                <button
                  onClick={() => uploadPhoto('after')}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Thêm ảnh
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {job.after_media?.map((url, idx) => (
                  <img key={idx} src={url} alt="" className="w-full h-24 object-cover rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
