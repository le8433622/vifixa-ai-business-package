-- Vifixa AI v2.0 Gamification System Migration

CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.user_loyalty (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_spent_vnd DECIMAL(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_loyalty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own loyalty" ON public.user_loyalty FOR SELECT USING (auth.uid() = user_id);

-- Initial Achievements data
INSERT INTO public.achievements (id, title, description, icon, points) VALUES
('first_order', 'Đơn hàng đầu tiên', 'Hoàn thành đơn hàng đầu tiên trên hệ thống', '🎉', 100),
('five_star_pro', 'Thợ 5 Sao', 'Nhận đánh giá 5 sao cho một đơn hàng', '⭐', 50),
('referral_one', 'Người giới thiệu', 'Giới thiệu thành công 1 người bạn', '🤝', 200),
('super_saver', 'Tiết kiệm thông minh', 'Sử dụng AI chẩn đoán để tiết kiệm chi phí', '🤖', 50)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    points = EXCLUDED.points;
