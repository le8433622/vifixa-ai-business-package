// Admin Dashboard Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Dashboard, manage users/workers/orders
// Per Step 3: Build admin flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  total_users: number;
  total_workers: number;
  total_orders: number;
  total_ai_calls: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/ai/admin-dashboard?action=dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold">{stats.total_users}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <p className="text-sm text-gray-600">Total Workers</p>
              <p className="text-3xl font-bold">{stats.total_workers}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold">{stats.total_orders}</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg">
              <p className="text-sm text-gray-600">AI Calls</p>
              <p className="text-3xl font-bold">{stats.total_ai_calls}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-6 bg-white border rounded-lg hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-2">Manage Users</h3>
              <p className="text-gray-600">View and manage all registered users</p>
            </button>

            <button
              onClick={() => router.push('/admin/workers')}
              className="p-6 bg-white border rounded-lg hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-2">Manage Workers</h3>
              <p className="text-gray-600">Verify worker profiles and trust scores</p>
            </button>

            <button
              onClick={() => router.push('/admin/orders')}
              className="p-6 bg-white border rounded-lg hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-2">Manage Orders</h3>
              <p className="text-gray-600">Track and manage all service orders</p>
            </button>

            <button
              onClick={() => router.push('/admin/disputes')}
              className="p-6 bg-white border rounded-lg hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-2">Disputes</h3>
              <p className="text-gray-600">Handle customer complaints and disputes</p>
            </button>

            <button
              onClick={() => router.push('/admin/ai-logs')}
              className="p-6 bg-white border rounded-lg hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-2">AI Logs</h3>
              <p className="text-gray-600">View AI diagnosis and pricing logs</p>
            </button>
          </div>
        </>
      ) : (
        <p>Failed to load dashboard stats.</p>
      )}
    </div>
  );
}
