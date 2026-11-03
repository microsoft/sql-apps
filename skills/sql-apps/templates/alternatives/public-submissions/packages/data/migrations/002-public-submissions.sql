SET XACT_ABORT ON;
BEGIN TRANSACTION;
CREATE TABLE dbo.SubmissionOwners (
  TenantId uniqueidentifier NOT NULL,
  OwnerId uniqueidentifier NOT NULL,
  CONSTRAINT PK_SubmissionOwners PRIMARY KEY (TenantId, OwnerId),
  CONSTRAINT CK_SubmissionOwners_Tenant CHECK (TenantId <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT CK_SubmissionOwners_Owner CHECK (OwnerId <> '00000000-0000-0000-0000-000000000000')
);
CREATE TABLE dbo.Submissions (
  Id uniqueidentifier NOT NULL CONSTRAINT PK_Submissions PRIMARY KEY DEFAULT NEWID(),
  Label nvarchar(120) NOT NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Submissions_Label CHECK (LEN(TRIM(Label)) BETWEEN 1 AND 120 AND Label = TRIM(Label))
);
CREATE INDEX IX_Submissions_CreatedAt ON dbo.Submissions (CreatedAt DESC, Id DESC) INCLUDE (Label);
CREATE TABLE dbo.SubmissionBudget (
  Id int NOT NULL CONSTRAINT PK_SubmissionBudget PRIMARY KEY CHECK (Id = 1),
  MinuteLimit int NOT NULL CHECK (MinuteLimit BETWEEN 1 AND 60),
  RowLimit int NOT NULL CHECK (RowLimit BETWEEN 1 AND 1000)
);
INSERT dbo.SubmissionBudget (Id, MinuteLimit, RowLimit) VALUES (1, 60, 1000);
GO
CREATE PROCEDURE api.Submit @Label nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET LOCK_TIMEOUT 5000;
  IF @Label IS NULL OR LEN(TRIM(@Label)) = 0 OR DATALENGTH(@Label) > 240
    THROW 51001, 'Label must contain 1 to 120 characters.', 1;
  BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @MinuteLimit int, @RowLimit int, @Now datetime2;
    -- All hosts serialize on the same durable row before reading counts or inserting.
    SELECT @MinuteLimit = MinuteLimit, @RowLimit = RowLimit
      FROM dbo.SubmissionBudget WITH (UPDLOCK, HOLDLOCK) WHERE Id = 1;
    IF @MinuteLimit IS NULL OR @RowLimit IS NULL THROW 51030, 'Submission budget unavailable.', 1;
    SET @Now = SYSUTCDATETIME();
    IF (SELECT COUNT_BIG(*) FROM dbo.Submissions) >= @RowLimit
      OR (SELECT COUNT_BIG(*) FROM dbo.Submissions WHERE CreatedAt > DATEADD(second, -60, @Now)) >= @MinuteLimit
      THROW 51029, 'Submission budget reached.', 1;
    INSERT dbo.Submissions (Label, CreatedAt) VALUES (TRIM(@Label), @Now);
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH;
END;
GO
CREATE PROCEDURE api.Submissions @TenantId uniqueidentifier, @OwnerId uniqueidentifier
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET LOCK_TIMEOUT 5000;
  BEGIN TRY
    BEGIN TRANSACTION;
    IF NOT EXISTS (SELECT 1 FROM dbo.SubmissionOwners WITH (HOLDLOCK)
      WHERE TenantId = @TenantId AND OwnerId = @OwnerId)
      THROW 51000, 'An enrolled owner is required.', 1;
    SELECT TOP (100) Id, Label, CreatedAt FROM dbo.Submissions ORDER BY CreatedAt DESC, Id DESC;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH;
END;
GO
INSERT dbo.SchemaVersions (Version, Checksum) VALUES (2, '$(MigrationHash)');
COMMIT TRANSACTION;
