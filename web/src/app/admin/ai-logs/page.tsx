// Admin AI Logs with Quality Metrics Dashboard
// Per 12_OPERATIONS_AND_TRUST.md - Quality metrics dashboard
// Per Step 7: Trust & Quality - Task 6

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AILog {
  id: string;
  order_id?: string;
  agent_type: string;
  input: any;
  output: any;
  created_at: string;
}

interface WorkerQuality {
  user_id: string;
  email: string;
  trust_score: number;
  total_orders: number;
  avg_rating: number;
  dispute_rate: number;
  verification_status: string;
}

interface QualityMetrics {
  avg_rating: number;
  dispute_rate: number;
  completion_rate: number;
  total_orders: number;
  disputed_orders: number;
  completed_orders: number;
  top_workers: WorkerQuality[];
  bottom_workers: WorkerQuality[];
}

export default function AdminAILogs() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'logs' | 'quality'>('logs');
  const [logs, setLogs] = useState<AILog[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [workers, setWorkers] = useState<WorkerQuality[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else {
      fetchQualityMetrics();
    }
  }, [activeTab]);

  async function fetchLogs() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/ai/admin-dashboard?action=ai-logs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQualityMetrics() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      // Fetch workers with quality metrics
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select(`
          user_id,
          trust_score,
          total_orders,
          avg_rating,
          dispute_rate,
          verification_status,
          profiles:user_id (email)
        `)
        .order('trust_score', { ascending: false });

      if (workersError) throw workersError;

      const workerQuality: WorkerQuality[] = (workersData || []).map((w: any) => ({
        user_id: w.user_id,
        email: (w.profiles as any)?.email || 'N/A',
        trust_score: w.trust_score || 0,
        total_orders: w.total_orders || 0,
        avg_rating: w.avg_rating || 0,
        dispute_rate: w.dispute_rate || 0,
        verification_status: w.verification_status || 'pending',
      }));

      setWorkers(workerQuality);

      // Calculate aggregate metrics
      const totalOrders = workerQuality.reduce((sum, w) => sum + w.total_orders, 0);
      const completedOrders = workerQuality.filter(w => w.total_orders > 0).length; // Simplified
      const disputedOrders = workerQuality.filter(w => w.dispute_rate > 0).length;

      const avgRating = workerQuality.length > 0
        ? workerQuality.reduce((sum, w) => sum + w.avg_rating, 0) / workerQuality.filter(w => w.avg_rating > 0).length
        : 0;

      const disputeRate = totalOrders > 0 ? (disputedOrders / totalOrders) * 100 : 0;

      setMetrics({
        avg_rating: avgRating,
        dispute_rate: disputeRate,
        completion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        total_orders: totalOrders,
        disputed_orders: disputedOrders,
        completed_orders: completedOrders,
        top_workers: workerQuality.slice(0, 5),
        bottom_workers: workerQuality.slice(-5).reverse(),
      });
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatJSON(json: any) {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }

  function getSeverityColor(score: number) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={() => router.push('/admin')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6">Trust & Quality Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-4 ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}`}
        >
          AI Logs
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`pb-2 px-4 ${activeTab === 'quality' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}`}
        >
          Quality Metrics
        </button>
      </div>

      {/* AI Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {loading ? (
            <p>Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-600">No AI logs yet.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{log.agent_type} Agent</h3>
                      <p className="text-sm text-gray-600">
                        Order: {log.order_id || 'N/A'} |
                        Date: {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {log.agent_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Input</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-48">
                        {formatJSON(log.input)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Output</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-48">
                        {formatJSON(log.output)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Quality Metrics Tab */}
      {activeTab === 'quality' && (
        <>
          {loading ? (
            <p>Loading quality metrics...</p>
          ) : metrics ? (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.avg_rating.toFixed(1)}/5
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Dispute Rate</p>
                  <p className={`text-2xl font-bold ${metrics.dispute_rate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.dispute_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className={`text-2xl font-bold ${metrics.completion_rate > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {metrics.completion_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.total_orders}
                  </p>
                </div>
              </div>

              {/* Top Workers by Trust Score */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Top Workers by Trust Score</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Trust Score</th>
                      <th className="text-left p-2">Orders</th>
                      <th className="text-left p-2">Avg Rating</th>
                      <th className="text-left p-2">Dispute Rate</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_workers.map((worker) => (
                      <tr key={worker.user_id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{worker.email}</td>
                        <td className={`p-2 font-bold ${getSeverityColor(worker.trust_score)}`}>
                          {worker.trust_score}
                        </td>
                        <td className="p-2">{worker.total_orders}</td>
                        <td className="p-2">{worker.avg_rating.toFixed(1)}/5</td>
                        <td className="p-2">{worker.dispute_rate.toFixed(1)}%</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            worker.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                            worker.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {worker.verification_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Workers by Trust Score */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Workers Needing Attention</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Trust Score</th>
                      <th className="text-left p-2">Orders</th>
                      <th className="text-left p-2">Avg Rating</th>
                      <th className="text-left p-2">Dispute Rate</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.bottom_workers.map((worker) => (
                      <tr key={worker.user_id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{worker.email}</td>
                        <td className={`p-2 font-bold ${getSeverityColor(worker.trust_score)}`}>
                          {worker.trust_score}
                        </td>
                        <td className="p-2">{worker.total_orders}</td>
                        <td className="p-2">{worker.avg_rating.toFixed(1)}/5</td>
                        <td className="p-2">{worker.dispute_rate.toFixed(1)}%</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            worker.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                            worker.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {worker.verification_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Failed to load quality metrics.</p>
          )}
        </>
      )}
    </div>
  );
}
