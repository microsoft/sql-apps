DECLARE @principal uniqueidentifier = TRY_CONVERT(uniqueidentifier, '$(DabPrincipalId)');
IF @principal IS NULL OR @principal = '00000000-0000-0000-0000-000000000000'
    THROW 50001, 'A valid DAB managed identity principal ID is required.', 1;

DECLARE @sid varbinary(16) = CONVERT(varbinary(16), @principal);
IF DATABASE_PRINCIPAL_ID(N'sql_apps_dab') IS NULL
BEGIN
    DECLARE @create nvarchar(max) =
        N'CREATE USER [sql_apps_dab] WITH SID = ' +
        CONVERT(nvarchar(34), @sid, 1) + N', TYPE = E;';
    EXEC sys.sp_executesql @create;
END
ELSE IF (SELECT sid FROM sys.database_principals WHERE name = N'sql_apps_dab') <> @sid
    THROW 50002, 'Existing DAB user belongs to a different identity; review before changing permissions.', 1;

GRANT SELECT ON dbo.FileJobs TO [sql_apps_dab];
GRANT VIEW DEFINITION ON dbo.FileJobs TO [sql_apps_dab];
