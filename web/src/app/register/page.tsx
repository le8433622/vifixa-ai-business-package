// Vifixa AI v2.0 — Premium Register Page
// Split-screen with animated gradient, role selection cards

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, phone, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-mesh items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] animate-float delay-300" />
        </div>
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl shadow-2xl mx-auto mb-8">
            ✨
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Tham gia Vifixa AI
          </h2>
          <p className="text-blue-100/60 leading-relaxed">
            Tạo tài khoản miễn phí. Đặt dịch vụ sửa chữa thông minh hoặc trở thành thợ chuyên nghiệp.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '🤖', text: 'AI Chẩn đoán' },
              { icon: '💰', text: 'Giá minh bạch' },
              { icon: '🛡️', text: 'Bảo hành 30 ngày' },
            ].map((f) => (
              <div key={f.text} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs text-blue-200/60">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[hsl(var(--vf-bg))]">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold">V</div>
            <span className="text-xl font-bold text-[hsl(var(--vf-text))]">Vifixa AI</span>
          </div>

          <h1 className="text-3xl font-bold text-[hsl(var(--vf-text))] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Đăng ký
          </h1>
          <p className="text-[hsl(var(--vf-text-secondary))] mb-8">Tạo tài khoản miễn phí để bắt đầu</p>

          {error && (
            <div className="animate-scale-in mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Bạn muốn:</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'customer' as const, icon: '🏠', label: 'Đặt dịch vụ', desc: 'Khách hàng' },
                  { val: 'worker' as const, icon: '🔧', label: 'Nhận việc', desc: 'Thợ chuyên nghiệp' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRole(opt.val)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      role === opt.val
                        ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10'
                        : 'border-[hsl(var(--vf-border))] hover:border-[hsl(var(--vf-text-muted))]'
                    }`}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <p className="font-bold text-sm text-[hsl(var(--vf-text))]">{opt.label}</p>
                    <p className="text-xs text-[hsl(var(--vf-text-muted))]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--vf-text-muted))] hover:text-[hsl(var(--vf-text))]">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--vf-text))] mb-2">Số điện thoại <span className="text-[hsl(var(--vf-text-muted))]">(tùy chọn)</span></label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full btn-primary !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                'Đăng ký miễn phí →'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[hsl(var(--vf-text-secondary))]">
              Đã có tài khoản?{' '}
              <button onClick={() => router.push('/login')} className="text-blue-500 hover:text-blue-400 font-semibold">
                Đăng nhập
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
