# Cloud SQL migration steps

Use the approved Entra SQL operator, connect to the **application database** (not
`master`), and keep encryption and certificate verification enabled. This procedure
applies every numbered migration in order, including profile-specific migrations.
Do not run a profile bootstrap until all applicable migrations are verified.

From the app root:

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

The starter files are `001-initial.sql`; the public-inbox profile also requires
`002-public-submissions.sql`. Keep migrations consecutive, forward-only and
transactional. Never edit an applied migration or reset the database to pass a
check. Follow the selected profile's operator guide for identity bootstrap and
permissions only after this step.

## Existing databases and recovery

This procedure and local startup are migration runners, not schema-baseline
importers. An absent `dbo.SchemaVersions` is treated as no recorded migrations;
`001-initial.sql` unconditionally creates its schema/tables/view/procedure.
An existing application's objects are not inspected, reconciled or automatically
marked applied. Do not run this against an arbitrary existing schema. Inspect
schema, data, collation, ownership and migration provenance first, then separately
review a compatible adoption/migration plan. Do not forge history to skip work.

Checksums are SHA-256 of migration text with CRLF normalized to LF. If a recorded
checksum differs, stop and inspect the shipped file and history without modifying
either to suppress the error. Recover the exact applied file from its trusted
revision and put intended schema changes in a new forward migration. Unknown,
malformed or inconsistent history needs investigation, not deletion or reset.

Recovery options are distinct:

- **Forward fix:** add and test a new transactional migration after reconciling
  the last committed version. Inspect SQL state after failure; do not assume all
  external operations or arbitrary future migrations roll back automatically.
- **Compatible app rollback:** deploy an older app/artifact only after proving it
  works with the current schema and preserves data. This does not undo migrations.
- **Database restore:** a separately approved operator procedure using actually
  available backups/service capabilities and a reviewed recovery point/target.
  The starter supplies no restore automation, backup guarantee or down-migrations.

Preserve databases, volumes, credentials and evidence. Never delete or recreate
them simply to obtain a passing build, migration or acceptance result.
