// @ts-nocheck
// Admin Disputes Management Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Handle disputes
// Per Step 3: Build admin flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Dispute {
  id: string;
  entity_id: string;
  entity_type: string;
  ai_decision: any;
  review_status: string;
  created_at: string;
  created_by: string;
  profiles?: { full_name: string; email: string };
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

      const { data, error } = await supabase
        .from('admin_review_queue')
        .select(`
          *,
          profiles:created_by (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
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
      const resolutionAction = action === 'complete' ? 'complete_order' : 'refund_customer';

      // Update admin review queue
      const { error: reviewError } = await supabase
        .from('admin_review_queue')
        .update({
          review_status: 'resolved',
          resolution_action: resolutionAction,
          resolved_by: session.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('entity_id', orderId)
        .eq('review_status', 'pending');

      if (reviewError) console.warn('Review queue update error:', reviewError);

      // Update order status
      const { error } = await supabase
        .from('orders' as any)
        .update({ status: newStatus } as any)
        .eq('id', orderId);

      if (error) throw error;
      alert(`Đã giải quyết: ${action === 'complete' ? 'Đơn hàng hoàn thành' : 'Đã hoàn tiền'}`);
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
          {disputes.map((dispute) => {
            const aiDecision = dispute.ai_decision || {};
            return (
              <div key={dispute.id} className="bg-white border border-red-200 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{dispute.entity_type}</h3>
                      {dispute.review_status === 'pending' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Chờ xem xét
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Order: {dispute.entity_id}
                    </p>
                    {dispute.profiles && (
                      <p className="text-sm text-gray-600">
                        Người gửi: {dispute.profiles.full_name} ({dispute.profiles.email})
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Ngày tạo: {new Date(dispute.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* AI Decision Results */}
                {aiDecision.summary && (
                  <div className="mt-4 p-4 bg-blue-50 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">🤖 Kết quả AI phân tích</h4>
                    <p className="text-sm text-blue-800 mb-2">{aiDecision.summary}</p>
                    {aiDecision.severity && (
                      <p className="text-sm">
                        <span className="font-medium">Mức độ:</span>{' '}
                        <span className={`px-2 py-1 rounded text-xs ${
                          aiDecision.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          aiDecision.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          aiDecision.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {aiDecision.severity}
                        </span>
                      </p>
                    )}
                    {aiDecision.recommended_action && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Đề xuất:</span> {aiDecision.recommended_action}
                      </p>
                    )}
                    {aiDecision.confidence && (
                      <p className="text-sm">
                        <span className="font-medium">Độ tin cậy:</span> {(aiDecision.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                    {aiDecision.explanation && (
                      <p className="text-xs text-blue-700 mt-2 italic">{aiDecision.explanation}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => resolveDispute(dispute.entity_id, 'complete')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Duyệt đơn hàng
                  </button>
                  <button
                    onClick={() => resolveDispute(dispute.entity_id, 'refund')}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Hoàn tiền
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
