#Requires -Version 5.1
<#
.SYNOPSIS
  Mark verified Supabase migrations as applied (history repair only — no SQL execution).

.DESCRIPTION
  Default mode is DRY-RUN. Prints planned `supabase migration repair` commands.
  Use -Execute to run repairs after interactive confirmation per batch.

  Does NOT run `supabase db push` or `supabase db reset`.

.PARAMETER Execute
  Actually run migration repair commands (after confirmation).

.PARAMETER Force
  Allow running when git working tree is dirty.

.EXAMPLE
  .\scripts\repair-supabase-migration-history.ps1

.EXAMPLE
  .\scripts\repair-supabase-migration-history.ps1 -Execute
#>
[CmdletBinding()]
param(
  [switch]$Execute,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = 'C:\Users\runek\OneDrive\Dokumenter\GitHub\Songcraft'

# Verified migration versions — see docs/SUPABASE_MIGRATION_APPLIED_VERSIONS.md
# Excludes manual-review migrations (seeds / duplicate DDL).
$VerifiedVersions = @(
  '20260428'
  '20260428100000'
  '20260428100100'
  '20260429100000'
  '20260429100100'
  '20260429100200'
  '20260429100300'
  '20260430100000'
  '20260430100100'
  '20260430100200'
  '20260501'
  '20260514100000'
  '20260514100100'
  '20260514100200'
  '20260514100300'
  '20260514100400'
  '20260515100000'
  '20260515100100'
  '20260515100200'
  '20260516100000'
  '20260516100100'
  '20260516100200'
  '20260516100300'
  '20260517100000'
  '20260517100100'
  '20260517100200'
  '20260517100300'
  '20260518100000'
  '20260518100100'
  '20260519'
  '20260519120000'
  '20260519140000'
  '20260520'
  '20260520120000'
  '20260521'
  '20260521120000'
  '20260522'
  '20260523'
  '20260524'
  '20260524120000'
  '20260525'
  '20260525120000'
  '20260526'
  '20260526120000'
  '20260527'
  '20260528'
  '20260528120000'
  '20260529'
  '20260529120000'
  '20260530120000'
  '20260706120000'
  '20260706140000'
  '20260706150000'
  '20260706160000'
  '20260706170000'
  '20260706180000'
  '20260706190000'
  '20260706190100'
  '20260713120000'
  '20260713140000'
  '20260713160000'
  '20260713161000'
)

$ManualReviewVersions = @(
  '20260517180106'      # duplicate song_comments DDL
  '20260706140100'      # v2 community seed inserts
  '20260706200000'      # v2 beta readiness seed inserts
)

function Write-Log {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $line
  if ($script:LogPath) { Add-Content -Path $script:LogPath -Value $line }
}

Set-Location $ProjectRoot
Write-Host "Project root: $(Get-Location)"

if ((Get-Location).Path -ne $ProjectRoot) {
  throw "Failed to set project root to $ProjectRoot"
}

$logsDir = Join-Path $ProjectRoot 'logs'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
$script:LogPath = Join-Path $logsDir ("supabase-migration-repair-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
Write-Log "Log file: $script:LogPath"
Write-Log "Mode: $(if ($Execute) { 'EXECUTE' } else { 'DRY-RUN' })"

Write-Log '--- git status ---'
$status = git status --porcelain 2>&1
$status | ForEach-Object { Write-Log $_ }

if ($status -and -not $Force) {
  throw "Working tree is dirty. Commit or stash changes, or pass -Force."
}

Write-Log ''
Write-Log "Verified versions to mark applied: $($VerifiedVersions.Count)"
Write-Log "Manual review (skipped): $($ManualReviewVersions -join ', ')"

# Skip versions already on remote (20260428 is expected pre-repair)
Write-Log ''
Write-Log '--- planned repair commands ---'
foreach ($v in $VerifiedVersions) {
  $cmd = "npx supabase migration repair --status applied $v"
  Write-Log $cmd
}

if (-not $Execute) {
  Write-Log ''
  Write-Log 'DRY-RUN complete. Re-run with -Execute to apply repairs after review.'
  exit 0
}

Write-Host ''
$confirmAll = Read-Host "Execute $($VerifiedVersions.Count) migration repair commands? Type YES to continue"
if ($confirmAll -ne 'YES') {
  Write-Log 'Aborted by user.'
  exit 1
}

$batchSize = 10
for ($i = 0; $i -lt $VerifiedVersions.Count; $i += $batchSize) {
  $batch = $VerifiedVersions[$i..([Math]::Min($i + $batchSize - 1, $VerifiedVersions.Count - 1))]
  Write-Host ''
  Write-Host "Next batch ($($batch.Count) versions):"
  $batch | ForEach-Object { Write-Host "  $_" }
  $batchConfirm = Read-Host "Run this batch? (y/N)"
  if ($batchConfirm -notmatch '^[yY]') {
    Write-Log "Skipped batch starting at index $i"
    continue
  }
  foreach ($v in $batch) {
    Write-Log "RUN: npx supabase migration repair --status applied $v"
    $output = npx supabase migration repair --status applied $v 2>&1
    $output | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
      Write-Log "ERROR: repair failed for version $v (exit $LASTEXITCODE)"
      throw "Migration repair failed for $v"
    }
  }
}

Write-Log ''
Write-Log '--- post-repair migration list ---'
$list = npx supabase migration list 2>&1
$list | ForEach-Object { Write-Log $_ }

Write-Log ''
Write-Log 'Repair complete. Run scripts/verify-supabase-migration-repair.ps1 next.'
Write-Log 'Do NOT run db push until manual-review migrations are resolved.'
