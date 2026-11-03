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
