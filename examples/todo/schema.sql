CREATE TABLE dbo.Todos (
    id uniqueidentifier NOT NULL CONSTRAINT PK_Todos PRIMARY KEY DEFAULT NEWID(),
    owner_oid nvarchar(36) NOT NULL DEFAULT CONVERT(nvarchar(36), SESSION_CONTEXT(N'oid')),
    title nvarchar(200) NOT NULL,
    completed bit NOT NULL DEFAULT 0,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Todos_Owner ON dbo.Todos(owner_oid, created_at);
GO
CREATE SECURITY POLICY dbo.TodoOwnerPolicy
ADD FILTER PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.Todos,
ADD BLOCK PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.Todos AFTER INSERT,
ADD BLOCK PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.Todos AFTER UPDATE
WITH (STATE = ON);
