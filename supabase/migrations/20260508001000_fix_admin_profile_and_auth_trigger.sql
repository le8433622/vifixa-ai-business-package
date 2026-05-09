-- Ensure the production admin auth user has the correct RBAC profile.
UPDATE public.profiles
SET
  role = 'admin',
  updated_at = NOW()
WHERE id = 'c2395722-f527-4eb8-9ad7-e0efaba24276'
   OR email = 'admin@vifixa.com';

UPDATE public.profiles
SET
  email = 'admin@vifixa.com',
  updated_at = NOW()
WHERE id = 'c2395722-f527-4eb8-9ad7-e0efaba24276'
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE email = 'admin@vifixa.com'
      AND id <> 'c2395722-f527-4eb8-9ad7-e0efaba24276'
  );

INSERT INTO public.profiles (id, email, role, full_name)
SELECT
  'c2395722-f527-4eb8-9ad7-e0efaba24276',
  'admin@vifixa.com',
  'admin',
  'Vifixa Admin'
WHERE EXISTS (
  SELECT 1
  FROM auth.users
  WHERE id = 'c2395722-f527-4eb8-9ad7-e0efaba24276'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE id = 'c2395722-f527-4eb8-9ad7-e0efaba24276'
     OR email = 'admin@vifixa.com'
);

-- Create profile rows for future Supabase Auth users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    NEW.id,
    NEW.email,
    profile_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
