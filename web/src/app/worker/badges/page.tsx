'use client';

import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import PremiumBadge from '@/components/PremiumBadge';

export default function WorkerBadgesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>}>
      <WorkerBadgesPage />
    </Suspense>
  );
}

interface BadgePackage {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number;
  benefits: {
    badge_icon?: string;
    badge_color?: string;
    badge_label?: string;
    boost_factor?: number;
    show_in_top?: boolean;
    priority_matching?: boolean;
    featured_profile?: boolean;
  };
  boost_factor: number;
  priority_score_bonus: number;
}

interface ActiveBadge {
  badge_name: string;
  badge_slug: string;
  badge_icon: string;
  badge_color: string;
  badge_label: string;
  boost_factor: number;
  expires_at: string;
  is_active: boolean;
}

const BADGE_GRADIENTS: Record<string, string> = {
  'premium-silver': 'from-gray-400 to-gray-300',
  'premium-gold': 'from-amber-500 to-yellow-400',
  'premium-platinum': 'from-indigo-500 to-purple-500',
};

const BADGE_HOVER: Record<string, string> = {
  'premium-silver': 'hover:from-gray-500 hover:to-gray-400',
  'premium-gold': 'hover:from-amber-600 hover:to-yellow-500',
  'premium-platinum': 'hover:from-indigo-600 hover:to-purple-600',
};

