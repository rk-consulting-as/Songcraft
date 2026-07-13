#Requires -Version 5.1
<#
.SYNOPSIS
  Post-rename / post-repair checks for Supabase migration alignment.

.DESCRIPTION
  - Detects duplicate local migration version prefixes
  - Runs `supabase migration list` (read-only)
  - Reports whether db push is expected to be safe
  - Does NOT run db push
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = 'C:\Users\runek\OneDrive\Dokumenter\GitHub\Songcraft'
$MigrationsDir = Join-Path $ProjectRoot 'supabase\migrations'

Set-Location $ProjectRoot
Write-Host "Project root: $(Get-Location)"
Write-Host ''

# 1. Duplicate version check
Write-Host '=== Local duplicate migration versions ==='
$files = Get-ChildItem -Path $MigrationsDir -Filter '*.sql' | Sort-Object Name
$groups = $files | ForEach-Object {
  if ($_.Name -match '^(\d+)_') { [PSCustomObject]@{ Version = $Matches[1]; File = $_.Name } }
} | Group-Object Version | Where-Object { $_.Count -gt 1 }

$duplicateOk = $true
if ($groups) {
  $duplicateOk = $false
  foreach ($g in $groups) {
    Write-Host "DUPLICATE version $($g.Name) ($($g.Count) files):" -ForegroundColor Red
    $g.Group | ForEach-Object { Write-Host "  $($_.File)" }
  }
} else {
  Write-Host "OK - $($files.Count) migration files, all unique versions." -ForegroundColor Green
}

Write-Host ''
Write-Host '=== supabase migration list ==='
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  $listOutput = @(npx supabase migration list 2>&1 | ForEach-Object { "$_" })
} finally {
  $ErrorActionPreference = $prevEap
}
$listOutput | ForEach-Object { Write-Host $_ }

# Parse list for local-only / remote-only
$localOnly = @()
$remoteOnly = @()
$jsonLine = $listOutput | Where-Object { $_ -match '^\s*\{"migrations"' } | Select-Object -First 1
if ($jsonLine) {
  try {
    $parsed = $jsonLine | ConvertFrom-Json
    foreach ($m in $parsed.migrations) {
      $hasLocal = -not [string]::IsNullOrWhiteSpace($m.local)
      $hasRemote = -not [string]::IsNullOrWhiteSpace($m.remote)
      if ($hasLocal -and -not $hasRemote) { $localOnly += $m.local }
      if ($hasRemote -and -not $hasLocal) { $remoteOnly += $m.remote }
    }
    $localOnly = @($localOnly | Sort-Object -Unique)
    $remoteOnly = @($remoteOnly | Sort-Object -Unique)
  } catch {
    Write-Host "WARN: Could not parse migration list JSON: $_" -ForegroundColor Yellow
  }
} else {
  foreach ($line in $listOutput) {
    if ($line -match '^\s*(\d+)\s+\|\s+(\d+|-)\s+\|') {
      $local = $Matches[1]
      $remote = $Matches[2]
      if ($remote -eq '-') { $localOnly += $local }
    }
  }
}

Write-Host ''
Write-Host '=== Alignment summary ==='
if ($localOnly.Count -gt 0) {
  Write-Host "Local-only versions (not yet on remote): $($localOnly.Count)" -ForegroundColor Yellow
  $localOnly | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
  if ($localOnly.Count -gt 20) { Write-Host "  ... and $($localOnly.Count - 20) more" }
} else {
  Write-Host 'No local-only versions detected in migration list output.' -ForegroundColor Green
}

if ($remoteOnly.Count -gt 0) {
  Write-Host "Remote-only versions (no matching local file): $($remoteOnly.Count)" -ForegroundColor Yellow
  $remoteOnly | ForEach-Object { Write-Host "  $_" }
}

$manualReview = @('20260517180106', '20260706140100', '20260706200000')
$pendingManual = $manualReview | Where-Object { $_ -in $localOnly }

Write-Host ''
Write-Host '=== db push safety assessment ==='
if (-not $duplicateOk) {
  Write-Host 'UNSAFE: duplicate local migration versions still exist. Fix renames first.' -ForegroundColor Red
  exit 1
}

if ($localOnly.Count -eq 0) {
  Write-Host 'LIKELY SAFE: local and remote migration histories appear aligned.' -ForegroundColor Green
  Write-Host "You may run: npx supabase db push (expect no pending migrations)."
} elseif ($pendingManual.Count -eq $localOnly.Count) {
  Write-Host 'PARTIALLY SAFE: only manual-review seed migrations remain local-only.' -ForegroundColor Yellow
  Write-Host 'Resolve manual-review migrations before db push, or mark applied after seed verification.'
} else {
  Write-Host 'NOT YET SAFE: repair history or verify schema before db push.' -ForegroundColor Yellow
  Write-Host "Run: scripts/repair-supabase-migration-history.ps1 -Execute (after review)."
}

if (-not $duplicateOk) { exit 1 }
exit 0
