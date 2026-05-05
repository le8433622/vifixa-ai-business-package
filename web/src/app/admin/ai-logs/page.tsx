// Admin AI Logs Page
// Per 05_PRODUCT_SOLUTION.md - Admin flow: View AI usage
// Per Step 3: Build admin flows

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
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

export default function AdminAILogs() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Use API route to fetch logs (server-side with service role)
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

  function formatJSON(json: any) {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
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

      <h1 className="text-3xl font-bold mb-6">AI Logs</h1>

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
    </div>
  );
}
