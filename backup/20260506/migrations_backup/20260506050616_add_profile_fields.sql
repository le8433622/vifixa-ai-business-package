-- Migration: Add full_name and other fields to profiles
-- Per Step 10: Fix "Could not find the 'full_name' column"

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Add comments
COMMENT ON COLUMN profiles.full_name IS 'User full name from user_metadata';
COMMENT ON COLUMN profiles.avatar_url IS 'Avatar image URL';
COMMENT ON COLUMN profiles.bio IS 'User biography';
