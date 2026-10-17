# 09: Settings checklist (GitHub → repo → Lovable)

**No database setup is needed.** All data is static JSON in `public/data/`. The only backend piece is Lovable Cloud's AI gateway (edge functions), added in Lovable after the sync.

## A. Before connecting: Lovable project
- [ ] The project was created **in Lovable first** (Lovable can't import a repo). If a teammate already made one, use that project.
- [ ] Lovable Cloud: Settings → Connectors → Shared connectors → **Lovable Cloud** → enabled for the workspace. (It's needed later for Lovable AI; the bootstrap doesn't need it.)
- [ ] Settings → Connectors → Lovable Cloud → **Manage permissions**: allow "Deploy edge functions" (and "Read database / Change data" isn't needed since we don't use a database).
- [ ] Connect GitHub from the project: Lovable creates `github.com/<owner>/<repo>`. Note the repo URL.

## B. GitHub repo settings
- [ ] Default branch = `main` (don't rename).
- [ ] **No branch protection** that blocks direct pushes to `main`. Otherwise Lovable pushes to `lovable-sync` instead.
- [ ] The Lovable GitHub App has access to this repo (GitHub → Settings → Applications → Lovable → Repository access).
- [ ] Don't rename, transfer or delete the repo during the hackathon.
- [ ] Private repo is fine; add teammates as collaborators if they need to push.

## C. Code checks before EVERY push (run locally)
- [ ] `git status`: no `.env`, no `node_modules/`, no `dist/` or `.output/` (check that `.gitignore` covers them).
- [ ] **One lockfile only**, matching Lovable's package manager (don't add `package-lock.json` next to `bun.lockb`, or the reverse).
- [ ] Node version: if the repo has `.nvmrc` or `engines`, use it (`node -v`).
- [ ] `npm run build` (or `bun run build`) passes with **0 TypeScript errors**.
- [ ] Tests pass (`npx vitest run` or the repo's test script).
- [ ] No Next.js: `grep -R "\"next\"" package.json` returns nothing; no `app/` Next router, no `next.config.*`.
- [ ] Config untouched: `git diff origin/main -- vite.config.* tsconfig*.json components.json index.html package.json`. Only new dependencies (leaflet, react-leaflet, @types/leaflet) may appear in package.json.
- [ ] Data present: `ls public/data` → providers-taipei.json, providers-new-taipei.json, districts.json, ltc_rules.json, demo-cases.json (+ community-new-taipei.json).
- [ ] Data paths are relative (`/data/...`), with no `localhost` URLs.
- [ ] No secrets in code (`grep -RIn "sk-\|api_key\|SECRET" src` → nothing).
- [ ] Files < 50 MB (GitHub limit is 100 MB; our largest is 6 MB).
- [ ] Commit messages are clear; push with `git push origin main` (never `--force`).

## D. After the push: Lovable checks
- [ ] Wait for the sync card: **"in sync"**. The preview renders the landing page.
- [ ] Preview errors → paste the error: "Fix only this build error; change nothing else."
- [ ] **Project Knowledge** (Project settings → Knowledge), paste:
```
This project is CareMap 照護地圖. Read CLAUDE.md and docs/ before any change — they are the source of truth (product, rules engine, data, design). Keep the existing stack and file structure, never change config files, never use mock data, numbers only come from src/lib/planEngine.ts + public/data/ltc_rules.json. Change only what each prompt names. Reply with Status · Changed · Verified · Risks · Next.
```
- [ ] Run L1 (Plan mode) from docs/07 so Lovable reads the code before editing.
- [ ] After adding the AI edge function (L2): if it doesn't respond, ask Lovable "Deploy the edge function explain-plan." (Lovable doesn't auto-deploy functions synced from Git.)
- [ ] Secrets: **none needed**. Lovable AI uses the built-in gateway, so don't add API keys.
- [ ] Security: run Lovable's security scan if it's offered; confirm no keys in the frontend.

## E. Publish settings
- [ ] Publish → set the project/site name "CareMap 照護地圖" and check the URL.
- [ ] Title, meta description, favicon and social preview image are present.
- [ ] Open the published URL in an incognito window and on a phone, then run the golden path (demo case 1 → plan → call first → 1966 script; demo case 2 → reset alert → respite → call first).
- [ ] Keep the published tab open for the demo; have screenshots as a backup.

## F. Freeze rule
After 16:00 don't push from the terminal; fix only blockers in Lovable. If you must push: `git pull --no-rebase origin main` first.