function WorkerBadgesPage() {
  const [badges, setBadges] = useState<BadgePackage[]>([]);
  const [activeBadge, setActiveBadge] = useState<ActiveBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    queueMicrotask(() => {
      const status = searchParams.get('purchase');
      if (status === 'success') setPurchaseStatus('success');
      else if (status === 'canceled') setPurchaseStatus('canceled');
    });
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }

        const { data: pkgData } = await supabase
          .from('worker_ad_packages')
          .select('*')
          .in('slug', ['premium-silver', 'premium-gold', 'premium-platinum'])
          .eq('is_active', true)
          .order('display_order');

        setBadges(pkgData || []);

        const { data: badgeData } = await supabase
          .rpc('get_worker_active_badge', { p_worker_id: session.user.id });

        if (badgeData && badgeData.length > 0) {
          setActiveBadge(badgeData[0] as unknown as ActiveBadge);
        }
      } catch (err) {
        console.error('Error loading badge data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function handlePurchase(slug: string) {
    setPurchasing(slug);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/purchase-premium-badge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            badge_slug: slug,
            success_url: `${window.location.origin}/worker/badges?status=success`,
            cancel_url: `${window.location.origin}/worker/badges?status=canceled`,
          }),
        }
      );

      const data = await response.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể tạo thanh toán'));
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Lỗi kết nối thanh toán');
    } finally {
      setPurchasing(null);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VND';
  }

  function getBadgeDescription(badge: BadgePackage): string[] {
    const desc: string[] = [];
    if (badge.benefits?.badge_label) desc.push(`Huy hiệu "${badge.benefits.badge_label}"`);
    if (badge.boost_factor && badge.boost_factor > 1) desc.push(`Hệ số hiển thị x${badge.boost_factor}`);
    if (badge.benefits?.priority_matching) desc.push('Ưu tiên ghép thợ');
    if (badge.benefits?.show_in_top) desc.push('Xuất hiện đầu danh sách');
    if (badge.benefits?.featured_profile) desc.push('Hồ sơ nổi bật');
    desc.push(`${badge.duration_days} ngày sử dụng`);
    return desc;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Huy hiệu Premium</h1>
        <p className="text-gray-600 mt-1">Nâng cấp hồ sơ để được ưu tiên hiển thị và ghép việc</p>
      </div>

      {purchaseStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          🎉 Mua huy hiệu thành công! Huy hiệu của bạn đã được kích hoạt.
          <button onClick={() => setPurchaseStatus(null)} className="float-right text-green-600 hover:text-green-800">×</button>
        </div>
      )}
      {purchaseStatus === 'canceled' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          Giao dịch bị hủy. Bạn có thể mua lại bất kỳ lúc nào.
          <button onClick={() => setPurchaseStatus(null)} className="float-right text-amber-600 hover:text-amber-800">×</button>
        </div>
      )}

      {activeBadge && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium">Huy hiệu đang hoạt động</p>
              <div className="mt-2">
                <PremiumBadge
                  badgeLabel={activeBadge.badge_label}
                  badgeColor={activeBadge.badge_color}
                  badgeIcon={activeBadge.badge_icon}
                  size="lg"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Hệ số hiển thị: x{activeBadge.boost_factor} | 
                Hết hạn: {new Date(activeBadge.expires_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {badges.map((badge) => {
          const gradient = BADGE_GRADIENTS[badge.slug] || 'from-gray-400 to-gray-300';
          const hoverGradient = BADGE_HOVER[badge.slug] || 'hover:from-gray-500 hover:to-gray-400';
          const isOwned = activeBadge?.badge_slug === badge.slug;
          const isHigher = activeBadge && (
            (badge.slug === 'premium-platinum' && activeBadge.badge_slug !== 'premium-platinum') ||
            (badge.slug === 'premium-gold' && activeBadge.badge_slug === 'premium-silver')
          );

          return (
            <div key={badge.id} className={`bg-white rounded-xl shadow-sm border-2 p-6 flex flex-col ${
              isOwned ? 'border-indigo-400' : 'border-gray-200'
            }`}>
              <div className={`h-24 rounded-lg bg-gradient-to-r ${gradient} flex items-center justify-center mb-4`}>
                <span className="text-5xl">{badge.benefits?.badge_icon === 'badge-check' ? '🪙' :
                  badge.benefits?.badge_icon === 'crown' ? '👑' : '💎'}</span>
              </div>

              <h3 className="text-lg font-bold text-center mb-1">{badge.name}</h3>
              <p className="text-2xl font-bold text-center text-blue-600 mb-4">
                {formatPrice(badge.price)}
                <span className="text-sm text-gray-500 font-normal"> / tháng</span>
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {getBadgeDescription(badge).map((desc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {desc}
                  </li>
                ))}
              </ul>

              {isOwned ? (
                <button disabled className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-lg font-semibold cursor-not-allowed">
                  Đang sở hữu
                </button>
              ) : isHigher ? (
                <button
                  onClick={() => handlePurchase(badge.slug)}
                  disabled={purchasing === badge.slug}
                  className={`w-full py-2.5 bg-gradient-to-r ${gradient} ${hoverGradient} text-white rounded-lg font-semibold transition-all disabled:opacity-50`}
                >
                  {purchasing === badge.slug ? 'Đang xử lý...' : 'Nâng cấp'}
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(badge.slug)}
                  disabled={purchasing === badge.slug}
                  className={`w-full py-2.5 bg-gradient-to-r ${gradient} ${hoverGradient} text-white rounded-lg font-semibold transition-all disabled:opacity-50`}
                >
                  {purchasing === badge.slug ? 'Đang xử lý...' : 'Mua ngay'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-amber-800 mb-2">Lợi ích của Huy hiệu Premium</h3>
        <ul className="space-y-2 text-sm text-amber-700">
          <li>• <strong>Ưu tiên hiển thị</strong> — Thợ có huy hiệu được hiển thị đầu danh sách tìm kiếm</li>
          <li>• <strong>Ghép việc thông minh</strong> — Hệ thống AI ưu tiên ghép việc cho thợ có huy hiệu</li>
          <li>• <strong>Tăng uy tín</strong> — Huy hiệu hiển thị trên hồ sơ tạo niềm tin với khách hàng</li>
          <li>• <strong>Hồ sơ nổi bật</strong> — Huy hiệu Bạch Kim được đánh dấu nổi bật trong danh sách thợ</li>
        </ul>
      </div>
    </div>
  );
}
