// Vifixa AI v2.0 — Premium Admin Dashboard
// Revenue metrics, management grid, glassmorphism cards

'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  total_users: number;
  total_workers: number;
  total_orders: number;
  total_ai_calls: number;
}

const ADMIN_MODULES = [
  { emoji: '👥', label: 'Quản lý Users', desc: 'Xem, tìm kiếm người dùng', href: '/admin/users', gradient: 'from-blue-500 to-indigo-500' },
  { emoji: '🔧', label: 'Quản lý Thợ', desc: 'Xác minh, trust score', href: '/admin/workers', gradient: 'from-emerald-500 to-teal-500' },
  { emoji: '📋', label: 'Quản lý Đơn hàng', desc: 'Theo dõi, phân bổ', href: '/admin/orders', gradient: 'from-violet-500 to-purple-500' },
  { emoji: '⚖️', label: 'Khiếu nại', desc: 'Xử lý tranh chấp', href: '/admin/disputes', gradient: 'from-amber-500 to-orange-500' },
  { emoji: '🤖', label: 'AI Logs', desc: 'Chẩn đoán, giá AI', href: '/admin/ai-logs', gradient: 'from-cyan-500 to-blue-500' },
  { emoji: '✅', label: 'AI Approvals', desc: 'Hàng đợi duyệt tự động', href: '/admin/approvals', gradient: 'from-rose-500 to-pink-500' },
  { emoji: '📊', label: 'Chat KPIs', desc: 'Conversion, drop-off, funnel', href: '/admin/chat-kpis', gradient: 'from-indigo-500 to-violet-500' },
  { emoji: '💰', label: 'Price Accuracy', desc: 'So sánh giá AI vs thực tế', href: '/admin/price-accuracy', gradient: 'from-teal-500 to-emerald-500' },
  { emoji: '⚙️', label: 'Cài đặt', desc: 'Feature flags, wallet, hệ thống', href: '/admin/settings', gradient: 'from-gray-500 to-gray-600' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setApiError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setLoading(false);
          return;
        }

        const response = await fetch('/api/ai/admin-dashboard?action=dashboard', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setStats(data.stats);
        } else {
          const errBody = await response.text();
          if (!cancelled) setApiError(`Lỗi ${response.status}: ${errBody.slice(0, 200)}`);
        }
      } catch (err) {
        if (!cancelled) setApiError('Lỗi kết nối. Vui lòng tải lại trang.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="font-bold text-[hsl(var(--vf-text))]">Admin Panel</span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="text-sm text-[hsl(var(--vf-text-muted))] hover:text-[hsl(var(--vf-text))] transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-mesh p-8 animate-fade-in-up">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/15 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px]" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Admin Dashboard 🎯
            </h1>
            <p className="text-blue-100/60">Tổng quan hệ thống Vifixa AI</p>
          </div>
        </div>

        {apiError && (
          <div className="card p-5 border-red-200 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400 text-sm mb-3">⚠️ {apiError}</p>
            <button onClick={fetchStats} className="btn-primary text-sm">Thử lại</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up delay-100">
            {[
              { icon: '👥', value: stats.total_users, label: 'Tổng Users', color: 'from-blue-500/10 to-blue-500/5' },
              { icon: '🔧', value: stats.total_workers, label: 'Tổng Thợ', color: 'from-emerald-500/10 to-emerald-500/5' },
              { icon: '📋', value: stats.total_orders, label: 'Tổng Đơn', color: 'from-violet-500/10 to-violet-500/5' },
              { icon: '🤖', value: stats.total_ai_calls, label: 'AI Calls', color: 'from-amber-500/10 to-amber-500/5' },
            ].map((stat) => (
              <div key={stat.label} className={`card p-5 bg-gradient-to-br ${stat.color}`}>
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl sm:text-3xl font-bold text-[hsl(var(--vf-text))]">{stat.value}</div>
                <div className="text-xs text-[hsl(var(--vf-text-muted))] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Admin Modules Grid */}
        <div className="animate-fade-in-up delay-200">
          <h2 className="text-base font-bold text-[hsl(var(--vf-text))] mb-4">🔧 Quản lý hệ thống</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADMIN_MODULES.map((mod) => (
              <button
                key={mod.href}
                onClick={() => router.push(mod.href)}
                className="group card p-5 text-left hover:!shadow-xl"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                  {mod.emoji}
                </div>
                <h3 className="font-bold text-[hsl(var(--vf-text))] mb-1">{mod.label}</h3>
                <p className="text-sm text-[hsl(var(--vf-text-muted))]">{mod.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
