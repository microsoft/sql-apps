CREATE TABLE dbo.FileJobs (
    id uniqueidentifier NOT NULL CONSTRAINT PK_FileJobs PRIMARY KEY,
    owner_oid nvarchar(36) NOT NULL DEFAULT CONVERT(nvarchar(36), SESSION_CONTEXT(N'oid')),
    filename nvarchar(128) NOT NULL,
    blob_key nvarchar(256) NOT NULL,
    status nvarchar(16) NOT NULL DEFAULT N'queued',
    sha256 nvarchar(64) NULL,
    byte_count int NULL,
    line_count int NULL,
    error nvarchar(200) NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    parent_job_id uniqueidentifier NULL,
    CONSTRAINT CK_FileJobs_Status CHECK (status IN (N'queued', N'processing', N'completed', N'failed'))
);
GO
CREATE INDEX IX_FileJobs_Owner ON dbo.FileJobs(owner_oid, created_at);
GO
CREATE SECURITY POLICY dbo.FileJobOwnerPolicy
ADD FILTER PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.FileJobs,
ADD BLOCK PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.FileJobs AFTER INSERT,
ADD BLOCK PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.FileJobs AFTER UPDATE
WITH (STATE = ON);
