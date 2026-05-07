// @ts-nocheck
'use client';

// Admin Complaints Management Page
// Per 12_OPERATIONS_AND_TRUST.md - Complaint handling
// Per Step 7: Trust & Quality - Task 8

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Complaint {
  id: string;
  order_id: string;
  customer_id: string;
  complaint_type: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  profiles?: {
    email: string;
  };
  orders?: {
    category: string;
    description: string;
    worker_id?: string;
  };
}

export default function AdminComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'investigating' | 'resolved' | 'rejected'>('all');

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  async function fetchComplaints() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      let query = supabase
        .from('complaints' as any)
        .select(`
          *,
          profiles:customer_id (email),
          orders:order_id (category, description, worker_id)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComplaints((data as any) || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateComplaintStatus(complaintId: string, newStatus: string, resolutionText?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution = resolutionText || '';
      }

      if (newStatus === 'investigating') {
        updateData.assigned_to = session.user.id;
      }

      const { error } = await supabase
        .from('complaints' as any)
        .update(updateData as any as any)
        .eq('id', complaintId);

      if (error) throw error;

      alert(`Khiếu nại đã được cập nhật thành: ${newStatus}`);
      setSelectedComplaint(null);
      setResolution('');
      fetchComplaints();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      investigating: 'Đang điều tra',
      resolved: 'Đã giải quyết',
      rejected: 'Đã từ chối',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => router.push('/admin')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6">Quản lý khiếu nại</h1>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {(['all', 'pending', 'investigating', 'resolved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`pb-2 px-4 capitalize ${
              filter === status
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            {status === 'all' ? 'Tất cả' : status}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {complaints.length === 0 ? (
        <p className="text-gray-600">Không có khiếu nại nào.</p>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Khiếu nại #{complaint.id.substring(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Khách hàng: {complaint.profiles?.email || 'N/A'} |
                    Ngày: {new Date(complaint.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                {getStatusBadge(complaint.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Loại khiếu nại</p>
                  <p className="font-medium">{complaint.complaint_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Đơn hàng</p>
                  <p className="font-medium">{complaint.orders?.category || 'N/A'}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Mô tả</p>
                <p className="mt-1 text-gray-900">{complaint.description}</p>
              </div>

              {/* Action Buttons */}
              {complaint.status === 'pending' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => updateComplaintStatus(complaint.id, 'investigating')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Bắt đầu điều tra
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Lý do từ chối:');
                      if (reason) updateComplaintStatus(complaint.id, 'rejected', reason);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Từ chối
                  </button>
                </div>
              )}

              {complaint.status === 'investigating' && (
                <div>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Nhập giải pháp xử lý..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        if (!resolution.trim()) {
                          alert('Vui lòng nhập giải pháp xử lý');
                          return;
                        }
                        updateComplaintStatus(complaint.id, 'resolved', resolution);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Giải quyết
                    </button>
                  </div>
                </div>
              )}

              {complaint.status === 'resolved' && (
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-green-800 font-medium">Đã giải quyết</p>
                  <p className="text-sm text-green-700 mt-1">{complaint.resolution}</p>
                </div>
              )}

              {complaint.status === 'rejected' && (
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-sm text-red-800 font-medium">Đã từ chối</p>
                  <p className="text-sm text-red-700 mt-1">{complaint.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
