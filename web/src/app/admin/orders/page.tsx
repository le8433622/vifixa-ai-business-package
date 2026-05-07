// Admin Orders Management Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Track orders
// Per Step 3: Build admin flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface Order {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  final_price?: number;
  customer_email?: string;
  created_at: string;
  fraud_alerts?: any[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/ai/admin-dashboard?action=orders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkFraud(orderId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-fraud-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          user_id: session.user.id,
          check_type: 'suspicious_activity',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.alerts?.length > 0) {
          alert(`Phát hiện ${data.alerts.length} cảnh báo gian lận!`);
        } else {
          alert('Không phát hiện gian lận.');
        }
        fetchOrders();
      }
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => router.push('/admin')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className={order.fraud_alerts?.length > 0 ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{order.category}</p>
                        <p className="text-sm text-gray-600 truncate max-w-xs">{order.description}</p>
                        {order.fraud_alerts?.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                            ⚠️ {order.fraud_alerts.length} cảnh báo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{order.customer_email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'disputed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">${order.estimated_price}</td>
                    <td className="px-6 py-4">{order.final_price ? `$${order.final_price}` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => checkFraud(order.id)}
                        className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200"
                      >
                        Check Fraud
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
