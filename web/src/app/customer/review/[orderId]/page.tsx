// @ts-nocheck
// Customer Review Page
// Per 12_OPERATIONS_AND_TRUST.md - Review/rating system
// Per Step 7: Trust & Quality - Task 4

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ReviewPageProps {
  params: { orderId: string };
}

export default function CustomerReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.orderId;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const { data, error } = await supabase
        .from('orders' as any)
        .select(`
          *,
          workers:worker_id (
            user_id,
            profiles:user_id (email, phone)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) {
        throw new Error('Vui lòng chọn số sao đánh giá');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Chưa đăng nhập');

      // Update order with rating and review
      const { error } = await supabase
        .from('orders' as any)
        .update({
          rating,
          review_comment: comment,
        } as any)
        .eq('id', orderId);

      if (error) throw error;

      // Trigger trust score recalculation for worker
      if (order?.worker_id) {
        await fetch('/api/trust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ worker_id: order.worker_id }),
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      alert('Cảm ơn bạn đã đánh giá!');
      router.push('/customer');
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Không tìm thấy đơn hàng</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Đánh giá dịch vụ</h1>

          {/* Order Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Mã đơn hàng: {order.id}</p>
            <p className="text-sm text-gray-600">Danh mục: {order.category}</p>
            <p className="text-sm text-gray-600">Mô tả: {order.description}</p>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đánh giá của bạn *
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl focus:outline-none"
                  style={{ color: star <= (hoverRating || rating) ? '#FBBF24' : '#D1D5DB' }}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {rating === 1 && 'Rất không hài lòng'}
              {rating === 2 && 'Không hài lòng'}
              {rating === 3 && 'Bình thường'}
              {rating === 4 && 'Hài lòng'}
              {rating === 5 && 'Rất hài lòng'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét (tùy chọn)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={() => submitReviewMutation.mutate()}
              disabled={submitReviewMutation.isPending || rating === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitReviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
