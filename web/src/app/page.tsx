// Vifixa AI v2.0 — Premium Landing Page
// Hero with animated gradient, social proof, service grid, testimonials

'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const SERVICES = [
  { icon: '❄️', label: 'Điện lạnh', desc: 'Máy lạnh, tủ lạnh, máy nước nóng', gradient: 'from-cyan-500 to-blue-500' },
  { icon: '⚡', label: 'Điện dân dụng', desc: 'Sửa điện, lắp đèn, ổ cắm', gradient: 'from-amber-500 to-orange-500' },
  { icon: '🚿', label: 'Nước & Ống', desc: 'Thông tắc, rò rỉ, lắp mới', gradient: 'from-blue-500 to-indigo-500' },
  { icon: '📷', label: 'Camera & Khóa', desc: 'Lắp camera, sửa khóa thông minh', gradient: 'from-violet-500 to-purple-500' },
  { icon: '🔧', label: 'Đồ gia dụng', desc: 'Máy giặt, lò vi sóng, quạt', gradient: 'from-emerald-500 to-teal-500' },
  { icon: '🏠', label: 'Sơn & Trát', desc: 'Sơn nhà, trám vá, chống thấm', gradient: 'from-rose-500 to-pink-500' },
];

const STATS = [
  { value: 1200, suffix: '+', label: 'Thợ xác minh' },
  { value: 5800, suffix: '+', label: 'Đơn hoàn thành' },
  { value: 4.8, suffix: '★', label: 'Đánh giá TB' },
  { value: 60, suffix: 's', label: 'Đặt đơn trung bình' },
];

const TESTIMONIALS = [
  { name: 'Nguyễn Minh Hòa', role: 'Khách hàng', avatar: '👩', content: 'AI chẩn đoán chính xác, thợ đến đúng giờ. Giá rẻ hơn ngoài 30%!', rating: 5 },
  { name: 'Trần Văn Dũng', role: 'Thợ điện lạnh', avatar: '👨‍🔧', content: 'Thu nhập tăng 40% kể từ khi tham gia Vifixa. Ứng dụng dễ sử dụng.', rating: 5 },
  { name: 'Lê Thị Mai', role: 'Khách hàng', avatar: '👩‍💼', content: 'Tuyệt vời! Chat với AI như nói chuyện với chuyên gia thật vậy.', rating: 5 },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current * 10) / 10);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
      {Number.isInteger(value) ? Math.floor(count) : count.toFixed(1)}{suffix}
    </div>
  );
}

