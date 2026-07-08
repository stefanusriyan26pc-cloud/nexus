-- Add bio and location fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
