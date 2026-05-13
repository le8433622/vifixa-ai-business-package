-- ============================================
-- Fix: Approve payout — atomic RPC with FOR UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_payout(
  p_payout_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_wallet RECORD;
  v_new_balance BIGINT;
  v_new_locked BIGINT;
  v_transaction_id TEXT;
BEGIN
  -- Lock payout + wallet
  SELECT p.id, p.wallet_id, p.amount, p.fee, p.status, p.user_id
  INTO v_payout
  FROM payouts p
  WHERE p.id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found');
  END IF;

  IF v_payout.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout already processed');
  END IF;

  -- Lock wallet
  SELECT id, balance, locked_amount, currency
  INTO v_wallet
  FROM wallets
  WHERE id = v_payout.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_new_balance := GREATEST(0, v_wallet.balance - v_payout.amount - v_payout.fee);
  v_new_locked := GREATEST(0, v_wallet.locked_amount - v_payout.amount);

  -- Update wallet
  UPDATE wallets
  SET balance = v_new_balance,
      locked_amount = v_new_locked,
      updated_at = now()
  WHERE id = v_wallet.id;

  -- Mark payout as completed
  UPDATE payouts
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_payout_id;

  -- Create ledger entries
  v_transaction_id := 'payout_' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO ledger_entries (transaction_id, wallet_id, account, direction, amount, currency, reference_type, reference_id, description)
  VALUES
    (v_transaction_id, v_wallet.id, 'wallet.withdrawal', 'debit', v_payout.amount, v_wallet.currency, 'payout', p_payout_id, 'Withdrawal to bank account'),
    (v_transaction_id, v_wallet.id, 'fee.payout', 'debit', v_payout.fee, v_wallet.currency, 'fee', p_payout_id, 'Payout processing fee');

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id);
END;
$$;
