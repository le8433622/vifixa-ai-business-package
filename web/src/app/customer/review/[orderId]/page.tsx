// Customer Review Page
// Per 12_OPERATIONS_AND_TRUST.md - Review after service completion
// Per Step 7: Trust & Quality - Rating system

'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function CustomerReview() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['web-customer-order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID not found');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*, workers(user_id, profiles(email))')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  async function submitReview() {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Update order with rating
      const { error } = await supabase
        .from('orders')
        .update({ 
          rating,
          review_comment: comment,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update trust score (call API route)
      await fetch('/api/trust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worker_id: order?.workers?.user_id,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['web-customer-order', orderId] });
      alert('Review submitted! Thank you.');
      router.push(`/customer/orders/${orderId}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 hover:underline mb-6"
        >
          ← Back to Order
        </button>

        <h1 className="text-3xl font-bold mb-6">Đánh giá dịch vụ</h1>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Thông tin đơn hàng</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Danh mục</p>
              <p className="font-semibold">{order?.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mô tả</p>
              <p>{order?.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Thợ thực hiện</p>
              <p className="font-semibold">{order?.workers?.profiles?.email}</p>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Đánh giá của bạn</h2>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`w-12 h-12 text-3xl ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Nhận xét (tùy chọn)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              className="w-full px-4 py-3 border rounded-lg"
              rows={4}
            />
          </div>

          <button
            onClick={submitReview}
            disabled={submitting || rating === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold"
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
}
