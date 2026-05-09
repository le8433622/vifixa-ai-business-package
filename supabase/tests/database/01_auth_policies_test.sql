-- Test Supabase RLS Policies
-- Requires pgTAP extension

BEGIN;
SELECT plan(3);

-- Test 1: Profiles are viewable by everyone
SELECT can_relation_be_read_by('anon', 'profiles');

-- Test 2: Only authenticated users can create orders
SELECT can_relation_be_inserted_by('authenticated', 'orders');

-- Test 3: Workers table is protected
SELECT can_relation_be_inserted_by('anon', 'workers') IS FALSE;

SELECT * FROM finish();
ROLLBACK;
