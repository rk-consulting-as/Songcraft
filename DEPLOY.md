# Deployment

There are two ways to deploy changes (code + database migrations):

1. **Auto** (recommended) — push via GitHub Desktop, GitHub Actions runs migrations on Supabase automatically, Vercel auto-deploys the code.
2. **Manual** — run `deploy.ps1` from PowerShell after I/Claude have made changes locally.

You only need to set up **one** of these. Both can coexist.

---

## Option 1 — Auto-deploy via GitHub Action (recommended)

This adds zero new tools to your workflow. You keep using GitHub Desktop. The migration workflow runs on GitHub's servers when you push.

### One-time setup (5 minutes)

You need three Supabase values stored as **GitHub repository secrets**.

#### A. Get the values from Supabase

1. **Project ref** — go to <https://supabase.com/dashboard> → click your project → **Settings → General** → "Reference ID". It looks like `abcdefghijklmnop` (16 characters).
2. **Access token** — go to <https://supabase.com/dashboard/account/tokens> → click **Generate new token** → name it "GitHub Actions" → copy the token (`sbp_...`). You only see it once.
3. **Database password** — the password you chose when you first created the Supabase project. If you forgot it: **Settings → Database → Connection info → Database Password → Reset database password**.

#### B. Save them in GitHub

1. Go to <https://github.com> → your `Songcraft` repository
2. **Settings → Secrets and variables → Actions → New repository secret**
3. Add three secrets (one at a time):
   - `SUPABASE_PROJECT_REF` = the project ref
   - `SUPABASE_ACCESS_TOKEN` = the access token
   - `SUPABASE_DB_PASSWORD` = the database password

#### C. Commit and push the workflow file

The workflow file `.github/workflows/supabase-migrations.yml` is already in this repo. The first push of it activates the workflow on GitHub.

```
git add .github/workflows/supabase-migrations.yml
git commit -m "Add migrations workflow"
git push
```

(Or push via GitHub Desktop.)

### How it works after setup

1. I/Claude add a new SQL file in `supabase/migrations/` and push to GitHub
2. GitHub detects the change → triggers the workflow
3. Workflow runs `supabase db push --include-all` against your project
4. New migrations run against your Supabase database
5. Vercel deploys the code in parallel

You can watch a run at: GitHub → your repo → **Actions** tab.

### Manually re-run a workflow

If something fails, go to **Actions → "Apply Supabase migrations" → latest run → Re-run all jobs**.

You can also run it on-demand for any commit: **Actions → "Apply Supabase migrations" → Run workflow**.

### When the action will NOT run

- Pushes that don't change anything in `supabase/migrations/` (the trigger is path-filtered)
- Pushes to non-main branches

If you need to apply migrations without changing migration files, use **Run workflow** manually.

---

## Option 2 — Local PowerShell script (`deploy.ps1`)

Manual one-command deploy. Useful if you want a single command to:

1. Push migrations to Supabase
2. Commit and push to GitHub

### One-time setup

#### A. Install required CLI tools

| Tool             | How to install                                                  |
|------------------|------------------------------------------------------------------|
| Git for Windows  | <https://git-scm.com/download/win> — installer, accept defaults |
| Supabase CLI     | `npm install -g supabase` (after Node.js is installed)          |
| Node.js          | <https://nodejs.org> if you don't have it                       |

After install, restart PowerShell.

Verify with: `git --version` and `supabase --version`.

#### B. Link the local repo to Supabase

In PowerShell, from project root:

```powershell
supabase login
# follows browser flow to authenticate
supabase link --project-ref <your-project-ref>
# enter database password when prompted
```

This creates `.supabase/config.toml` (gitignored) that remembers the link.

### Daily use

After I/Claude have made changes:

```powershell
cd C:\Users\runek\OneDrive\Dokumenter\GitHub\Songcraft
.\deploy.ps1
```

The script will:

1. Show you which files have changed
2. List the migration files
3. Ask **Proceed with deploy? (y/N)**
4. If `y`: run `supabase db push`, then commit + push to GitHub
5. If `N`: cancel cleanly

If `git` or `supabase` aren't installed, the script just skips that step and tells you.

---

## Recommended workflow

Pick **one** path and stick with it:

- **No terminal, GitHub Desktop only** → Option 1 (auto-deploy via GitHub Action). Set up GitHub Secrets once. From then on: just push via GitHub Desktop, the action handles Supabase, Vercel handles code. Zero terminal work.
- **Comfortable with terminal** → Option 2 (`deploy.ps1`). One command to deploy everything. Works without GitHub Action.
- **Both** — GitHub Action runs whenever GitHub Desktop pushes; the script available when you want explicit control. They don't conflict.

---

## Troubleshooting

### GitHub Action fails with "Project not found"

Wrong `SUPABASE_PROJECT_REF`. Double-check it in Supabase Dashboard → Settings → General → "Reference ID".

### GitHub Action fails with "permission denied"

Wrong `SUPABASE_ACCESS_TOKEN` or token has been revoked. Generate a new one at <https://supabase.com/dashboard/account/tokens> and update the secret in GitHub.

### "supabase db push" hangs

Database password mismatch. Reset password in Supabase Dashboard → Settings → Database → Reset, then update `SUPABASE_DB_PASSWORD` in GitHub Secrets.

### Action runs but says "no migrations found"

Confirm migration files are committed AND in `supabase/migrations/` (case-sensitive, including the `s`).

### `deploy.ps1` says "supabase command not found" after install

Restart PowerShell. If still missing, npm's global bin folder isn't in your PATH. Run `npm config get prefix` and add the `bin` subfolder to PATH.
