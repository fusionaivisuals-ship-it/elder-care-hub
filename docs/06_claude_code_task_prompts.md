# 06: Claude Code task prompts (paste in order)

Each prompt assumes Claude has read `CLAUDE.md`. Commit and push after each step that works.

---
### Task 0: orient (no code changes)
```
Read CLAUDE.md and every file in docs/ (ignore docs/archive). Then inspect this repo: package.json, lockfile, framework (TanStack Start or Vite + react-router), routes folder, src/components/ui, tailwind config, test setup. Don't change anything yet.
Reply with: the detected stack and package manager, where routes live and how to add one, which shadcn components exist, whether Vitest exists, how you'll load public/data/*.json SSR-safely, and your build plan for Tasks 1–7. Confirm you will not scaffold anything or touch config files.
```

### Task 1: foundation, design tokens, i18n, landing
```
Task 1 (P0). Following CLAUDE.md sections 0 and 4:
- Add the CareMap color tokens and Noto Sans TC font through the existing Tailwind/theme setup (extend only).
- Create src/lib/i18n.ts (zh default, en) + a LanguageProvider and a 中文/EN toggle in a top bar with the "CareMap 照護地圖" wordmark.
- Shared components (reuse shadcn): Section, StatCard, TierBadge, Footer (exact disclaimer text).
- Landing page at the existing index route, per docs/01 screen 1. "See a demo" can link to /plan?demo=1 for now.
- Add placeholder routes /start, /plan, /map in the existing routing style.
Run the build. Report: Status · Changed · Verified · Risks · Next.
```

### Task 2: data layer
```
Task 2 (P0). Build src/lib/data.ts:
- Types for Provider, District, CommunityPoint, Rules (match docs/03 and public/data/ltc_rules.json).
- loadRules(), loadDistricts(), loadProviders(cityKey) and loadCommunity(), fetching /data/*.json with in-memory caching; SSR-safe (only fetch on the client or via the framework's loader pattern already used in the repo).
- getDistricts(city), districtCentroid(city, district), getProvidersFor(answers) per docs/02 §9, nearestTierA(city, district) using haversine.
- Unit tests: Wanhua nearest tier A = 慈濟居家長照機構 (02-23023479); Wanhua providers serving ≥ 900; Taipei districts = 12.
Run tests + build. Report.
```

### Task 3: wizard
```
Task 3 (P0). Build /start exactly per docs/01 screen 2 (7 steps, conditional steps 3→4 and 6 sub-questions). PlanContext (React context) holds answers; no storage. Components: progress bar, Back, selectable chips (shadcn ToggleGroup/Button), month picker for plan approval, NT$ number inputs. Validation: Next disabled until required answers are given. ZH + EN labels via i18n. Final button → /plan. Check 375px. Build. Report.
```

### Task 4: plan engine (the core)
```
Task 4 (P0). Implement src/lib/planEngine.ts exactly per docs/02 (pure functions, no AI), with every unit test listed there plus the demo case from docs/01. Then render /plan per docs/01 screen 3, in this order: eligibility banner (exact _wording_rules text) → alerts row → pinned "Call this first" with the call script directly under it (template-built, copy button, tel: links) → hero line → benefit cards (government pays / you pay / notes / source link) → level selector when not assessed (nothing pre-selected) → How to apply + documents + tax deduction → "after the call: providers near you" summary at the bottom. Support /plan?demo=1 and /plan?demo=2 loading data/demo-cases.json (copied to public/data).
Run tests (all must pass) + build. Show me both demo cases' numbers in your report.
```

### Task 5: providers map and tabs (after the call)
```
Task 5 (P1). Build /map and a providers summary on /plan per docs/01 screen 4:
- Tabs: 政府補助服務 Subsidized | 社區據點 Community | 自費選項 Self-pay. Community first when not eligible / level 1 / not assessed.
- Subsidized: react-leaflet + OpenStreetMap tiles, rendered client-only (dynamic import / mounted check — no window access during SSR), markers colored by tier, popup with name/services/phone; list with tier badge + plain label, ownership tag, address, services (ZH/EN), open beds for residential, tel: button; category filter chips with counts; empty state → widen to city.
- Community: community-new-taipei.json for the district (if present) + tier C + 家庭托顧 providers; "免評估 No assessment needed"; address links to a Google Maps search. Taipei note: "call 1999 or the district office for community care centers".
- Self-pay: text cards (extra hours above the cap from the same providers; licensed residential homes with beds and open beds). No invented listings.
- Caption: "資料來源：衛福部長照ABC據點，更新 2026-10-16".
Install leaflet + react-leaflet with the repo's package manager. Build. Check 375px. Report.
```

### Task 6: two demo cases + printable plan
```
Task 6 (P1). (a) Landing: two demo cards from docs/01 ("示範一：媽媽中風住院" / "示範二：爸爸已在長照，額度快過期"). Each prefills PlanContext with that case's answers and opens /plan. On /plan in demo mode show a small switcher to jump between case 1 and case 2. (b) Alerts row on /plan per docs/02 (carry-over reset, unused respite, apply before discharge). (c) "列印/儲存計畫 Print / save plan" button with clean print CSS (plan, numbers, call-first, 1966 script, sources). Leave `// LOVABLE_AI_HOOK: explain-plan` where the AI summary card will go. Build. Verify both demo cases show exactly the docs/01 numbers. Report.
```

### Task 7: polish + pre-push gate
```
Task 7 (P1). No new features. Polish all pages to CLAUDE.md §4: consistent spacing and type, one primary action per screen, no horizontal scroll at 375px, focus states, AA contrast, intentional loading/empty/error states, no placeholder text, no dead links, page titles + meta description + favicon (teal map pin SVG). Then run: tests, production build, and a manual golden-path check (describe it). Confirm: no Next.js, no config files changed, no secrets, no new backend. Report a PASS/FAIL list.
```
Then: `git add -A && git commit -m "CareMap P0+P1 complete" && git push origin main` → go to docs/07.
