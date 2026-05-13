-- Escrow Critical Fixes
-- Fix A: lock_wallet_balance gộp order update → atomic xuyên cả 2 bảng
-- Fix B: trigger dùng FOR UPDATE cho wallet operations → chống race condition
-- Fix C: reject_payout RPC → unlock locked_amount khi admin từ chối

-- ============================================
-- Fix A: Atomic wallet + order update
-- ============================================
CREATE OR REPLACE FUNCTION public.lock_wallet_balance(
  p_user_id UUID,
  p_order_id UUID,
  p_amount BIGINT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_order RECORD;
  v_txn_id UUID;
BEGIN
  -- Lock cả wallet và order row → chống race condition toàn bộ
  SELECT id, balance, locked_amount, currency
  INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  SELECT id, payment_status, status
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already paid');
  END IF;

  IF v_order.status IN ('cancelled', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be paid');
  END IF;

  IF v_wallet.balance - v_wallet.locked_amount < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_wallet.balance,
      'locked_amount', v_wallet.locked_amount,
      'available', v_wallet.balance - v_wallet.locked_amount,
      'required', p_amount
    );
  END IF;

  -- Atomic wallet update
  UPDATE wallets
  SET balance = balance - p_amount,
      locked_amount = locked_amount + p_amount
  WHERE id = v_wallet.id;

  -- Atomic order update (cùng transaction → nếu fail, wallet rollback)
  UPDATE orders
  SET payment_status = 'paid',
      payment_method = 'wallet',
      paid_at = now()
  WHERE id = p_order_id;

  -- Double-entry ledger
  v_txn_id := gen_random_uuid();

  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES (v_txn_id, v_wallet.id, 'wallet.payment', 'debit', p_amount, v_wallet.currency, 'payment', p_order_id, 'Thanh toán đơn hàng từ ví');

  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES (v_txn_id, v_wallet.id, 'escrow.held', 'credit', p_amount, v_wallet.currency, 'escrow', p_order_id, 'Ký quỹ đơn hàng');

  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet.id,
    'balance', (SELECT balance FROM wallets WHERE id = v_wallet.id),
    'locked_amount', (SELECT locked_amount FROM wallets WHERE id = v_wallet.id)
  );
END;
$$;

-- ============================================
-- Fix B: Trigger completion — FOR UPDATE + atomic
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_order_completion_revenue()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5, 2) := 15.00;
    v_commission_amount DECIMAL(15, 2);
    v_worker_amount DECIMAL(15, 2);
    v_worker_wallet RECORD;
    v_customer_wallet RECORD;
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

        -- Credit worker (FOR UPDATE → chống race với payout approval)
        SELECT id, balance INTO v_worker_wallet
        FROM public.wallets WHERE user_id = NEW.worker_id
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.wallets SET balance = balance + v_worker_amount WHERE id = v_worker_wallet.id;
            INSERT INTO public.wallet_transactions (wallet_id, amount, type, source, reference_id, description)
            VALUES (v_worker_wallet.id, v_worker_amount, 'credit', 'order_payment', NEW.id, 'Thu nhập từ đơn hàng ' || NEW.id);
        END IF;

        -- Wallet payment: unlock customer escrow (FOR UPDATE → chống race)
        IF NEW.payment_method = 'wallet' THEN
            SELECT id INTO v_customer_wallet
            FROM public.wallets WHERE user_id = NEW.customer_id
            FOR UPDATE;

            IF FOUND THEN
                UPDATE public.wallets
                SET locked_amount = GREATEST(0, locked_amount - v_price)
                WHERE id = v_customer_wallet.id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fix B: Trigger cancel — FOR UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_order_cancel_escrow()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_wallet RECORD;
    v_price DECIMAL(15, 2);
BEGIN
    IF (NEW.status IN ('cancelled', 'disputed') AND OLD.status NOT IN ('cancelled', 'disputed')) THEN
        IF NEW.payment_method = 'wallet' AND NEW.payment_status = 'paid' THEN
            v_price := COALESCE(NEW.actual_price, NEW.final_price, NEW.estimated_price, 0);
            IF v_price <= 0 THEN RETURN NEW; END IF;

            SELECT id INTO v_customer_wallet
            FROM public.wallets WHERE user_id = NEW.customer_id
            FOR UPDATE;

            IF FOUND THEN
                UPDATE public.wallets
                SET locked_amount = GREATEST(0, locked_amount - v_price),
                    balance = balance + v_price
                WHERE id = v_customer_wallet.id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fix C: Reject payout — unlock locked_amount
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_payout(
  p_payout_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
BEGIN
  -- Lock payout + wallet
  SELECT id, wallet_id, amount, status
  INTO v_payout
  FROM payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found');
  END IF;

  IF v_payout.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout already processed');
  END IF;

  -- Unlock wallet
  UPDATE wallets
  SET locked_amount = GREATEST(0, locked_amount - v_payout.amount)
  WHERE id = v_payout.wallet_id;

  -- Mark payout as rejected
  UPDATE payouts
  SET status = 'failed',
      completed_at = now()
  WHERE id = p_payout_id;

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id);
END;
$$;
