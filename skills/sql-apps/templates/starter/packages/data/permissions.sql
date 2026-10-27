IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_runtime')
  CREATE USER app_runtime FOR LOGIN app_api;
GRANT SELECT ON OBJECT::api.Items TO app_runtime;
GRANT EXECUTE ON OBJECT::api.CreateItem TO app_runtime;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_runtime;
