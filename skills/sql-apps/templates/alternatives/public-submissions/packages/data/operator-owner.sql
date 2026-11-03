-- OPERATOR ONLY, on appdb through a privileged connection. Never grant this to runtime.
-- Independently verify the tenant/oid against the real Entra directory and obtain approval.
-- Edit all four values deliberately; defaults refuse to change membership.
SET XACT_ABORT ON;
DECLARE @Approved bit = 0;
DECLARE @Action nvarchar(max) = N'REVIEW'; -- ENROLL or REVOKE
DECLARE @TenantText nvarchar(max) = N'REPLACE_VERIFIED_TENANT_GUID';
DECLARE @OwnerText nvarchar(max) = N'REPLACE_VERIFIED_USER_OBJECT_GUID';
DECLARE @TenantId uniqueidentifier = TRY_CONVERT(uniqueidentifier, @TenantText);
DECLARE @OwnerId uniqueidentifier = TRY_CONVERT(uniqueidentifier, @OwnerText);
IF @Approved <> 1 OR @Action NOT IN (N'ENROLL', N'REVOKE')
  THROW 51040, 'Explicit operator approval and ENROLL or REVOKE are required.', 1;
IF @TenantId IS NULL OR @OwnerId IS NULL OR DATALENGTH(@TenantText) <> 72 OR DATALENGTH(@OwnerText) <> 72
  OR LOWER(@TenantText) COLLATE Latin1_General_100_BIN2 <> CONVERT(nvarchar(36), @TenantId) COLLATE Latin1_General_100_BIN2
  OR LOWER(@OwnerText) COLLATE Latin1_General_100_BIN2 <> CONVERT(nvarchar(36), @OwnerId) COLLATE Latin1_General_100_BIN2
  OR @TenantId = '00000000-0000-0000-0000-000000000000'
  OR @OwnerId = '00000000-0000-0000-0000-000000000000'
  THROW 51041, 'Exact nonzero tenant and user object GUIDs are required.', 1;
BEGIN TRANSACTION;
IF @Action = N'ENROLL'
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.SubmissionOwners WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId AND OwnerId = @OwnerId)
    INSERT dbo.SubmissionOwners (TenantId, OwnerId) VALUES (@TenantId, @OwnerId);
END
ELSE
  DELETE dbo.SubmissionOwners WHERE TenantId = @TenantId AND OwnerId = @OwnerId;
COMMIT TRANSACTION;
