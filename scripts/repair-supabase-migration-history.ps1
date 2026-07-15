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

# Already recorded in remote schema_migrations — no repair command needed.
$AlreadyOnRemoteVersions = @(
  '20260428'
)

$RepairVersions = @(
  $VerifiedVersions | Where-Object { $_ -notin $AlreadyOnRemoteVersions }
)

function Write-Log {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $line
  if ($script:LogPath) { Add-Content -Path $script:LogPath -Value $line }
}

function Invoke-NativeCommand {
  <#
    Run a native process without PowerShell stderr-to-error-record conversion.
    Success is determined solely by the process exit code.
  #>
  param(
    [Parameter(Mandatory = $true)]
    [string]$FileName,
    [string[]]$ArgumentList = @(),
    [string]$WorkingDirectory = $ProjectRoot
  )

  $escapedArgs = $ArgumentList | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  $argumentString = [string]::Join(' ', $escapedArgs)

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.Arguments = $argumentString
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $WorkingDirectory

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  [void]$process.Start()

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [PSCustomObject]@{
    ExitCode = $process.ExitCode
    StdOut   = $stdout.TrimEnd()
    StdErr   = $stderr.TrimEnd()
    Command  = "$FileName $argumentString"
  }
}

function Write-CommandOutput {
  param(
    [string]$StdOut,
    [string]$StdErr
  )

  if ($StdOut) {
    foreach ($line in $StdOut -split "`r?`n") {
      if ($line.Length -gt 0) { Write-Log "STDOUT: $line" }
    }
  }
  if ($StdErr) {
    foreach ($line in $StdErr -split "`r?`n") {
      if ($line.Length -gt 0) { Write-Log "STDERR: $line" }
    }
  }
}

function Get-RemoteMigrationVersions {
  Write-Log 'Fetching remote migration history (read-only)...'
  $result = Invoke-NativeCommand -FileName 'npx' -ArgumentList @('supabase', 'migration', 'list')
  Write-Log "CMD: $($result.Command)"
  Write-CommandOutput -StdOut $result.StdOut -StdErr $result.StdErr

  if ($result.ExitCode -ne 0) {
    throw "Failed to fetch remote migration list (exit $($result.ExitCode))."
  }

  $remoteVersions = New-Object 'System.Collections.Generic.HashSet[string]'
  $combined = @()
  if ($result.StdOut) { $combined += $result.StdOut -split "`r?`n" }
  if ($result.StdErr) { $combined += $result.StdErr -split "`r?`n" }

  foreach ($line in $combined) {
    if ($line -match '^\s*\{"migrations"') {
      $parsed = $line | ConvertFrom-Json
      foreach ($m in $parsed.migrations) {
        if (-not [string]::IsNullOrWhiteSpace($m.remote)) {
          [void]$remoteVersions.Add([string]$m.remote)
        }
      }
    }
  }

  return @($remoteVersions | Sort-Object)
}

function Invoke-MigrationRepair {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Version
  )

  $result = Invoke-NativeCommand -FileName 'npx' -ArgumentList @(
    'supabase', 'migration', 'repair', '--status', 'applied', $Version
  )

  Write-Log "CMD: $($result.Command)"
  Write-CommandOutput -StdOut $result.StdOut -StdErr $result.StdErr
  Write-Log "EXIT: $($result.ExitCode)"

  return $result
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
$gitResult = Invoke-NativeCommand -FileName 'git' -ArgumentList @('status', '--porcelain')
if ($gitResult.StdOut) {
  $gitResult.StdOut -split "`r?`n" | Where-Object { $_.Length -gt 0 } | ForEach-Object { Write-Log $_ }
}
if ($gitResult.StdErr) {
  $gitResult.StdErr -split "`r?`n" | Where-Object { $_.Length -gt 0 } | ForEach-Object { Write-Log "STDERR: $_" }
}
$status = $gitResult.StdOut

if ($status -and -not $Force) {
  throw "Working tree is dirty. Commit or stash changes, or pass -Force."
}

