// Warranty Claim Page
// Per 12_OPERATIONS_AND_TRUST.md - 30-day warranty
// Per Step 7: Trust & Quality - Task 7

'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface WarrantyOrder {
  id: string;
  category: string;
  description: string;
  status: string;
  completed_at?: string;
}

export default function CustomerWarrantyPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const queryClient = useQueryClient();

  const [claimReason, setClaimReason] = useState('');
  const [isEligible, setIsEligible] = useState(false);
  const [error, setError] = useState('');

  // Fetch order details and check warranty eligibility
  const { data: order, isLoading } = useQuery<WarrantyOrder | null>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as WarrantyOrder;
    },
  });

  // Check warranty eligibility (30 days from completion)
  useEffect(() => {
    if (order?.status === 'completed' && order.completed_at) {
      const completedDate = new Date(order.completed_at);
      const thirtyDaysLater = new Date(completedDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const now = new Date();
      setIsEligible(now <= thirtyDaysLater);
    }
  }, [order]);

  // Submit warranty claim
  const submitClaimMutation = useMutation({
    mutationFn: async () => {
      if (!claimReason.trim()) {
        throw new Error('Vui lòng nhập lý do yêu cầu bảo hành');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Chưa đăng nhập');

      // Create warranty claim
      const { error } = await (supabase as any)
        .from('warranty_claims')
        .insert({
          order_id: orderId,
          customer_id: session.user.id,
          claim_reason: claimReason,
          status: 'pending',
        } as any);

      if (error) throw error;

      // Create dispute for the order
      const { error: disputeError } = await (supabase as any)
        .from('orders')
        .update({ status: 'disputed' } as any)
        .eq('id', orderId);

      if (disputeError) throw disputeError;

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
            complaint_type: 'warranty',
            description: claimReason,
            evidence_urls: [],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.needs_human_review) {
            return { needsReview: true };
          }
        }
      } catch (aiError) {
        console.warn('AI dispute call failed:', aiError);
      }

      return { needsReview: false };
    },
    onSuccess: (data) => {
      const message = data.needsReview
        ? 'AI đã xem xét và chuyển cho admin xử lý. Chúng tôi sẽ phản hồi sớm nhất.'
        : 'Yêu cầu bảo hành đã được gửi thành công! Chúng tôi sẽ xem xét và phản hồi sớm nhất.';
      alert(message);
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

  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hết hạn bảo hành</h2>
          <p className="text-gray-600 mb-6">
            Đơn hàng này đã quá thời hạn bảo hành 30 ngày kể từ ngày hoàn thành.
          </p>
          <button
            onClick={() => router.push('/customer/orders')}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Xem đơn hàng khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Yêu cầu bảo hành</h1>

          {/* Order Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-600">Mã đơn hàng: {order.id}</p>
            <p className="text-sm text-blue-600">Danh mục: {order.category}</p>
            <p className="text-sm text-blue-600">Mô tả: {order.description}</p>
            <p className="text-sm text-blue-600 mt-2">
              📅 Hoàn thành: {new Date(order.completed_at).toLocaleDateString('vi-VN')}
            </p>
            <p className="text-sm text-green-600 font-medium mt-2">
              ✅ Trong thời hạn bảo hành (30 ngày)
            </p>
          </div>

          {/* Claim Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do yêu cầu bảo hành *
            </label>
            <textarea
              value={claimReason}
              onChange={(e) => setClaimReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả chi tiết vấn đề cần bảo hành..."
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
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Yêu cầu bảo hành sẽ được xem xét bởi đội ngũ kỹ thuật. 
              Nếu hợp lệ, thợ sẽ đến kiểm tra và sửa chữa miễn phí trong vòng 48 giờ.
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
              onClick={() => submitClaimMutation.mutate()}
              disabled={submitClaimMutation.isPending || !claimReason.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitClaimMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu bảo hành'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
