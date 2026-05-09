-- Vifixa AI v2.0 Revenue System Migration
-- Includes: Commissions, Payouts, Worker Subscriptions, and Wallets

-- 1. Create Wallet table for Workers
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'VND',
    status TEXT DEFAULT 'active', -- active, frozen
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL, -- e.g. 15.00 for 15%
    status TEXT DEFAULT 'pending', -- pending, collected, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    bank_info JSONB, -- { "bank": "VCB", "account": "...", "name": "..." }
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    reference_id TEXT, -- Bank transfer reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create Worker Subscription Tiers table
CREATE TABLE IF NOT EXISTS public.worker_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier TEXT NOT NULL DEFAULT 'free', -- free, pro, elite
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active', -- active, expired, cancelled
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Ledger/Transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    type TEXT NOT NULL, -- credit, debit
    source TEXT NOT NULL, -- order_payment, commission, payout, referral, subscription_fee
    reference_id UUID, -- order_id or payout_id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Workers can see their own wallet and transactions
CREATE POLICY "Workers can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workers can view own transactions" ON public.wallet_transactions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.wallets WHERE id = public.wallet_transactions.wallet_id AND user_id = auth.uid()));
CREATE POLICY "Workers can view own subscription" ON public.worker_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Trigger: Automatically create wallet on profile creation (handled via Supabase function or trigger)
-- For existing users, we'll need to run a manual script to create wallets.

-- Function to handle order completion and commission calculation
CREATE OR REPLACE FUNCTION public.handle_order_completion_revenue()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5, 2) := 15.00; -- Default 15%
    v_commission_amount DECIMAL(15, 2);
    v_worker_amount DECIMAL(15, 2);
    v_worker_wallet_id UUID;
    v_tier TEXT;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get worker subscription tier to adjust rate
        SELECT tier INTO v_tier FROM public.worker_subscriptions WHERE user_id = NEW.worker_id;
        
        IF v_tier = 'pro' THEN v_commission_rate := 12.00;
        ELSIF v_tier = 'elite' THEN v_commission_rate := 10.00;
        END IF;

        v_commission_amount := NEW.final_price * (v_commission_rate / 100);
        v_worker_amount := NEW.final_price - v_commission_amount;

        -- Record commission
        INSERT INTO public.commissions (order_id, amount, rate, status)
        VALUES (NEW.id, v_commission_amount, v_commission_rate, 'collected');

        -- Update Worker Wallet
        SELECT id INTO v_worker_wallet_id FROM public.wallets WHERE user_id = NEW.worker_id;
        
        IF v_worker_wallet_id IS NOT NULL THEN
            UPDATE public.wallets SET balance = balance + v_worker_amount WHERE id = v_worker_wallet_id;
            
            INSERT INTO public.wallet_transactions (wallet_id, amount, type, source, reference_id, description)
            VALUES (v_worker_wallet_id, v_worker_amount, 'credit', 'order_payment', NEW.id, 'Thu nhập từ đơn hàng ' || NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_completed_revenue
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_completion_revenue();
