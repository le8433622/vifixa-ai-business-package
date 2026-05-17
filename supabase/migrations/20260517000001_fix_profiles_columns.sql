-- Fix missing columns in profiles table
-- Migration 20260514000002 used CREATE TABLE IF NOT EXISTS but table already existed
-- These columns were never actually added to the database

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Fix profiles for known test users
-- admin@vifixa.com → admin
-- tho@vifixa.com → worker  
-- khach@vifixa.com → customer (already correct)
UPDATE profiles SET role = 'admin' WHERE email = 'admin@vifixa.com' AND role != 'admin';
UPDATE profiles SET role = 'worker' WHERE email = 'tho@vifixa.com' AND role != 'worker';
UPDATE profiles SET full_name = email WHERE full_name IS NULL;
