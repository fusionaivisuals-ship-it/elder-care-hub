# CLAUDE.md: CareMap 照護地圖 (read fully before doing anything)

## 0. HARD RULES: Lovable compatibility (breaking these breaks the demo)
This repo was **created by Lovable** and is two-way synced with a Lovable project on branch `main`. Lovable's preview must keep running.

1. **Do NOT scaffold a new app.** No `create-next-app`, no `npm create vite`, no new framework. **Never use Next.js** (no `next` package, no `app/` router, no `pages/` Next conventions, no `"use client"`). Never use Remix, Astro, CRA or Expo.
2. **Detect the existing stack first and stay in it.** Read `package.json`, `vite.config.*`, `tsconfig*.json`, `src/` and the routes folder:
   - If you see `@tanstack/react-start` / `@tanstack/react-router` → this is a **TanStack Start** app (Lovable's stack for projects created after 2026-05-13). Add routes the way the existing route files do (file-based routes in the existing routes folder), keep SSR-safe code (no `window`/`localStorage`/Leaflet at module top level; use them only in effects or client-only components).
   - If you see a plain Vite + React app with `react-router-dom` → add routes in the existing router file.
   - Either way, it's **React + TypeScript + Tailwind + shadcn/ui** (components in `src/components/ui`). Reuse them.
3. **Never modify:** `vite.config.*`, `tsconfig*.json`, `postcss.config.*`, `tailwind.config.*` (except adding theme tokens), `index.html` structure, `components.json`, `.env`, `supabase/`, lockfiles (other than via the package manager), `package.json` scripts. Don't rename or move existing files Lovable created.
4. **Use the package manager matching the lockfile** (`bun.lockb`/`bun.lock` → bun; `package-lock.json` → npm; `pnpm-lock.yaml` → pnpm). Add as few dependencies as possible. Allowed: `leaflet` + `react-leaflet` (map), `papaparse` only if needed. Nothing else without a reason.
5. **No backend in Claude Code.** All data is static JSON served from `public/data/` and fetched client-side. Don't create Supabase tables, edge functions, or `.env` secrets; the AI layer is added later **in Lovable** with Lovable AI. Leave clear `// LOVABLE_AI_HOOK` placeholders where it plugs in.
6. **Git:** work in small commits on `main` (or a feature branch merged with a merge commit). **Never force-push, rebase or squash commits already pushed.** Run the build before every push. Push only when the app builds and runs.
7. **Before the final push**, run the production build (`npm run build` / `bun run build`) and fix all type errors. Lovable's preview fails on TypeScript errors.

## 1. Product
**CareMap** turns Taiwan's long-term care (LTC, 長照2.0/3.0) system into a 2-minute plan for an adult child whose parent just became dependent (fall, stroke, hospital discharge, dementia): what the parent can **apply** for, what it costs, what they've **already used**, and **who to call first**, built on live government open data.

Hackathon: Hack for Humanity Taipei (AI Collective × MLH), Track 2 "Tech for a Super-Aged Society". Judged on problem fit 10%, impact 25%, working prototype 25%, **use of real Taiwan open data 15%**, pitch 10%, plus audience vote 30%. Must be built with **Lovable** (we build in Claude Code, then finish in Lovable).

Out of scope: foreign/live-in caregiver features (ignore `foreign_caregiver_household` in the rules file), login, payments, LINE bot.

Full detail: `docs/01_product_spec.md` (flow and screens), `docs/02_rules_engine_spec.md` (logic and tests), `docs/03_data_dictionary.md` (data).

## 2. Data (real only: never mock, never invent numbers)
Copy `data/*.json` → `public/data/` and fetch at runtime:
- `providers-taipei.json` (1,014) and `providers-new-taipei.json` (1,652): government-contracted LTC providers from the MOHW 長照ABC據點 file (data.gov.tw dataset 88270, updated 2026-10-16). Tier A = case-management center, B = service provider, C = neighborhood station.
- `districts.json`: 41 districts with centroid lat/lng, provider counts and transport zone.
- `ltc_rules.json`: **the only source** of eligibility, caps, copays, prior-use rules, hotlines and official source links. Its `_wording_rules` give the exact sentences to use.
- `community-new-taipei.json`: 648 New Taipei community care centers (no coordinates). If it's missing, run `bash scripts/fetch_data.sh`.
- `demo-cases.json`: the two demo cases (answers + expected outputs) for demo mode and unit tests.
- `taipei_district_aging.csv`: share aged 65+ by Taipei district.

## 3. Non-negotiable product rules
- **Never say** "likely qualifies", "you will get", or guess a care level. Two gates: identity condition → "meets the conditions to APPLY"; official home assessment level 2–8 → benefits.
- Assessed → exact caps for that level. Not assessed → the official table for all levels with a selector; nothing pre-selected.
- All NT$ math is deterministic TypeScript in `src/lib/planEngine.ts` with unit tests (Vitest if the project has it; otherwise a small test script). AI never produces numbers.
- Every benefit card shows "政府補助 Government pays" vs "你自付 You pay" and a "來源 Source" link from `ltc_rules._sources`.
- Footer on every page: "非醫療或法律建議，實際資格以長照評估為準 · Not medical or legal advice. Final eligibility is decided by the government assessment (1966). Data: 衛福部長照ABC據點, updated 2026-10-16."
- Privacy: no login; answers stay in memory (React context). Nothing about the parent's health is stored or sent anywhere.

## 4. Design system
- Feel: calm, warm, trustworthy, human: "a kind nurse", not a government form, not an AI dashboard.
- Colors (Tailwind theme tokens): bg #FAF7F2, surface #FFFFFF, text #1F2A2E, muted #5B6B70, primary #0F5257 (deep teal), accent #E9A23B (amber), success #2E7D5B, warning #B7791F, error #B23A48. Tier A teal, B amber, C green.
- Font "Noto Sans TC" (Google Fonts); headings 600; body 18px mobile / 16px min; line-height 1.6.
- Mobile-first, content max-width 720px, 16px side padding, 8px spacing scale, rounded-2xl cards with soft shadow, one primary action per screen, tap targets ≥ 48px.
- lucide-react icons only. No emoji in the UI, no heavy gradients, no glassmorphism. 150ms fades.
- Copy is warm, short and direct. Traditional Chinese default, EN toggle (simple i18n dictionary in `src/lib/i18n.ts`).
- Accessible: semantic HTML, labels, visible focus, AA contrast.

## 5. Working style
Inspect before editing; reuse components; one feature per task; no drive-by refactors; cover loading/empty/error states; check 375px width; run the build and tests; then report **Status · Changed · Verified (only checks actually run) · Risks · Next**. Commit with clear messages. Follow the task order in `docs/06_claude_code_task_prompts.md`.
