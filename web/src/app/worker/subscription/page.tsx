// Vifixa AI v2.0 — Worker Subscription Page
// B2B SaaS Model for Service Providers

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const TIERS = [
  {
    id: 'free',
    name: 'Cơ bản',
    price: '0₫',
    priceVal: 0,
    commission: '15%',
    features: [
      'Nhận tối đa 5 việc/tháng',
      'Phí hoa hồng 15%',
      'Hỗ trợ qua chat AI',
      'Thanh toán sau 7 ngày'
    ],
    buttonText: 'Đang sử dụng',
    highlight: false,
    color: 'from-gray-500 to-gray-700'
  },
  {
    id: 'pro',
    name: 'Chuyên nghiệp (Pro)',
    price: '199.000₫',
    priceVal: 199000,
    period: '/tháng',
    commission: '12%',
    features: [
      'Nhận tối đa 30 việc/tháng',
      'Phí hoa hồng giảm còn 12%',
      'Huy hiệu "Xác minh Pro"',
      'Ưu tiên hiển thị kết quả',
      'AI Coach hỗ trợ chốt đơn'
    ],
    buttonText: 'Nâng cấp ngay',
    highlight: true,
    color: 'from-blue-500 to-blue-700'
  },
  {
    id: 'elite',
    name: 'Đẳng cấp (Elite)',
    price: '499.000₫',
    priceVal: 499000,
    period: '/tháng',
    commission: '10%',
    features: [
      'Không giới hạn số lượng việc',
      'Phí hoa hồng chỉ còn 10%',
      'Huy hiệu "Hội viên Elite"',
      'Hỗ trợ 24/7 trực tiếp',
      'Công cụ CRM quản lý khách hàng',
      'Rút tiền nhanh trong 24h'
    ],
    buttonText: 'Chọn Elite',
    highlight: false,
    color: 'from-violet-500 to-purple-700'
  }
];

export default function WorkerSubscription() {
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCurrentSubscription() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }

        const { data } = await supabase
          .from('worker_subscriptions')
          .select('tier')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single();

        if (data) setCurrentTier(data.tier);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCurrentSubscription();
  }, []);

  async function handleUpgrade(tierId: string) {
    if (tierId === currentTier) return;
    
    setProcessingId(tierId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Vui lòng đăng nhập lại');

      // Trong thực tế, đây sẽ gọi đến Stripe hoặc Cổng thanh toán
      // Hiện tại chúng ta sẽ giả lập việc cập nhật DB
      const { error } = await supabase
        .from('worker_subscriptions')
        .upsert({
          user_id: session.user.id,
          tier: tierId,
          status: 'active',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast(`Nâng cấp lên gói ${tierId.toUpperCase()} thành công!`, 'success');
      setCurrentTier(tierId);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Lỗi nâng cấp', 'error');
    } finally {
      setProcessingId(null);
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
    <div className="min-h-screen bg-[hsl(var(--vf-bg))] pb-20">
      {/* Header */}
      <nav className="sticky top-0 z-40 glass-strong border-b border-[hsl(var(--vf-border))]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[hsl(var(--vf-text-muted))] hover:text-[hsl(var(--vf-text))]">
            ←
          </button>
          <h1 className="font-bold text-[hsl(var(--vf-text))]">Gói hội viên</h1>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--vf-text))] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Nâng cấp thu nhập của bạn
        </h2>
        <p className="text-[hsl(var(--vf-text-secondary))] mb-12 max-w-2xl mx-auto">
          Chọn gói hội viên phù hợp để giảm phí hoa hồng, tăng ưu tiên hiển thị và mở khóa các công cụ AI hỗ trợ chốt đơn hiệu quả hơn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div 
              key={tier.id}
              className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                tier.highlight 
                  ? 'border-blue-500 shadow-2xl scale-105 z-10 bg-[hsl(var(--vf-surface-raised))]' 
                  : 'border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-surface))] hover:shadow-xl'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                  PHỔ BIẾN NHẤT
                </div>
              )}

              <div className="text-left mb-8">
                <h3 className="text-xl font-bold text-[hsl(var(--vf-text))] mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[hsl(var(--vf-text))]">{tier.price}</span>
                  {tier.period && <span className="text-[hsl(var(--vf-text-muted))] text-sm">{tier.period}</span>}
                </div>
                <div className="mt-4 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 inline-block">
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    Phí hoa hồng: {tier.commission}
                  </p>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1 text-left">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-[hsl(var(--vf-text-secondary))]">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={processingId !== null || currentTier === tier.id}
                className={`w-full py-4 rounded-2xl font-bold transition-all ${
                  currentTier === tier.id
                    ? 'bg-[hsl(var(--vf-bg-subtle))] text-[hsl(var(--vf-text-muted))] cursor-default'
                    : tier.highlight
                    ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-blue-500/30'
                    : 'bg-[hsl(var(--vf-bg-muted))] text-[hsl(var(--vf-text))] hover:bg-[hsl(var(--vf-text))] hover:text-white'
                }`}
              >
                {processingId === tier.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  currentTier === tier.id ? 'Gói hiện tại' : tier.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-3xl bg-mesh border border-white/10 text-left relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ưu đãi độc quyền cho Thợ Elite</h3>
              <p className="text-blue-100/70 max-w-xl">
                Nhận huy hiệu Elite để tăng tỷ lệ khách hàng chọn bạn lên đến 85%. 
                Chúng tôi cam kết hoàn tiền 100% nếu bạn không nhận đủ ít nhất 5 việc trong tháng đầu tiên.
              </p>
            </div>
            <button className="btn-primary whitespace-nowrap !py-4 !px-10">
              Tìm hiểu thêm về Elite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
