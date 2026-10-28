:ON ERROR EXIT
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @ClientId uniqueidentifier = TRY_CONVERT(uniqueidentifier, '$(DabClientId)');
IF @ClientId IS NULL OR @ClientId = '00000000-0000-0000-0000-000000000000'
  THROW 51010, 'Use the deployed DAB managed identity client ID.', 1;
DECLARE @Sid binary(16) = CONVERT(binary(16), @ClientId);
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_runtime' AND (sid <> @Sid OR type <> 'E'))
  THROW 51011, 'Existing app_runtime identity differs. Review identity migration; do not overwrite it.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_runtime')
BEGIN
  -- SQL external application users bind to client IDs, not role-assignment principal IDs.
  DECLARE @CreateUser nvarchar(max) = N'CREATE USER app_runtime WITH SID = '
    + CONVERT(nvarchar(34), @Sid, 1) + N', TYPE = E;';
  EXEC sys.sp_executesql @CreateUser;
END;
GO
:r packages/data/permissions.sql
COMMIT TRANSACTION;
