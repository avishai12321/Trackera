-- Check your specific user metadata
-- Replace the email below if you are using a different one
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';

-- Or just list all users to see (safest if there are few users)
SELECT email, raw_user_meta_data FROM auth.users;
