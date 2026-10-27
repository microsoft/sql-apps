SET XACT_ABORT ON;
BEGIN TRANSACTION;
EXEC(N'CREATE SCHEMA api');
CREATE TABLE dbo.SchemaVersions (
  Version int NOT NULL PRIMARY KEY,
  Checksum char(64) NOT NULL
);
CREATE TABLE dbo.Items (
  Id uniqueidentifier NOT NULL CONSTRAINT PK_Items PRIMARY KEY DEFAULT NEWID(),
  OwnerId uniqueidentifier NOT NULL,
  Label nvarchar(120) NOT NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Items_Label CHECK (LEN(TRIM(Label)) BETWEEN 1 AND 120 AND Label = TRIM(Label)),
  CONSTRAINT UQ_Items_Owner_Label UNIQUE (OwnerId, Label)
);
GO
CREATE VIEW api.Items AS
  SELECT Id, Label, CreatedAt FROM dbo.Items
  WHERE OwnerId = TRY_CONVERT(uniqueidentifier, SESSION_CONTEXT(N'oid'));
GO
CREATE PROCEDURE api.CreateItem @Label nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @OwnerId uniqueidentifier = TRY_CONVERT(uniqueidentifier, SESSION_CONTEXT(N'oid'));
  IF @OwnerId IS NULL THROW 51000, 'A validated oid identity is required.', 1;
  IF @Label IS NULL OR LEN(TRIM(@Label)) = 0 OR DATALENGTH(@Label) > 240
    THROW 51001, 'Label must contain 1 to 120 characters.', 1;
  INSERT dbo.Items (OwnerId, Label)
    OUTPUT inserted.Id, inserted.Label, inserted.CreatedAt
    VALUES (@OwnerId, TRIM(@Label));
END;
GO
INSERT dbo.SchemaVersions (Version, Checksum) VALUES (1, '$(MigrationHash)');
COMMIT TRANSACTION;
