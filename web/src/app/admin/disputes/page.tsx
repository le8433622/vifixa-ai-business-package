// Admin Disputes Management Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Handle disputes
// Per Step 3: Build admin flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Dispute {
  id: string;
  category: string;
  description: string;
  status: string;
  customer_email?: string;
  worker_id?: string;
  created_at: string;
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDisputes();
  }, []);

  async function fetchDisputes() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/ai/admin-dashboard?action=disputes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveDispute(orderId: string, action: 'complete' | 'refund') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newStatus = action === 'complete' ? 'completed' : 'cancelled';

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      alert(`Dispute ${action === 'complete' ? 'resolved - order completed' : 'resolved - order refunded'}`);
      fetchDisputes();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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

      <h1 className="text-3xl font-bold mb-6">Disputes</h1>

      {loading ? (
        <p>Loading...</p>
      ) : disputes.length === 0 ? (
        <p className="text-gray-600">No disputes currently.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="bg-white border border-red-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{dispute.category}</h3>
                  <p className="text-gray-600 mt-2">{dispute.description}</p>
                  <p className="text-sm text-gray-600 mt-2">Customer: {dispute.customer_email || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Date: {new Date(dispute.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveDispute(dispute.id, 'complete')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Complete Order
                  </button>
                  <button
                    onClick={() => resolveDispute(dispute.id, 'refund')}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Refund
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
