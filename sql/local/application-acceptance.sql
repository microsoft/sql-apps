SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Todos') IS NOT NULL
    THROW 51030, 'Legacy Todo sample data/schema remains. Review/export it and approve a separate cleanup migration; publishing will not drop it.', 1;
IF OBJECT_ID(N'dbo.TodoOwnerPolicy') IS NOT NULL OR OBJECT_ID(N'dbo.TodoOwnerPredicate') IS NOT NULL
    THROW 51031, 'Legacy Todo security objects remain. Review a separate cleanup migration; no automatic drop is performed.', 1;
IF OBJECT_ID(N'dbo.OwnerPredicate') IS NULL
    THROW 51032, 'Shared domain-neutral ownership predicate is missing.', 1;
PRINT N'CLEAN APPLICATION DATABASE PASSED';
