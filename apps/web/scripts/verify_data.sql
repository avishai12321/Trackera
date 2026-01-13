-- Verify that tables and data exist in the correct schema
SELECT 
    table_schema, 
    table_name, 
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int as approx_row_count
FROM information_schema.tables 
WHERE table_schema = 'company_test_company'
ORDER BY table_name;

-- Show first 5 employees to confirm data
SELECT * FROM "company_test_company".employees LIMIT 5;