export default function Home() {
  console.log('[Home] Rendering');
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const profile = data as { role?: string } | null;
          const role = profile?.role;

          if (role === 'customer') { router.replace('/customer'); return; }
          if (role === 'worker') { router.replace('/worker'); return; }
          if (role === 'admin') { router.replace('/admin'); return; }
          setUser({ ...session.user, role });
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ====== NAVIGATION ====== */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">V</div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Vifixa AI</span>
          </div>
          <div className="flex gap-3 items-center">
            {user ? (
              <button onClick={() => router.push(`/${user.role || 'customer'}`)} className="btn-primary text-sm !py-2 !px-5">
                Dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => router.push('/login')} className="text-sm font-medium text-[hsl(var(--vf-text-secondary))] hover:text-[hsl(var(--vf-text))] transition-colors px-4 py-2">
                  Đăng nhập
                </button>
                <button onClick={() => router.push('/register')} className="btn-primary text-sm !py-2 !px-5">
                  Bắt đầu miễn phí
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-mesh">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px] animate-float delay-300" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] animate-float delay-500" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-blue-200/90 font-medium">AI-Powered • 1200+ Thợ Xác Minh</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Sửa chữa nhà
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              thông minh với AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in-up delay-200 text-lg sm:text-xl text-blue-100/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chẩn đoán AI tức thì. Báo giá minh bạch. Thợ chuyên nghiệp được xác minh.
            <br className="hidden sm:block" />
            Tất cả chỉ trong <span className="text-white font-semibold">60 giây</span>.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => router.push('/register')}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold text-lg rounded-2xl shadow-[0_8px_30px_hsl(250,80%,60%,0.3)] hover:shadow-[0_8px_40px_hsl(250,80%,60%,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              💬 Chat với AI ngay
              <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => router.push('/for-workers')}
              className="px-8 py-4 rounded-2xl font-semibold text-blue-200 border border-white/10 hover:bg-white/5 transition-all"
            >
              Trở thành thợ →
            </button>
          </div>

          {/* Trust Badges */}
          <div className="animate-fade-in-up delay-400 flex flex-wrap justify-center gap-6 text-sm text-blue-200/60">
            <span className="flex items-center gap-1.5">✅ Miễn phí chẩn đoán</span>
            <span className="flex items-center gap-1.5">🔒 Bảo hành 30 ngày</span>
            <span className="flex items-center gap-1.5">⚡ Phản hồi dưới 5 phút</span>
          </div>
        </div>
      </section>

      {/* ====== STATS ====== */}
      <section className="relative -mt-16 z-20 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="card-glass text-center p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="text-sm text-[hsl(var(--vf-text-secondary))] mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[hsl(var(--vf-text))]" style={{ fontFamily: 'var(--font-display)' }}>
            3 bước đơn giản
          </h2>
          <p className="text-[hsl(var(--vf-text-secondary))] mb-16 text-lg max-w-lg mx-auto">
            Từ mô tả sự cố đến thợ đến nhà — tất cả chỉ vài phút
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', emoji: '💬', title: 'Chat với AI', desc: 'Mô tả sự cố bằng văn bản, giọng nói hoặc ảnh. AI chẩn đoán ngay.' },
              { step: '02', emoji: '💰', title: 'Báo giá minh bạch', desc: 'Nhận báo giá chi tiết từng hạng mục. Không phát sinh bất ngờ.' },
              { step: '03', emoji: '🔧', title: 'Thợ đến sửa', desc: 'Thợ xác minh đến đúng giờ. Bảo hành 30 ngày sau sửa chữa.' },
            ].map((item, i) => (
              <div key={item.step} className="animate-fade-in-up relative group" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="card p-8 text-center hover:border-blue-500/30 relative overflow-hidden">
                  <div className="absolute top-3 right-4 text-6xl font-black text-[hsl(var(--vf-border))] select-none opacity-50">{item.step}</div>
                  <div className="text-5xl mb-5 relative z-10 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                  <h3 className="text-xl font-bold text-[hsl(var(--vf-text))] mb-3 relative z-10">{item.title}</h3>
                  <p className="text-[hsl(var(--vf-text-secondary))] text-sm leading-relaxed relative z-10">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SERVICES GRID ====== */}
      <section className="py-20 px-6 bg-[hsl(var(--vf-bg-subtle))]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-[hsl(var(--vf-text))]" style={{ fontFamily: 'var(--font-display)' }}>
            Dịch vụ đa dạng
          </h2>
          <p className="text-center text-[hsl(var(--vf-text-secondary))] mb-12 text-lg">
            Mọi vấn đề trong nhà — AI đều giải quyết được
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SERVICES.map((svc, i) => (
              <button
                key={svc.label}
                onClick={() => router.push('/register')}
                className="group card p-6 text-left hover:!shadow-xl"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  {svc.icon}
                </div>
                <h3 className="font-bold text-[hsl(var(--vf-text))] mb-1">{svc.label}</h3>
                <p className="text-sm text-[hsl(var(--vf-text-muted))]">{svc.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-[hsl(var(--vf-text))]" style={{ fontFamily: 'var(--font-display)' }}>
            Khách hàng nói gì?
          </h2>
          <p className="text-center text-[hsl(var(--vf-text-secondary))] mb-12 text-lg">
            Hàng nghìn người đã tin tưởng Vifixa AI
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="card p-6 animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <span key={j} className="text-amber-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-[hsl(var(--vf-text))] mb-6 leading-relaxed italic">&quot;{t.content}&quot;</p>
                <div className="flex items-center gap-3 border-t border-[hsl(var(--vf-border))] pt-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-lg">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[hsl(var(--vf-text))]">{t.name}</p>
                    <p className="text-xs text-[hsl(var(--vf-text-muted))]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="relative py-24 px-6 overflow-hidden bg-mesh">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Sẵn sàng trải nghiệm?
          </h2>
          <p className="text-blue-100/70 text-lg mb-8">
            Đăng ký miễn phí. Không cần thẻ tín dụng. AI sẵn sàng hỗ trợ bạn 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              Đăng ký miễn phí →
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 rounded-2xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all"
            >
              Đã có tài khoản
            </button>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-[hsl(var(--vf-bg-subtle))] border-t border-[hsl(var(--vf-border))] py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">V</div>
                <span className="font-bold text-[hsl(var(--vf-text))]">Vifixa AI</span>
              </div>
              <p className="text-sm text-[hsl(var(--vf-text-muted))]">Nền tảng sửa chữa nhà thông minh #1 Việt Nam</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[hsl(var(--vf-text))] mb-3">Dịch vụ</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--vf-text-muted))]">
                <li>Điện lạnh</li><li>Điện nước</li><li>Camera</li><li>Sơn sửa</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[hsl(var(--vf-text))] mb-3">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--vf-text-muted))]">
                <li>Trung tâm trợ giúp</li><li>Liên hệ</li><li>Bảo hành</li><li>Khiếu nại</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[hsl(var(--vf-text))] mb-3">Pháp lý</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--vf-text-muted))]">
                <li>Điều khoản</li><li>Chính sách bảo mật</li><li>Cookie</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[hsl(var(--vf-border))] pt-6 text-center text-sm text-[hsl(var(--vf-text-muted))]">
            © 2026 Vifixa AI. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}
