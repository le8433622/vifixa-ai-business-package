// Customer Order Details Page with Review Button
// Per 05_PRODUCT_SOLUTION.md - Customer flow
// Per Step 7: Trust & Quality - Add review button after completion

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  final_price?: number;
  rating?: number;
  review_comment?: string;
  created_at: string;
  completed_at?: string;
  ai_diagnosis?: any;
  before_media?: any[];
  after_media?: any[];
  workers?: {
    user_id: string;
    profiles?: {
      email: string;
      phone?: string;
    };
  };
}

export default function CustomerOrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const orderId = params.id;
  const [isWarrantyEligible, setIsWarrantyEligible] = useState(false);

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
        .from('orders')
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
      return data as OrderDetails;
    },
  });

  // Check warranty eligibility (30 days from completion)
  useEffect(() => {
    if (order?.status === 'completed' && order.completed_at) {
      const completedDate = new Date(order.completed_at);
      const thirtyDaysLater = new Date(completedDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const now = new Date();
      setIsWarrantyEligible(now <= thirtyDaysLater);
    }
  }, [order]);

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      matched: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      disputed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      matched: 'Đã ghép thợ',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      disputed: 'Khiếu nại',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
            {getStatusBadge(order.status)}
          </div>

          {/* Order Info */}
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Mã đơn hàng</p>
              <p className="font-medium">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Danh mục</p>
              <p className="font-medium">{order.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mô tả</p>
              <p className="font-medium">{order.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Giá dự kiến</p>
              <p className="font-medium">${order.estimated_price}</p>
            </div>
            {order.final_price && (
              <div>
                <p className="text-sm text-gray-600">Giá cuối cùng</p>
                <p className="font-medium">${order.final_price}</p>
              </div>
            )}
            {order.workers?.profiles && (
              <div>
                <p className="text-sm text-gray-600">Thợ thực hiện</p>
                <p className="font-medium">{order.workers.profiles.email}</p>
              </div>
            )}
          </div>

          {/* AI Diagnosis */}
          {order.ai_diagnosis && (
            <div className="mb-6 p-4 bg-blue-50 rounded">
              <h3 className="font-medium text-blue-900 mb-2">Chẩn đoán AI</h3>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                {JSON.stringify(order.ai_diagnosis, null, 2)}
              </pre>
            </div>
          )}

          {/* Rating Display (if already reviewed) */}
          {order.rating && (
            <div className="mb-6 p-4 bg-green-50 rounded">
              <h3 className="font-medium text-green-900 mb-2">Đánh giá của bạn</h3>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= order.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-green-800">({order.rating}/5)</span>
              </div>
              {order.review_comment && (
                <p className="mt-2 text-sm text-green-800">{order.review_comment}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Quay lại
            </button>

            {/* Review Button - Show only if completed and not yet reviewed */}
            {order.status === 'completed' && !order.rating && (
              <Link href={`/customer/review/${order.id}`}>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                  Đánh giá dịch vụ
                </button>
              </Link>
            )}

            {/* Warranty Claim Button - Show if within 30 days of completion */}
            {isWarrantyEligible && (
              <Link href={`/customer/warranty/${order.id}`}>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Yêu cầu bảo hành
                </button>
              </Link>
            )}

            {/* Complaint Button */}
            {order.status === 'completed' && (
              <Link href={`/customer/complaint?order_id=${order.id}`}>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Khiếu nại
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
