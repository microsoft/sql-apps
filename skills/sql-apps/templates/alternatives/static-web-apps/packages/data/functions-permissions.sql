-- Operator-owned bootstrap, run on the application database, never on master.
-- Precreate app_functions for the Functions service principal APPLICATION client-ID SID
-- (the existing permissions.sql supports the separate local app_api login).
-- This script does not create credentials,
-- replace principals, or alter the existing DAB app_runtime identity.
-- Supply FunctionsClientId through the reviewed SQLCMD/bootstrap substitution path.
SET XACT_ABORT ON;
DECLARE @ExpectedClientId uniqueidentifier = TRY_CONVERT(uniqueidentifier, N'$(FunctionsClientId)');
IF @ExpectedClientId IS NULL
  THROW 51010, 'FunctionsClientId must be the approved service principal application client ID.', 1;
IF NOT EXISTS (
  SELECT 1 FROM sys.database_principals
  WHERE name = N'app_functions' AND type = 'E'
    AND sid = CONVERT(binary(16), @ExpectedClientId)
)
  THROW 51011, 'Precreate app_functions with the approved application client-ID SID; no principal was replaced.', 1;
GRANT SELECT ON OBJECT::api.Items TO app_functions;
GRANT EXECUTE ON OBJECT::api.CreateItem TO app_functions;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_functions;
