-- Vifixa AI v2.0 Referral System Migration

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, successful, paid
    reward_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.user_referral_codes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral codes" ON public.user_referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create referral code for new profiles
-- Safer than triggering on auth.users directly
CREATE OR REPLACE FUNCTION public.on_profile_created_referral()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_referral_codes (user_id, code)
    VALUES (NEW.id, public.generate_referral_code());
    
    -- Also create a wallet for the user automatically
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;

CREATE TRIGGER on_profile_created_referral
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_referral();

-- Manually generate codes for existing profiles who don't have one
INSERT INTO public.user_referral_codes (user_id, code)
SELECT id, public.generate_referral_code()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Manually create wallets for existing profiles who don't have one
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0.00
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
