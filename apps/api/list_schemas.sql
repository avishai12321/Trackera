SELECT 
    n.nspname AS schema_name,
    COUNT(c.relname) AS table_count
FROM pg_namespace n
LEFT JOIN pg_class c ON n.oid = c.relnamespace AND c.relkind = 'r'
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
GROUP BY n.nspname
ORDER BY n.nspname;
