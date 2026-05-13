-- Escrow System: wallet payment, escrow unlock on completion/cancel
-- Depends on: wallets table, orders table, handle_order_completion_revenue()

-- 1. Add payment_method to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'gateway'
  CHECK (payment_method IN ('wallet', 'gateway'));

-- 2. Rewrite trigger: handle escrow unlock + worker credit on order completion
CREATE OR REPLACE FUNCTION public.handle_order_completion_revenue()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5, 2) := 15.00;
    v_commission_amount DECIMAL(15, 2);
    v_worker_amount DECIMAL(15, 2);
    v_worker_wallet_id UUID;
    v_customer_wallet_id UUID;
    v_tier TEXT;
    v_price DECIMAL(15, 2);
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        v_price := COALESCE(NEW.actual_price, NEW.final_price, NEW.estimated_price, 0);
        IF v_price <= 0 THEN RETURN NEW; END IF;

        -- Commission
        SELECT tier INTO v_tier FROM public.worker_subscriptions WHERE user_id = NEW.worker_id;
        IF v_tier = 'pro' THEN v_commission_rate := 12.00;
        ELSIF v_tier = 'elite' THEN v_commission_rate := 10.00;
        END IF;

        v_commission_amount := v_price * (v_commission_rate / 100);
        v_worker_amount := v_price - v_commission_amount;

        INSERT INTO public.commissions (order_id, amount, rate, status)
        VALUES (NEW.id, v_commission_amount, v_commission_rate, 'collected');

        -- Credit worker
        SELECT id INTO v_worker_wallet_id FROM public.wallets WHERE user_id = NEW.worker_id;
        IF v_worker_wallet_id IS NOT NULL THEN
            UPDATE public.wallets SET balance = balance + v_worker_amount WHERE id = v_worker_wallet_id;
            INSERT INTO public.wallet_transactions (wallet_id, amount, type, source, reference_id, description)
            VALUES (v_worker_wallet_id, v_worker_amount, 'credit', 'order_payment', NEW.id, 'Thu nhập từ đơn hàng ' || NEW.id);
        END IF;

        -- If wallet payment: unlock customer escrow
        IF NEW.payment_method = 'wallet' THEN
            SELECT id INTO v_customer_wallet_id FROM public.wallets WHERE user_id = NEW.customer_id;
            IF v_customer_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET locked_amount = GREATEST(0, locked_amount - v_price)
                WHERE id = v_customer_wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. New trigger: unlock escrow on cancel/dispute
CREATE OR REPLACE FUNCTION public.handle_order_cancel_escrow()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_wallet_id UUID;
    v_price DECIMAL(15, 2);
BEGIN
    IF (NEW.status IN ('cancelled', 'disputed') AND OLD.status NOT IN ('cancelled', 'disputed')) THEN
        -- Only if paid via wallet
        IF NEW.payment_method = 'wallet' AND NEW.payment_status = 'paid' THEN
            v_price := COALESCE(NEW.actual_price, NEW.final_price, NEW.estimated_price, 0);
            IF v_price <= 0 THEN RETURN NEW; END IF;

            SELECT id INTO v_customer_wallet_id FROM public.wallets WHERE user_id = NEW.customer_id;
            IF v_customer_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET
                    locked_amount = GREATEST(0, locked_amount - v_price),
                    balance = balance + v_price
                WHERE id = v_customer_wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create triggers
DROP TRIGGER IF EXISTS on_order_completed_revenue ON public.orders;
CREATE TRIGGER on_order_completed_revenue
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_completion_revenue();

DROP TRIGGER IF EXISTS on_order_cancel_escrow ON public.orders;
CREATE TRIGGER on_order_cancel_escrow
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_cancel_escrow();
