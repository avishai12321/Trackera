SET search_path TO company_test_company, public;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'company_test_company'
ORDER BY table_name;