Write-Log ''
Write-Log "Verified schema-applied versions: $($VerifiedVersions.Count)"
Write-Log "Already on remote (skipped): $($AlreadyOnRemoteVersions -join ', ')"
Write-Log "Repair commands to run: $($RepairVersions.Count)"
Write-Log "Manual review (skipped): $($ManualReviewVersions -join ', ')"

Write-Log ''
Write-Log '--- already on remote (no repair command) ---'
foreach ($v in $AlreadyOnRemoteVersions) {
  Write-Log "SKIP: $v - already recorded remotely"
}

Write-Log ''
Write-Log '--- planned repair commands ---'
foreach ($v in $RepairVersions) {
  $cmd = "npx supabase migration repair --status applied $v"
  Write-Log $cmd
}

if (-not $Execute) {
  Write-Log ''
  Write-Log 'DRY-RUN complete. Re-run with -Execute to apply repairs after review.'
  exit 0
}

Write-Host ''
$confirmAll = Read-Host "Execute $($RepairVersions.Count) migration repair commands? Type YES to continue"
if ($confirmAll -ne 'YES') {
  Write-Log 'Aborted by user.'
  exit 1
}

$script:LastSuccessfulVersion = $null
$script:RemoteVersions = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($v in $AlreadyOnRemoteVersions) { [void]$script:RemoteVersions.Add($v) }

Write-Log ''
Write-Log '--- loading remote migration history for resume safety ---'
try {
  foreach ($v in (Get-RemoteMigrationVersions)) {
    [void]$script:RemoteVersions.Add($v)
  }
  Write-Log "Remote versions currently recorded: $($script:RemoteVersions.Count)"
} catch {
  Write-Log "WARN: Could not load remote migration list: $_"
  Write-Log 'Proceeding without pre-check; repeated repair may still be safe if CLI no-ops.'
}

$batchSize = 10
for ($i = 0; $i -lt $RepairVersions.Count; $i += $batchSize) {
  $batch = $RepairVersions[$i..([Math]::Min($i + $batchSize - 1, $RepairVersions.Count - 1))]
  Write-Host ''
  Write-Host "Next batch ($($batch.Count) versions):"
  $batch | ForEach-Object { Write-Host "  $_" }
  $batchConfirm = Read-Host "Run this batch? (y/N)"
  if ($batchConfirm -notmatch '^[yY]') {
    Write-Log "Skipped batch starting at index $i"
    continue
  }
  foreach ($v in $batch) {
    if ($script:RemoteVersions.Contains($v)) {
      Write-Log "SKIP: $v already recorded remotely"
      $script:LastSuccessfulVersion = $v
      continue
    }

    Write-Log "RUN: npx supabase migration repair --status applied $v"
    $result = Invoke-MigrationRepair -Version $v
    if ($result.ExitCode -ne 0) {
      Write-Log "ERROR: repair failed for version $v (exit $($result.ExitCode))"
      Write-Log "FAILED COMMAND: $($result.Command)"
      if ($script:LastSuccessfulVersion) {
        Write-Log "Last successfully repaired version: $script:LastSuccessfulVersion"
        Write-Host "Last successfully repaired version: $script:LastSuccessfulVersion" -ForegroundColor Yellow
      } else {
        Write-Log 'Last successfully repaired version: none in this run'
        Write-Host 'Last successfully repaired version: none in this run' -ForegroundColor Yellow
      }
      exit 1
    }

    [void]$script:RemoteVersions.Add($v)
    $script:LastSuccessfulVersion = $v
    Write-Log "OK: version $v marked applied"
  }
}

Write-Log ''
Write-Log '--- post-repair migration list ---'
try {
  Get-RemoteMigrationVersions | Out-Null
} catch {
  Write-Log "WARN: post-repair migration list failed: $_"
}

Write-Log ''
Write-Log 'Repair complete. Run scripts/verify-supabase-migration-repair.ps1 next.'
Write-Log 'Do NOT run db push until manual-review migrations are resolved.'
