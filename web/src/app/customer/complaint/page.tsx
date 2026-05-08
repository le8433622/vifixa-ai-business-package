// @ts-nocheck
'use client';
// Customer Complaint Page
// Per 12_OPERATIONS_AND_TRUST.md - Complaint handling
// Per Step 7: Trust & Quality - Task 8

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const COMPLAINT_TYPES = [
  'Chất lượng dịch vụ kém',
  'Thợ không đến đúng giờ',
  'Báo giá sai lệch quá nhiều',
  'Thợ thiếu chuyên nghiệp',
  'Vật tư không đúng như thỏa thuận',
  'Không hoàn thành công việc',
  'Thái độ phục vụ không tốt',
  'Khác',
];

export default function CustomerComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [orderId, setOrderId] = useState('');
  const [complaintType, setComplaintType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Read order_id from URL parameter
  const params = use(searchParams);
  const prefilledOrderId = params.order_id as string | undefined;

  // Fetch ALL customer orders (not just completed)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-orders-for-complaint'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return [];
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, category, description, status, completed_at, created_at')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Pre-select order from URL parameter
  useEffect(() => {
    if (prefilledOrderId && orders?.some(o => o.id === prefilledOrderId)) {
      setOrderId(prefilledOrderId);
    }
  }, [orders, prefilledOrderId]);

  // Submit complaint mutation
  const submitComplaintMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !complaintType || !description.trim()) {
        throw new Error('Vui lòng điền đầy đủ thông tin khiếu nại');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Chưa đăng nhập');

      const { error } = await supabase
        .from('complaints')
        .insert({
          order_id: orderId,
          customer_id: session.user.id,
          complaint_type: complaintType,
          description,
          status: 'pending',
        });

      if (error) throw error;

      // Call AI dispute function
      try {
        const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-dispute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            complainant_id: session.user.id,
            complaint_type: complaintType,
            description,
            evidence_urls: [],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.needs_human_review) {
            return { needsReview: true, summary: aiData.summary };
          }
        }
      } catch (aiError) {
        console.warn('AI dispute call failed:', aiError);
      }

      return { needsReview: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders-for-complaint'] });
      const message = data.needsReview
        ? 'AI đã xem xét và chuyển cho admin xử lý. Chúng tôi sẽ phản hồi sớm nhất.'
        : 'Khiếu nại của bạn đã được gửi thành công! Đội ngũ hỗ trợ sẽ xem xét và phản hồi sớm nhất.';
      alert(message);
      router.push('/customer/orders');
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Gửi khiếu nại</h1>

          <p className="text-gray-600 mb-6">
            Nếu bạn không hài lòng với dịch vụ, hãy gửi khiếu nại để chúng tôi xem xét và hỗ trợ bạn.
          </p>

          {/* Order Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn đơn hàng *
            </label>
            {isLoading ? (
              <p className="text-gray-600">Đang tải...</p>
            ) : orders?.length > 0 ? (
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Chọn đơn hàng --</option>
                {orders.map((order: any) => (
                  <option key={order.id} value={order.id}>
                    {order.category} - {new Date(order.completed_at || order.created_at).toLocaleDateString('vi-VN')} ({order.status})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-2">📋</div>
                <p className="mb-4">Bạn chưa có đơn hàng nào có thể khiếu nại</p>
                <button
                  onClick={() => router.push('/customer')}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ← Xem danh sách đơn hàng
                </button>
              </div>
            )}
          </div>

          {/* Complaint Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại khiếu nại *
            </label>
            <select
              value={complaintType}
              onChange={(e) => setComplaintType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Chọn loại khiếu nại --</option>
              {COMPLAINT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả chi tiết *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Quy trình xử lý:</strong><br />
              1. Hệ thống tiếp nhận khiếu nại<br />
              2. AI tóm tắt vấn đề<br />
              3. Admin xem xét và đưa ra quyết định<br />
              4. Bạn sẽ nhận được thông báo kết quả qua email
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={() => submitComplaintMutation.mutate()}
              disabled={submitComplaintMutation.isPending || !orderId || !complaintType || !description.trim()}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {submitComplaintMutation.isPending ? 'Đang gửi...' : 'Gửi khiếu nại'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
