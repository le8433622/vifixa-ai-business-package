// Customer Dashboard Page
// Per 05_PRODUCT_SOLUTION.md - Customer flow
// Per Step 3: Build customer flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  ai_diagnosis?: any;
  created_at: string;
}

export default function CustomerDashboard() {
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

      const response = await fetch('/api/ai/customer-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Customer Dashboard</h1>

      <div className="mb-8">
        <button
          onClick={() => router.push('/customer/service-request')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          New Service Request
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">My Orders</h2>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-600">No orders yet. Create a service request to get started.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{order.category}</h3>
                  <p className="text-gray-600 mt-2">{order.description}</p>
                  {order.ai_diagnosis && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <p className="font-semibold">AI Diagnosis:</p>
                      <p>{order.ai_diagnosis.diagnosis}</p>
                      <p className="text-sm text-gray-600">Severity: {order.ai_diagnosis.severity}</p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                  <p className="mt-2 font-semibold">${order.estimated_price}</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/customer/orders/${order.id}`)}
                className="mt-3 text-blue-600 hover:underline"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
