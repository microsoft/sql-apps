-- Appended by the installer to both reviewed runtime permission scripts.
DENY SELECT ON OBJECT::api.Items TO app_runtime;
DENY EXECUTE ON OBJECT::api.CreateItem TO app_runtime;
GRANT EXECUTE ON OBJECT::api.Submit TO app_runtime;
GRANT EXECUTE ON OBJECT::api.Submissions TO app_runtime;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_runtime;
