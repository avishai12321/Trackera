-- Drop valid plain_password column as we are now using Supabase Auth user_metadata
ALTER TABLE public.users DROP COLUMN IF EXISTS plain_password;
