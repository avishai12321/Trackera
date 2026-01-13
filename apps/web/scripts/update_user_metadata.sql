-- Helper query to update specific user metadata
-- Replace YOUR_EMAIL_HERE with the email address you are logged in with
UPDATE auth.users 
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN '{"company_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
    ELSE raw_user_meta_data || '{"company_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
  END
WHERE email = 'YOUR_EMAIL_HERE';

-- Alternatively, update all users to belong to this test company (Useful for dev)
UPDATE auth.users 
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN '{"company_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
    ELSE raw_user_meta_data || '{"company_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
  END;
