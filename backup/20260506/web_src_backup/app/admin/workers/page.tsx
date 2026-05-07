// Admin Workers Management Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: Verify workers
// Per Step 3: Build admin flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Worker {
  user_id: string;
  email?: string;
  phone?: string;
  skills: string[];
  service_areas: string[];
  trust_score: number;
  is_verified: boolean;
  avg_earnings: number;
  created_at: string;
}

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/ai/admin-dashboard?action=workers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVerification(userId: string, currentStatus: boolean) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Call API route to update worker verification
      const response = await fetch('/api/admin/workers/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          is_verified: !currentStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update verification');
      }

      fetchWorkers();
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

      <h1 className="text-3xl font-bold mb-6">Manage Workers</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {workers.map((worker) => (
            <div key={worker.user_id} className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{worker.email}</h3>
                  <p className="text-gray-600">{worker.phone || 'No phone'}</p>
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Skills:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {worker.skills?.map((skill: string) => (
                        <span key={skill} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Service Areas:</p>
                    <p className="text-sm">{worker.service_areas?.join(', ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Trust Score</p>
                  <p className="text-2xl font-bold">{worker.trust_score || 50}</p>
                  <p className="text-sm text-gray-600 mt-2">Avg Earnings</p>
                  <p className="text-xl font-semibold">${worker.avg_earnings || 0}</p>
                  <button
                    onClick={() => toggleVerification(worker.user_id, worker.is_verified)}
                    className={`mt-3 px-4 py-2 rounded ${
                      worker.is_verified
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {worker.is_verified ? 'Revoke Verification' : 'Verify Worker'}
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

// Server client for admin operations
function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return supabase.from('workers').select('*'); // Placeholder - actual implementation in API route
}
