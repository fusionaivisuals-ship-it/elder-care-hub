# CareMap 照護地圖: start here

Hack for Humanity Taipei · Track 2 (Super-aged society / Long-term care) · built 2026-10-17

**CareMap turns Taiwan's long-term care system into a 2-minute plan: what your parent can apply for, what it costs you, what you've already used, and who to call first. It's built on live government open data and the official 2026 rules.**

## What's in this folder
| Path | What |
|---|---|
| `FIRST_PROMPT_FOR_CLAUDE_CODE.txt` | The first message to paste into Claude Code |
| `CLAUDE.md` | Full brief for Claude Code. **Copy it into the repo root**, and Claude reads it automatically |
| `docs/01_product_spec.md` | Users, flow, screens, features, priorities (P0/P1/P2) |
| `docs/02_rules_engine_spec.md` | Exact business logic + unit test cases |
| `docs/03_data_dictionary.md` | Every data file, its fields, sources and license |
| `docs/04_research_and_sources.md` | Verified facts with links, plus what is unverified |
| `docs/05_lovable_github_workflow.md` | **How to go Lovable → GitHub → Claude Code → Lovable without conflicts** |
| `docs/06_claude_code_task_prompts.md` | Step-by-step prompts to paste into Claude Code |
| `docs/07_lovable_prompts_after_sync.md` | Prompts to run in Lovable after the code is synced (AI layer, polish, publish) |
| `docs/08_pitch_and_demo.md` | Pitch script, demo path, deck outline, Q&A |
| `docs/09_settings_checklist.md` | GitHub, repo and Lovable settings to check before and after each push (no database needed) |
| `data/` | Cleaned, app-ready data (providers, districts, rules, two demo cases with expected outputs, aging) |
| `scripts/` | Scripts that re-download and rebuild the data from the official sources |

## The 10-step plan (read docs/05 for details)
1. **Lovable:** create a new project with the tiny bootstrap prompt in docs/05. Don't build features there.
2. **Lovable:** connect GitHub (Lovable creates the repo). *Lovable cannot import an existing repo, so it must create it.*
3. **Terminal:** `git clone <repo>` → `cd <repo>`.
4. **Terminal:** copy this folder's `CLAUDE.md`, `docs/`, `data/` and `scripts/` into the repo (commands in docs/05).
5. **Terminal:** `npm install` (or the package manager in the lockfile) → run the dev server to confirm the scaffold works.
6. **Terminal:** run `claude`, paste `FIRST_PROMPT_FOR_CLAUDE_CODE.txt`, then Tasks 1–7 from docs/06 one at a time. Commit and push after each working task.
7. **Terminal:** `git push origin main` (never force-push). Don't edit in Lovable while you're pushing.
8. **Lovable:** wait until the sync card says "in sync", then tell Lovable which files changed (prompt in docs/07).
9. **Lovable:** add the AI layer and polish with Lovable prompts (docs/07). This also makes the project "built with Lovable" for the prizes.
10. **Lovable:** publish, test the live link on a phone, and rehearse with docs/08.

**Time plan:**
| Time | Step |
|---|---|
| 14:35–14:50 | Steps 1–5 + settings checklist A–B (docs/09) |
| 14:50–15:45 | Claude Code Tasks 0–7, pushing after each working task (checklist C) |
| 15:45–16:10 | Lovable: checklist D, prompts L1–L4, publish (checklist E) |
| 16:10 | **Demo lock** (checklist F), deck, rehearsal |
| 16:30 | Submit |

**Order matters:** the GitHub repo must be created by Lovable (step 2). You can't push a repo first and then import it into Lovable.
