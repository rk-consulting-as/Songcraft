# Songcraft local deploy script.
# Usage from project root: ./deploy.ps1
#
# What it does:
#   1. Shows you what files have changed.
#   2. Asks for confirmation.
#   3. Pushes Supabase migrations (if supabase CLI is installed and project is linked).
#   4. Commits and pushes to GitHub (if git is installed).
#
# This is OPTIONAL. The simpler path is: push via GitHub Desktop and let the
# .github/workflows/supabase-migrations.yml workflow auto-apply migrations.
#
# Setup is documented in DEPLOY.md.

$ErrorActionPreference = 'Stop'

function Write-Section($text) {
  Write-Host ""
  Write-Host "── $text " -ForegroundColor Cyan -NoNewline
  Write-Host ("─" * [Math]::Max(0, 64 - $text.Length - 4)) -ForegroundColor Cyan
}

function Test-Command($name) {
  $null = Get-Command $name -ErrorAction SilentlyContinue
  return $?
}

Write-Host ""
Write-Host "🚀 Songcraft deploy" -ForegroundColor Yellow
Write-Host ""

$hasGit = Test-Command 'git'
$hasSupabase = Test-Command 'supabase'

if (-not $hasGit) {
  Write-Host "⚠ git command not found." -ForegroundColor Yellow
  Write-Host "  Install Git for Windows from https://git-scm.com/download/win, OR push via GitHub Desktop instead." -ForegroundColor DarkGray
  Write-Host ""
}
if (-not $hasSupabase) {
  Write-Host "⚠ supabase command not found." -ForegroundColor Yellow
  Write-Host "  Install with: npm install -g supabase  (one-time setup)" -ForegroundColor DarkGray
  Write-Host "  Then: supabase login   and   supabase link --project-ref <ref>" -ForegroundColor DarkGray
  Write-Host ""
}

# Step 1: Show git status
if ($hasGit) {
  Write-Section "Changed files"
  git status --short
}

# Step 2: List migration files in folder
Write-Section "Migration files in supabase/migrations/"
if (Test-Path 'supabase/migrations') {
  Get-ChildItem 'supabase/migrations' -Filter *.sql | ForEach-Object {
    Write-Host "  • $($_.Name)"
  }
} else {
  Write-Host "  (folder not found)"
}

# Step 3: Confirm
Write-Host ""
$confirm = Read-Host "Proceed with deploy? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
  Write-Host "Cancelled." -ForegroundColor DarkGray
  exit 0
}

# Step 4: Supabase push
if ($hasSupabase) {
  Write-Section "Pushing migrations to Supabase"
  supabase db push --include-all
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ supabase db push failed. Stopping before git." -ForegroundColor Red
    exit 1
  }
  Write-Host "✓ Supabase migrations applied." -ForegroundColor Green
} else {
  Write-Host "Skipped Supabase step (CLI not installed)." -ForegroundColor DarkGray
}

# Step 5: Git commit + push
if ($hasGit) {
  Write-Section "Committing and pushing to GitHub"
  Write-Host ""
  $msg = Read-Host "Commit message (Enter for default)"
  if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "Songcraft session updates"
  }

  git add .
  if ($LASTEXITCODE -ne 0) { Write-Host "❌ git add failed" -ForegroundColor Red; exit 1 }

  git commit -m "$msg" 2>&1 | Tee-Object -Variable commitOutput
  # If nothing to commit, git returns non-zero — that's OK if the commit message says so.
  if ($LASTEXITCODE -ne 0 -and $commitOutput -notmatch 'nothing to commit') {
    Write-Host "❌ git commit failed" -ForegroundColor Red
    exit 1
  }

  git push
  if ($LASTEXITCODE -ne 0) { Write-Host "❌ git push failed" -ForegroundColor Red; exit 1 }
  Write-Host "✓ Pushed to GitHub." -ForegroundColor Green
} else {
  Write-Host "Skipped git step (CLI not installed). Push via GitHub Desktop instead." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "✅ Done. Vercel will auto-deploy in ~1 minute." -ForegroundColor Green
Write-Host ""
