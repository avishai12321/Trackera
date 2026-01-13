SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('employees', 'projects', 'tenants')
ORDER BY schemaname, tablename;
