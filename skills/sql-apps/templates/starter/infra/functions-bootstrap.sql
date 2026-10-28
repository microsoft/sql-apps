:ON ERROR EXIT
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @ClientId uniqueidentifier = TRY_CONVERT(uniqueidentifier, '$(FunctionsClientId)');
IF @ClientId IS NULL OR @ClientId = '00000000-0000-0000-0000-000000000000'
  THROW 51020, 'Use the approved Functions service principal application client ID.', 1;
DECLARE @Sid binary(16) = CONVERT(binary(16), @ClientId);
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_functions' AND (sid <> @Sid OR type <> 'E'))
  THROW 51021, 'Existing app_functions identity differs. Review identity migration; do not overwrite it.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_functions')
BEGIN
  DECLARE @CreateUser nvarchar(max) = N'CREATE USER app_functions WITH SID = '
    + CONVERT(nvarchar(34), @Sid, 1) + N', TYPE = E;';
  EXEC sys.sp_executesql @CreateUser;
END;
GO
:r packages/data/functions-permissions.sql
COMMIT TRANSACTION;
