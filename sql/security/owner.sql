CREATE FUNCTION dbo.OwnerPredicate(@owner_oid nvarchar(36))
RETURNS TABLE
WITH SCHEMABINDING
AS RETURN SELECT 1 AS allowed
WHERE @owner_oid = CONVERT(nvarchar(36), SESSION_CONTEXT(N'oid'))
  AND CHARINDEX(N' access_as_user ', N' ' + CONVERT(nvarchar(4000), SESSION_CONTEXT(N'scp')) + N' ') > 0;
