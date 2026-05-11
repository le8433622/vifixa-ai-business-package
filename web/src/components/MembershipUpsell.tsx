import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface MembershipFeatures {
  [key: string]: boolean | number | string;
}

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  features: MembershipFeatures;
  discount_percent: number;
}

interface UpsellProps {
  estimatedPrice: number;
  onSelectPlan: (plan: MembershipPlan) => void;
  onSkip: () => void;
}

export default function MembershipUpsell({ estimatedPrice, onSelectPlan, onSkip }: UpsellProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching membership plans:', err);
      toast('Failed to load membership plans', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { fetchPlans(); });
  }, [fetchPlans]);

  // Calculate savings for each plan
  const calculateSavings = (plan: MembershipPlan) => {
    const monthlySavings = (estimatedPrice * plan.discount_percent) / 100;
    const yearlySavings = monthlySavings * 12;
    return { monthlySavings, yearlySavings };
  };

  // Handle plan selection
  const handleSelectPlan = async (plan: MembershipPlan) => {
    try {
      // In a real implementation, this would create a subscription
      // For now, we'll just notify the parent component
      onSelectPlan(plan);
      toast(`Đã chọn gói ${plan.name}! Bạn sẽ tiết kiệm ${calculateSavings(plan).monthlySavings.toLocaleString()} VND/đơn hàng`, 'success');
    } catch (err) {
      console.error('Error selecting plan:', err);
      toast('Lỗi khi chọn gói membership', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Đang tải gói membership...</div>;
  }

  if (plans.length === 0) {
    return <div className="text-center py-8">Không có gói membership nào khả dụng</div>;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
      <h2 className="text-xl font-bold text-blue-800 mb-4">
        💎 Tăng giá trị với Membership Vifixa
      </h2>
      <p className="mb-4">
        Nâng cấp để享受 blanched giá cả và ưu đãi đặc biệt trên đơn hàng này và tất cả đơn hàng trong tương lai
      </p>
      
      <div className="space-y-4">
        {plans.map((plan) => {
          const { monthlySavings, yearlySavings } = calculateSavings(plan);
          const finalPrice = estimatedPrice - monthlySavings;
          const isBestValue = plan.slug === 'gold'; // Mark Gold as best value
          
          return (
            <div key={plan.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {isBestValue && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                        Giá trị tốt nhất
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.features.priority_booking && '- Ưu tiên ghép thợ'}
                    {plan.features.discount_percent && `- ${plan.features.discount_percent}% giảm giá mỗi đơn`}
                    {plan.features.free_diagnostics && `- ${plan.features.free_diagnostics} chẩn đoán miễn phí/tháng`}
                    {plan.features.vip_support && `- Hỗ trợ VIP 24/7`}
                    {plan.features.dedicated_support && `- Trách nhiệm chuyên dụng`}
                    {plan.features.free_cancellations && `- ${plan.features.free_cancellations} hủy miễn phí/tháng`}
                  </p>
                </div>
                
                <div className="text-right space-y-1">
                  <p className="font-semibold text-lg">
                    {plan.price_monthly.toLocaleString()} VND/tháng
                  </p>
                  {plan.price_yearly > 0 && (
                    <>
                      <p className="text-xs text-gray-500">
                        {plan.price_yearly.toLocaleString()} VND/năm
                      </p>
                      <p className="text-xs text-green-500">
                        Tiết kiệm {((plan.price_monthly * 12) - plan.price_yearly).toLocaleString()} VND
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-3 bt border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span>Giá đơn hàng sau giảm giá:</span>
                  <span className="font-semibold text-lg">
                    {finalPrice.toLocaleString()} VND
                    <span className="text-xs text-gray-500 ml-2">
                      (-{monthlySavings.toLocaleString()} VND)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>Tiết kiệm/tháng:</span>
                  <span className="font-semibold">
                    {monthlySavings.toLocaleString()} VND
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>Tiết kiệm/năm:</span>
                  <span className="font-semibold">
                    {yearlySavings.toLocaleString()} VND
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full mt-3 py-2 px-4 rounded ${
                  isBestValue 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium transition-all`}
              >
                {isBestValue ? 'Chọn Gói Này' : 'Chọn Gói này'}
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onSkip}
          className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Bỏ qua, tiếp tục với giá thường
        </button>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Bạn có thể nâng cấp membership bất kỳ lúc nào từ trang cá nhân
        </p>
      </div>
    </div>
  );
}