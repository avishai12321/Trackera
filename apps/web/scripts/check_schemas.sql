-- Check which schemas currently exist in the database
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'company_%';

-- Check if the tables exist inside the UUID schema
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema LIKE 'company_%';
