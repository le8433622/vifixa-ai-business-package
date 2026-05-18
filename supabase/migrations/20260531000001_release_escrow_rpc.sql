-- 🏛️ Release Escrow RPC — atomic escrow → ledger → wallet
-- Called by wallet-manager escrowRelease()
-- Creates escrow.released ledger entries (worker earnings source of truth)

CREATE OR REPLACE FUNCTION release_escrow(
  p_order_id      UUID,
  p_worker_payout NUMERIC,
  p_platform_fee  NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_escrow          RECORD;
  v_worker_wallet   UUID;
  v_txn_id          TEXT;
BEGIN
  -- Lock escrow row
  SELECT * INTO v_escrow FROM escrow WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Escrow not found');
  END IF;
  IF v_escrow.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Escrow already processed: ', v_escrow.status);
  END IF;

  -- Get worker's txn wallet
  SELECT id INTO v_worker_wallet FROM wallets
    WHERE user_id = v_escrow.worker_id AND wallet_type = 'txn';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Worker txn wallet not found');
  END IF;

  v_txn_id := 'esc_rel_' || replace(gen_random_uuid()::text, '-', '');

  -- 1. Update escrow status
  UPDATE escrow SET
    status = 'released',
    released_at = NOW()
  WHERE id = v_escrow.id;

  -- 2. Ledger: worker payout released
  INSERT INTO ledger (txn_id, wallet_id, account, direction, amount, currency, ref_type, ref_id, description)
  VALUES (
    v_txn_id,
    v_worker_wallet,
    'escrow.released',
    'credit',
    p_worker_payout,
    'VND',
    'escrow',
    p_order_id,
    'Escrow released — order ' || p_order_id
  );

  -- 3. Credit worker's txn wallet
  UPDATE wallets SET
    balance = balance + p_worker_payout,
    updated_at = NOW()
  WHERE id = v_worker_wallet;

  -- 4. Ledger: platform fee debit
  IF p_platform_fee > 0 THEN
    INSERT INTO ledger (txn_id, account, direction, amount, currency, ref_type, ref_id, description)
    VALUES (
      v_txn_id,
      'platform.fee',
      'debit',
      p_platform_fee,
      'VND',
      'fee',
      p_order_id,
      'Platform fee — order ' || p_order_id
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'released',
    'worker_payout', p_worker_payout,
    'platform_fee', p_platform_fee,
    'released_at', NOW()
  );
END;
$$;
