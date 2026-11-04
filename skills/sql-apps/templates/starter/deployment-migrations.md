# Cloud SQL migration steps

Use the approved Entra SQL operator and **application database**, not `master`,
with encryption/certificate verification. Apply all numbered/profile migrations
in order and verify them before identity bootstrap.

```powershell
$sqlHost = '<approved-sql-hostname>'
$database = '<approved-application-database>'
$migrations = @(Get-ChildItem packages\data\migrations -Filter '*.sql' | Sort-Object Name)
if (-not $migrations.Count) { throw 'No migrations found.' }
for ($index = 0; $index -lt $migrations.Count; $index++) {
  if ($migrations[$index].BaseName -notmatch '^(\d{3})-.+$') {
    throw "Invalid migration name: $($migrations[$index].Name)"
  }
  if ([System.Convert]::ToInt32($Matches[1]) -ne $index + 1) {
    throw 'Migration names must be unique, consecutive NNN-name.sql versions starting at 001.'
  }
}
$history = sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -h -1 -W `
  -Q "SET NOCOUNT ON; IF OBJECT_ID('dbo.SchemaVersions') IS NOT NULL SELECT CONCAT(Version,':',Checksum) FROM dbo.SchemaVersions ORDER BY Version;"
if ($LASTEXITCODE -ne 0) { throw 'Migration history read failed.' }
$applied = @{}
foreach ($line in $history) {
  if (-not "$line".Trim()) { continue }
  if ("$line".Trim() -notmatch '^(\d+):([a-f0-9]{64})$') { throw 'Invalid migration history; inspect without resetting data.' }
  $version = [int]$Matches[1]
  if ($version -lt 1 -or $version -gt $migrations.Count -or $applied.ContainsKey($version)) {
    throw 'Migration history contains an unknown or duplicate version.'
  }
  $applied[$version] = $Matches[2]
}
for ($version = 1; $version -le $applied.Count; $version++) {
  if (-not $applied.ContainsKey($version)) {
    throw 'Migration history is not consecutive; inspect without resetting data.'
  }
}
for ($index = 0; $index -lt $migrations.Count; $index++) {
  $file = $migrations[$index]
  $version = [System.Convert]::ToInt32($file.BaseName.Substring(0, 3))
  $hash = node -e "const fs=require('node:fs'),c=require('node:crypto');console.log(c.createHash('sha256').update(fs.readFileSync(process.argv[1],'utf8').replace(/\r\n/g,'\n')).digest('hex'))" $file.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration $version checksum failed." }
  if ($applied.ContainsKey($version)) {
    if ($applied[$version] -ne $hash.Trim()) { throw "Migration $version changed after application; add a forward migration." }
    continue
  }
  if ($applied.Count -gt $index) { throw "Migration history is not consecutive at version $version." }
  sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b `
    -v "MigrationHash=$hash" -i $file.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration $version failed. Preserve data and inspect history before retrying." }
  $verified = sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -h -1 -W `
    -Q "SET NOCOUNT ON; SELECT Checksum FROM dbo.SchemaVersions WHERE Version=$version;"
  if ($LASTEXITCODE -ne 0 -or "$verified".Trim() -ne $hash.Trim()) {
    throw "Migration $version did not record its expected checksum."
  }
  $applied[$version] = $hash.Trim()
}
```

Default: `001-initial.sql`; public adds `002-public-submissions.sql`.
New versions must be consecutive, forward-only and transactional.

## Authoring and first-run checks

Filtered indexes, indexed views and indexed computed columns require:

```sql
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
```

Preserve settings across `GO`. Module creation captures `QUOTED_IDENTIFIER`/
`ANSI_NULLS`; inspect runtime write-session settings too.
When same-batch compilation rejects references to newly added columns, separate
DDL and dependent statements with `GO`; retain the migration transaction.
Test the actual selected migration runner and API early on approved isolated SQL,
including invalid/conflicting writes; text inspection is not execution evidence.

## Existing databases and recovery

After failure, inspect history/state before retry.
Edit only confirmed unapplied, uncommitted migrations; otherwise add a forward fix.
Do not change shipped or applied checksums or reset data/volumes for a passing run.

No automatic baseline import: without `dbo.SchemaVersions`, migration 001 attempts
unconditional object creation. Inspect schema/data/collation/ownership/provenance
and review adoption separately; never forge history.

Checksums use SHA-256 of CRLF-to-LF-normalized text.
On mismatch, restore the trusted applied file; never reset history.

- **Forward fix:** reconcile the last committed version; test a new transactional
  migration. Do not assume external operations/future migrations roll back.
- **Compatible app rollback:** prove the older artifact works with current schema
  and data; migrations remain applied.
- **Database restore:** separately approved operator plan with available backups
  and reviewed recovery point/target. No bundled restore, backup guarantee or down-migrations.
