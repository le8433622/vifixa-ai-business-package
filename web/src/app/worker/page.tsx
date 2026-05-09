// Vifixa AI v2.0 — Premium Worker Dashboard
// Gradient stats, earnings overview, job cards with status

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ nhận', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  matched: { label: 'Đã ghép', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  in_progress: { label: 'Đang làm', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Đã hủy', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

const CATEGORY_ICONS: Record<string, string> = {
  electricity: '⚡', plumbing: '🚿', appliance: '🔧',
  air_conditioning: '❄️', camera: '📷', painting: '🎨',
  lock_smith: '🔑',
};

const NAV_ITEMS = [
  { emoji: '📋', label: 'Việc mới', href: '/worker/jobs' },
  { emoji: '💰', label: 'Thu nhập', href: '/worker/earnings' },
  { emoji: '📜', label: 'Lịch sử', href: '/worker/history' },
  { emoji: '🤖', label: 'AI Coach', href: '/worker/coach' },
  { emoji: '🛡️', label: 'Trust', href: '/worker/trust' },
  { emoji: '👤', label: 'Hồ sơ', href: '/worker/profile' },
];

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function WorkerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const [jobsRes, earningsRes] = await Promise.all([
        fetch('/api/ai/worker-jobs?action=jobs', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
        fetch('/api/ai/worker-jobs?action=earnings', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }),
      ]);

      const jobsData = await jobsRes.json();
      const earningsData = await earningsRes.json();
      setJobs(jobsData.jobs || []);
      setEarnings(earningsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--vf-bg))]">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--vf-bg))]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass-strong border-b border-[hsl(var(--vf-border))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs">V</div>
            <span className="font-bold text-[hsl(var(--vf-text))]">Thợ chuyên nghiệp</span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap text-[hsl(var(--vf-text-secondary))] hover:bg-[hsl(var(--vf-bg-subtle))] hover:text-[hsl(var(--vf-text))] transition-all"
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 animate-fade-in-up">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-[40px]" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Xin chào! 🔧
            </h1>
            <p className="text-emerald-100/70 mb-4">
              Hôm nay có {jobs.filter(j => j.status === 'pending' || j.status === 'matched').length} việc đang chờ bạn.
            </p>
            <button
              onClick={() => router.push('/worker/jobs')}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-lg"
            >
              📋 Xem việc mới
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up delay-100">
          {[
            { icon: '💰', value: earnings ? formatVnd(earnings.total_earnings) : '0₫', label: 'Thu nhập', color: 'from-emerald-500/10 to-emerald-500/5' },
            { icon: '✅', value: earnings?.completed_jobs || 0, label: 'Đơn hoàn thành', color: 'from-blue-500/10 to-blue-500/5' },
            { icon: '📊', value: earnings ? formatVnd(earnings.avg_earnings) : '0₫', label: 'TB/đơn', color: 'from-violet-500/10 to-violet-500/5' },
            { icon: '🛡️', value: earnings?.trust_score || 0, label: 'Trust Score', color: 'from-amber-500/10 to-amber-500/5' },
          ].map((stat) => (
            <div key={stat.label} className={`card p-4 bg-gradient-to-br ${stat.color}`}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-lg sm:text-xl font-bold text-[hsl(var(--vf-text))] truncate">{stat.value}</div>
              <div className="text-xs text-[hsl(var(--vf-text-muted))] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up delay-200">
          {[
            { emoji: '📋', label: 'Việc mới', href: '/worker/jobs', gradient: 'from-blue-500 to-indigo-500' },
            { emoji: '💰', label: 'Thu nhập', href: '/worker/earnings', gradient: 'from-emerald-500 to-teal-500' },
            { emoji: '🤖', label: 'AI Coach', href: '/worker/coach', gradient: 'from-violet-500 to-purple-500' },
            { emoji: '🛡️', label: 'Xác minh', href: '/worker/verify', gradient: 'from-amber-500 to-orange-500' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="group card p-4 text-center hover:!shadow-xl"
            >
              <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                {action.emoji}
              </div>
              <p className="text-sm font-medium text-[hsl(var(--vf-text))]">{action.label}</p>
            </button>
          ))}
        </div>

        {/* Recent Jobs */}
        <div className="card p-5 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[hsl(var(--vf-text))]">📋 Việc gần đây</h2>
            <button onClick={() => router.push('/worker/jobs')} className="text-sm text-blue-500 hover:text-blue-400 font-medium">
              Xem tất cả →
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-[hsl(var(--vf-text-secondary))]">Chưa có việc nào</p>
              <p className="text-sm text-[hsl(var(--vf-text-muted))] mt-1">Hoàn tất hồ sơ và xác minh để nhận việc</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job, i) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-[hsl(var(--vf-border))] hover:border-emerald-500/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/worker/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{CATEGORY_ICONS[job.category] || '📦'}</span>
                          <span className="font-semibold text-[hsl(var(--vf-text))] text-sm capitalize">{job.category?.replace('_', ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-[hsl(var(--vf-text-secondary))] line-clamp-1">{job.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[hsl(var(--vf-text))]">{formatVnd(job.estimated_price)}</p>
                        <p className="text-xs text-[hsl(var(--vf-text-muted))] mt-1">
                          {new Date(job.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
