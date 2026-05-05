// Worker Earnings Page
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Track earnings, trust score
// Per Step 3: Build worker flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Earnings {
  total_earnings: number;
  completed_jobs: number;
  avg_earnings: number;
  trust_score: number;
}

interface Job {
  id: string;
  category: string;
  final_price: number;
  status: string;
  created_at: string;
}

export default function WorkerEarnings() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Fetch earnings summary
      const earningsResponse = await fetch('/api/ai/worker-jobs?action=earnings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const earningsData = await earningsResponse.json();
      setEarnings(earningsData);

      // Fetch completed jobs
      const { data: jobs, error } = await supabase
        .from('orders')
        .select('id, category, final_price, status, created_at')
        .eq('worker_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!error && jobs) {
        setCompletedJobs(jobs);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.push('/worker')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6">Earnings</h1>

      {earnings && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold">${earnings.total_earnings}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Completed Jobs</p>
              <p className="text-2xl font-bold">{earnings.completed_jobs}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Average per Job</p>
              <p className="text-2xl font-bold">${earnings.avg_earnings}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Trust Score</p>
              <p className="text-2xl font-bold">{earnings.trust_score}</p>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Trust Score Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Current Score</span>
                <span className="font-semibold">{earnings.trust_score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    earnings.trust_score >= 80 ? 'bg-green-600' :
                    earnings.trust_score >= 60 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${earnings.trust_score}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {earnings.trust_score >= 80 ? 'Excellent! You have high trust.' :
                 earnings.trust_score >= 60 ? 'Good standing. Keep up the good work!' :
                 'Improve your score by completing more jobs and getting positive reviews.'}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Completed Jobs History</h2>
        {completedJobs.length === 0 ? (
          <p className="text-gray-600">No completed jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {completedJobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{job.category}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">${job.final_price}</p>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
