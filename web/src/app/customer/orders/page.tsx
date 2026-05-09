// Customer Orders List Page
// Per 05_PRODUCT_SOLUTION.md - Order Tracking
// Fix: Dashboard links to /customer/orders but it 404s

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface Order {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  final_price?: number;
  ai_diagnosis?: any;
  rating?: number;
  worker_id?: string;
  created_at: string;
  completed_at?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã ghép thợ',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Khiếu nại',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  matched: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  disputed: 'bg-red-100 text-red-800',
};

const CATEGORY_ICONS: Record<string, string> = {
  'electricity': '🔌',
  'plumbing': '🚿',
  'appliance': '🔧',
  'air_conditioning': '❄️',
  'camera': '📷',
  'general': '📦',
};

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customer-orders-all'],
    queryFn: async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login');
        return [];
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });
      // NO limit(5) - show ALL orders

      if (error) throw error;
      return data as Order[];
    },
  });

  // Realtime subscription: auto-refresh when orders change
  useEffect(() => {
    const channel = supabase
      .channel('customer-orders-realtime')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'orders' },
        () => { refetch() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Đơn hàng của tôi</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredOrders.length} / {orders.length} đơn hàng
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/customer/chat')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <span className="text-xl">💬</span>
            Đặt dịch vụ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo danh mục, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-700 mb-4">{error.message || 'Lỗi tải dữ liệu'}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? 'Không tìm thấy đơn hàng phù hợp' 
              : 'Bạn chưa có đơn hàng nào'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Thử thay đổi bộ lọc để xem thêm đơn hàng'
              : 'Đặt dịch vụ ngay để trải nghiệm sự tiện lợi từ Vifixa AI'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => router.push('/customer/chat')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <span className="text-xl">💬</span>
              Chat với AI để đặt dịch vụ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/customer/orders/${order.id}`)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xl">{CATEGORY_ICONS[order.category] || '📦'}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{order.category}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 text-sm mb-3">{order.description}</p>
                  
                  {order.ai_diagnosis && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🤖</span>
                        <span className="text-sm font-medium text-blue-700">AI Chẩn đoán</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-1">{order.ai_diagnosis.diagnosis}</p>
                    </div>
                  )}
                </div>

                <div className="text-right sm:min-w-[120px]">
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice(order.final_price ?? order.estimated_price)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/customer/orders/${order.id}`);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
