-- Escrow System v2: Atomic wallet operations with race-condition protection
-- SECURITY: All RPCs use SELECT ... FOR UPDATE to prevent concurrent overdraft
-- CRITICAL: This module handles real money — no read-then-write patterns

-- ============================================
-- 1. Atomic: Lock wallet balance for escrow
-- Called when customer pays from internal wallet
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
  v_txn_id UUID;
BEGIN
  -- Lock row → prevents race condition (concurrent payment requests)
  SELECT id, balance, locked_amount, currency
  INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Atomic balance check (read after lock = no TOCTOU race)
  IF v_wallet.balance - v_wallet.locked_amount < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_wallet.balance,
      'locked_amount', v_wallet.locked_amount,
      'available', v_wallet.balance - v_wallet.locked_amount,
      'required', p_amount
    );
  END IF;

  -- Prevent double-payment for same order
  IF EXISTS (SELECT 1 FROM ledger_entries WHERE reference_type = 'payment' AND reference_id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already paid');
  END IF;

  -- Atomic UPDATE (still locked, so no race)
  UPDATE wallets
  SET balance = balance - p_amount,
      locked_amount = locked_amount + p_amount
  WHERE id = v_wallet.id;

  -- Double-entry ledger
  v_txn_id := gen_random_uuid();

  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES (v_txn_id, v_wallet.id, 'wallet.payment', 'debit', p_amount, v_wallet.currency, 'payment', p_order_id, 'Thanh toán đơn hàng từ ví');

  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES (v_txn_id, v_wallet.id, 'escrow.held', 'credit', p_amount, v_wallet.currency, 'escrow', p_order_id, 'Ký quỹ đơn hàng');

  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet.id,
    'balance', v_wallet.balance - p_amount,
    'locked_amount', v_wallet.locked_amount + p_amount
  );
END;
$$;

-- ============================================
-- 2. Atomic: Add funds to wallet (top-up)
-- Called when user nạp tiền via payment gateway
-- ============================================
CREATE OR REPLACE FUNCTION public.add_wallet_funds(
  p_user_id UUID,
  p_amount BIGINT,
  p_reference_type TEXT DEFAULT 'topup',
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_currency TEXT;
  v_txn_id UUID;
BEGIN
  -- Auto-create wallet if not exists (upsert)
  INSERT INTO wallets (user_id, balance, locked_amount, currency)
  VALUES (p_user_id, 0, 0, 'VND')
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock row
  SELECT id, currency INTO v_wallet_id, v_currency
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Atomic credit
  UPDATE wallets SET balance = balance + p_amount WHERE id = v_wallet_id;

  -- Ledger
  v_txn_id := gen_random_uuid();
  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES (v_txn_id, v_wallet_id, 'wallet.topup', 'credit', p_amount, v_currency, COALESCE(p_reference_type, 'topup'), p_reference_id, COALESCE(p_description, 'Nạp tiền vào ví'));

  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet_id);
END;
$$;

-- ============================================
-- 3. Auto-create wallet on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, locked_amount, currency)
  VALUES (NEW.id, 0, 0, 'VND')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
