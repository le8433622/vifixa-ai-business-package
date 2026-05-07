// Worker Dashboard Page
// Per 05_PRODUCT_SOLUTION.md - Worker flow
// Per Step 3: Build worker flows

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Job {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  customer_id: string;
  created_at: string;
}

interface Earnings {
  total_earnings: number;
  completed_jobs: number;
  avg_earnings: number;
  trust_score: number;
}

export default function WorkerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
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

      // Fetch jobs
      const jobsResponse = await fetch('/api/ai/worker-jobs?action=jobs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const jobsData = await jobsResponse.json();
      setJobs(jobsData.jobs || []);

      // Fetch earnings
      const earningsResponse = await fetch('/api/ai/worker-jobs?action=earnings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const earningsData = await earningsResponse.json();
      setEarnings(earningsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Worker Dashboard</h1>

      {earnings && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold">${earnings.total_earnings}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Completed Jobs</p>
            <p className="text-2xl font-bold">{earnings.completed_jobs}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Avg per Job</p>
            <p className="text-2xl font-bold">${earnings.avg_earnings}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Trust Score</p>
            <p className="text-2xl font-bold">{earnings.trust_score}</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => router.push('/worker/jobs')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          View All Jobs
        </button>
        <button
          onClick={() => router.push('/worker/profile')}
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
        >
          Edit Profile
        </button>
        <button
          onClick={() => router.push('/worker/earnings')}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
        >
          Earnings Details
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Recent Jobs</h2>

      {loading ? (
        <p>Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-600">No jobs assigned yet.</p>
      ) : (
        <div className="space-y-4">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{job.category}</h3>
                  <p className="text-gray-600 mt-2">{job.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {job.status}
                </span>
              </div>
              <button
                onClick={() => router.push(`/worker/jobs/${job.id}`)}
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
