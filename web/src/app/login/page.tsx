// Vifixa AI v2.0 — Premium Login Page
// Split-screen with animated gradient background

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkRoleAndRedirect(session.user.id);
    });
  }, []);

  async function checkRoleAndRedirect(userId: string) {
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const profile = data as { role?: string } | null;
      if (profile?.role === 'customer') router.replace('/customer');
      else if (profile?.role === 'worker') router.replace('/worker');
      else if (profile?.role === 'admin') router.replace('/admin');
      else router.replace('/');
    } catch (err) {
      console.error('Role check failed:', err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await supabase.auth.refreshSession();
      checkRoleAndRedirect(data.user.id);
    } catch (error: any) {
      setError(error.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-mesh items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] animate-float delay-300" />
        </div>
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-3xl shadow-2xl mx-auto mb-8">
            V
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Chào mừng trở lại
          </h2>
          <p className="text-blue-100/60 leading-relaxed">
            Đăng nhập để tiếp tục quản lý dịch vụ sửa chữa nhà thông minh với AI.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-blue-200/50">
            <span>✅ Chẩn đoán AI</span>
            <span>🔒 An toàn</span>
            <span>⚡ 24/7</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[hsl(var(--vf-bg))]">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">V</div>
            <span className="text-xl font-bold text-[hsl(var(--vf-text))]">Vifixa AI</span>
          </div>

          <h1 className="text-3xl font-bold text-[hsl(var(--vf-text))] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Đăng nhập
          </h1>
          <p className="text-[hsl(var(--vf-text-secondary))] mb-8">
            Nhập thông tin đăng nhập để tiếp tục
          </p>

          {error && (
            <div className="animate-scale-in mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--vf-text-muted))] hover:text-[hsl(var(--vf-text))] transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                'Đăng nhập →'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[hsl(var(--vf-text-secondary))] text-sm">
              Chưa có tài khoản?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
              >
                Đăng ký miễn phí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
