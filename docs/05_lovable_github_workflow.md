# 05: Lovable ↔ GitHub ↔ Claude Code workflow (no conflicts)

## Key facts (Lovable docs)
- **Lovable can't import an existing GitHub repo.** Connecting a project always makes Lovable **create a new repo**. So start in Lovable, not in the terminal.
- Sync is **two-way on one branch** (normally `main`). Commits you push to `main` appear in Lovable; Lovable's edits are pushed to `main`.
- When both sides have commits the other lacks, Lovable pushes its version to a branch called **`lovable-sync`**, and the next sync from GitHub replaces Lovable's copy.
- **Never force-push, rebase or squash commits already on main.** Undo with a revert commit.
- **The stack is fixed by Lovable:** new projects use TanStack Start (React + TS + Tailwind + shadcn on Vite); older ones use React + Vite. **Never** turn it into Next.js.
- After you push, tell Lovable which files changed so its next edit builds on your work.

## Step by step

### A. Create the project in Lovable (2 minutes)
1. New project. Prompt (keep it tiny, so Lovable only creates the scaffold):
```
Create a minimal project called "CareMap 照護地圖": a single landing page with the heading "CareMap 照護地圖" and nothing else. Keep the default stack and folder structure. Don't add a backend or authentication.
```
2. Wait until it finishes, then **Connect GitHub**: project settings (or the GitHub/Git icon) → Connect → pick your account → Lovable creates the repo.
3. Check that the sync card says the branches are **in sync**.
4. **From now on, don't prompt Lovable until step D.**

### B. Clone and add our context (3 minutes)
```bash
cd ~/Desktop            # or wherever you keep code
git clone https://github.com/<you>/<caremap-repo>.git caremap
cd caremap

# copy our context and data into the repo
cp ~/Downloads/CareMap/CLAUDE.md .
cp -R ~/Downloads/CareMap/docs ./docs
mkdir -p data scripts public/data
cp -R ~/Downloads/CareMap/data/* ./data/
cp -R ~/Downloads/CareMap/scripts/* ./scripts/
cp ./data/providers-taipei.json ./data/providers-new-taipei.json ./data/districts.json ./data/ltc_rules.json ./data/demo-cases.json ./public/data/

# optional: download New Taipei community centers + refresh MOHW data (needs internet)
bash scripts/fetch_data.sh && cp ./data/community-new-taipei.json ./public/data/

# check the scaffold works BEFORE changing anything
cat package.json      # note: framework (look for @tanstack/react-start or react-router-dom) + package manager
npm install           # or: bun install / pnpm install, matching the lockfile
npm run dev           # open the local URL, confirm it renders, then stop it (Ctrl+C)

git add CLAUDE.md docs data scripts public/data
git commit -m "Add CareMap context, docs and open data"
git push origin main
```
Note: `data/providers_national.csv` is 6 MB. If you don't want it in the repo, delete it before committing.

### C. Build with Claude Code
```bash
claude
```
Paste the prompts from `docs/06_claude_code_task_prompts.md` **in order**. After each one:
- Claude runs the build and tests and reports.
- You check the app locally (`npm run dev`) at phone width.
- **Commit + push** (small commits): `git add -A && git commit -m "<step>" && git push origin main`

**Rules while building:**
- Don't edit in Lovable while Claude Code is pushing.
- Never `git push --force`. Never `git rebase` main.
- If `git push` is rejected (someone pushed meanwhile): `git pull --no-rebase origin main`, resolve, build, push.
- Before each push: `npm run build` must pass, because Lovable's preview fails on type errors.

### D. Back to Lovable
1. Open the project and wait for the sync card to say **in sync**. The preview should show the app.
2. If the preview errors, paste the error into Lovable with "Fix only this build error, change nothing else."
3. Run the prompts in `docs/07_lovable_prompts_after_sync.md` (tell Lovable what changed → AI layer → polish → publish).
4. **Once you start editing in Lovable, stop pushing from the terminal.** If you must push again, first `git pull --no-rebase origin main` to get Lovable's commits.

### E. If something goes wrong
- **Lovable shows a `lovable-sync` branch:** your push and Lovable's edit diverged. In the terminal: `git fetch && git merge origin/lovable-sync` (a merge, not a rebase), fix conflicts, build, push to main.
- **Preview blank / framework error:** check that Claude didn't add Next.js or change `vite.config`. `git log` → `git revert <bad commit>` → push.
- **Ran out of time:** publish the last working version from Lovable History.
