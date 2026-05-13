-- ============================================
-- Fix: Request payout — atomic RPC with FOR UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION public.request_payout(
  p_user_id UUID,
  p_amount BIGINT,
  p_fee BIGINT,
  p_bank_account JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_payout_id UUID;
  v_available BIGINT;
  v_fee_setting TEXT;
  v_actual_fee BIGINT;
BEGIN
  -- Lock wallet
  SELECT id, balance, locked_amount
  INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Check sufficient balance
  v_available := v_wallet.balance - v_wallet.locked_amount;
  IF v_available < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Get fee from app_settings, fallback to provided fee or 5000
  BEGIN
    SELECT value INTO v_fee_setting FROM app_settings WHERE key = 'payout_fee';
    v_actual_fee := COALESCE(v_fee_setting::BIGINT, p_fee, 5000);
  EXCEPTION WHEN OTHERS THEN
    v_actual_fee := p_fee;
  END;

  -- Lock amount in wallet
  UPDATE wallets
  SET locked_amount = v_wallet.locked_amount + p_amount,
      updated_at = now()
  WHERE id = v_wallet.id;

  -- Create payout record
  INSERT INTO payouts (wallet_id, user_id, amount, fee, bank_account, status)
  VALUES (v_wallet.id, p_user_id, p_amount, v_actual_fee, p_bank_account, 'pending')
  RETURNING id INTO v_payout_id;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount', p_amount,
    'fee', v_actual_fee
  );
END;
$$;
