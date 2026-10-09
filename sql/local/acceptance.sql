SET NOCOUNT ON;
SET XACT_ABORT OFF;
IF USER_NAME() <> N'$(LocalDabUser)'
    THROW 51000, 'Acceptance must use the least-privilege app identity.', 1;
IF IS_ROLEMEMBER(N'db_owner') = 1 OR HAS_PERMS_BY_NAME(NULL, NULL, 'CONTROL') = 1
    THROW 51001, 'App identity must not have administrative permissions.', 1;

DECLARE @alice nvarchar(36) = CONVERT(nvarchar(36), NEWID());
DECLARE @bob nvarchar(36) = CONVERT(nvarchar(36), NEWID());
DECLARE @id uniqueidentifier = NEWID();
BEGIN TRANSACTION;
BEGIN TRY
    EXEC sys.sp_set_session_context @key=N'oid', @value=@alice;
    EXEC sys.sp_set_session_context @key=N'scp', @value=N'access_as_user';
    INSERT dbo.FileJobs(id,filename,blob_key) VALUES (@id,N'acceptance.txt',N'acceptance-snapshot');
    IF NOT EXISTS (SELECT 1 FROM dbo.FileJobs WHERE id=@id AND owner_oid=@alice AND status=N'queued')
        THROW 51011, 'Job owner default/read failed.', 1;
    UPDATE dbo.FileJobs SET status=N'completed' WHERE id=@id;
    IF @@ROWCOUNT <> 1 THROW 51012, 'Job owner update failed.', 1;

    EXEC sys.sp_set_session_context @key=N'oid', @value=@bob;
    IF EXISTS (SELECT 1 FROM dbo.FileJobs WHERE id=@id)
        THROW 51013, 'Cross-user job read exposed a row.', 1;
    UPDATE dbo.FileJobs SET status=N'failed' WHERE id=@id;
    IF @@ROWCOUNT <> 0 THROW 51014, 'Cross-user job update succeeded.', 1;
    DELETE dbo.FileJobs WHERE id=@id;
    IF @@ROWCOUNT <> 0 THROW 51015, 'Cross-user job delete succeeded.', 1;
    DECLARE @jobBlocked bit=0;
    BEGIN TRY
        INSERT dbo.FileJobs(id,owner_oid,filename,blob_key) VALUES (NEWID(),@alice,N'forbidden',N'forbidden');
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() <> 33504 THROW;
        SET @jobBlocked=1;
    END CATCH;
    IF @jobBlocked=0 THROW 51016, 'Cross-owner job insert bypassed the block predicate.', 1;


    EXEC sys.sp_set_session_context @key=N'oid', @value=@alice;
    SET @jobBlocked=0;
    BEGIN TRY
        UPDATE dbo.FileJobs SET owner_oid=@bob WHERE id=@id;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() <> 33504 THROW;
        SET @jobBlocked=1;
    END CATCH;
    IF @jobBlocked=0 THROW 51017, 'Job owner reassignment bypassed the block predicate.', 1;
    EXEC sys.sp_set_session_context @key=N'scp', @value=N'other_scope';
    IF EXISTS (SELECT 1 FROM dbo.FileJobs WHERE id=@id)
        THROW 51018, 'Missing delegated scope exposed job data.', 1;
    EXEC sys.sp_set_session_context @key=N'scp', @value=N'access_as_user';
    DELETE dbo.FileJobs WHERE id=@id;
    IF @@ROWCOUNT <> 1 THROW 51019, 'Owner job delete failed.', 1;
    ROLLBACK;
    PRINT N'LOCAL SQL ACCEPTANCE PASSED';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
