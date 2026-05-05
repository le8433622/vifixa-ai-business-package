// Web Customer Order Detail
// Per 05_PRODUCT_SOLUTION.md - Customer flow: Track order with AI diagnosis
// Per Step 6: Web Flows with TanStack Query

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  estimated_price: number;
  final_price?: number;
  ai_diagnosis?: any;
  before_media?: string[];
  after_media?: string[];
  created_at: string;
  workers?: { user_id: string; profiles?: { email: string } };
}

export default function WebCustomerOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const queryClient = useQueryClient();

  const { data: order, isLoading, refetch } = useQuery({
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
      return data as Order;
    },
    enabled: !!orderId,
  });

  async function acceptPrice() {
    if (!order) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'matched' })
        .eq('id', orderId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['web-customer-order', orderId] });
      alert('Price accepted! Worker will be assigned soon.');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  function getStatusMessage(status: string) {
    switch (status) {
      case 'pending': return order?.ai_diagnosis 
        ? 'AI diagnosis complete. Waiting for your price confirmation...'
        : 'Waiting for AI diagnosis...';
      case 'matched': return 'Worker assigned! They will arrive soon.';
      case 'in_progress': return 'Worker is handling your issue...';
      case 'completed': return 'Job completed! Please confirm and rate.';
      case 'disputed': return 'Dispute in progress. Admin will review.';
      default: return 'Status unknown';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Order not found</p>
          <button 
            onClick={() => router.push('/customer')}
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
        <h1 className="text-3xl font-bold">Chi tiết đơn hàng</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Status */}
        <div className={`inline-block px-4 py-2 rounded-lg mb-6 ${getStatusColor(order.status)}`}>
          <p className="font-bold uppercase">{order.status}</p>
          <p className="text-sm mt-1">{getStatusMessage(order.status)}</p>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Thông tin đơn hàng</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Danh mục</p>
              <p className="font-semibold">{order.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ngày tạo</p>
              <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Mô tả</p>
            <p className="mt-1">{order.description}</p>
          </div>
        </div>

        {/* AI Diagnosis */}
        {order.ai_diagnosis && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
            <h2 className="text-xl font-bold mb-4 text-blue-800">Chẩn đoán AI</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-600 font-semibold">Chẩn đoán</p>
                <p className="text-blue-900">{order.ai_diagnosis.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-semibold">Mức độ</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  order.ai_diagnosis.severity === 'emergency' ? 'bg-red-200 text-red-800' :
                  order.ai_diagnosis.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                  order.ai_diagnosis.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {order.ai_diagnosis.severity}
                </span>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-semibold">Kỹ năng cần</p>
                <p className="text-blue-900">{order.ai_diagnosis.recommended_skills?.join(', ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Giá cả</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Giá dự kiến</p>
              <p className="text-2xl font-bold text-blue-600">${order.estimated_price}</p>
            </div>
            {order.final_price && (
              <div>
                <p className="text-sm text-gray-600">Giá cuối cùng</p>
                <p className="text-2xl font-bold text-green-600">${order.final_price}</p>
              </div>
            )}
          </div>

          {/* Accept/Reject Price */}
          {order.status === 'pending' && order.ai_diagnosis && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={acceptPrice}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold"
              >
                Chấp nhận giá
              </button>
              <button
                onClick={() => router.push('/customer/service-request')}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-bold"
              >
                Từ chối
              </button>
            </div>
          )}
        </div>

        {/* Worker Info */}
        {order.workers && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Thợ đang thực hiện</h2>
            <p className="text-gray-700">{order.workers.profiles?.email || 'N/A'}</p>
          </div>
        )}

        {/* Media */}
        {order.before_media && order.before_media.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Ảnh trước khi sửa</h2>
            <div className="flex gap-2 overflow-x-auto">
              {order.before_media.map((url: string, idx: number) => (
                <img key={idx} src={url} alt="Before" className="w-24 h-24 object-cover rounded" />
              ))}
            </div>
          </div>
        )}

        {order.after_media && order.after_media.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Ảnh sau khi sửa</h2>
            <div className="flex gap-2 overflow-x-auto">
              {order.after_media.map((url: string, idx: number) => (
                <img key={idx} src={url} alt="After" className="w-24 h-24 object-cover rounded" />
              ))}
            </div>
          </div>
        )}

        {/* Complete Button */}
        {order.status === 'completed' && (
          <button
            onClick={() => router.push(`/customer/orders/${order.id}/review`)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold"
          >
            Đánh giá & Xác nhận
          </button>
        )}
      </div>
    </div>
  );
}
