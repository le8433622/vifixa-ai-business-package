-- Phase 25: Fix auth signup — consolidate triggers, add EXCEPTION handling
-- 2026-05-19
-- Root cause: handle_new_user_wallet() inserts into wallets without wallet_type
-- causing constraint violation -> trigger rollback -> GoTrue "Database error saving new user"
-- Fix: consolidate all 3 triggers into handle_new_user(), add EXCEPTION

-- 1. Fix handle_new_user_wallet: add missing wallet_type and EXCEPTION
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO wallets (user_id, wallet_type, balance, locked_amount, currency)
  VALUES (NEW.id, 'txn', 0, 0, 'VND')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_wallet error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Fix ensure_user_wallets: add EXCEPTION
CREATE OR REPLACE FUNCTION public.ensure_user_wallets(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO wallets (user_id, wallet_type, balance, locked_amount, currency)
  VALUES
    (user_uuid, 'txn', 0, 0, 'VND'),
    (user_uuid, 'stake', 0, 0, 'VND'),
    (user_uuid, 'reward', 0, 0, 'VFC'),
    (user_uuid, 'treasury', 0, 0, 'VND')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ensure_user_wallets error for user %: %', user_uuid, SQLERRM;
END;
$$;

-- 3. Fix handle_new_user_wallets: add EXCEPTION
CREATE OR REPLACE FUNCTION public.handle_new_user_wallets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM ensure_user_wallets(NEW.id);
  INSERT INTO vfc_points (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_wallets error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Fix handle_new_user: consolidate and add EXCEPTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  profile_role TEXT;
BEGIN
  profile_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF profile_role NOT IN ('customer', 'worker', 'admin') THEN
    profile_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email, profile_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;