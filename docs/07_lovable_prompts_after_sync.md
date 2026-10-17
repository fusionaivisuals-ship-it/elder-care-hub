# 07: Lovable prompts after the GitHub sync

Run these in Lovable **after** the sync card says "in sync". Before Prompt L2, check that Lovable Cloud is enabled (Settings → Connectors → Lovable Cloud) so Lovable AI and edge functions work.

### L1: tell Lovable what changed (Plan mode, no code changes)
```
This project was built outside Lovable via GitHub sync. Read CLAUDE.md and docs/ (product spec, rules engine, data dictionary). Inspect the routes, src/lib/planEngine.ts, src/lib/data.ts and public/data/. Don't change anything.
Summarize the architecture and confirm the preview builds. Rules for all your edits: keep the existing stack and structure, never change config files, don't refactor working code, numbers come only from planEngine + ltc_rules.json, and change only what each prompt names.
```

### L2: AI plan explanation (Lovable AI)
```
Add the AI explanation at the `LOVABLE_AI_HOOK: explain-plan` spot, using Lovable AI through an edge function "explain-plan".
Input: the wizard answers + the planEngine result object (already computed, including alerts). Output JSON: {summary: 3 warm sentences to the adult child that lead with the most urgent alert, first_48_hours: 3–5 concrete actions, documents_to_prepare: [], questions_to_ask_case_manager: []}.
System prompt: "You explain Taiwan long-term care plans. Use ONLY the facts provided. Never change, invent or estimate numbers, dates or eligibility. Never say the parent will qualify; the official assessment decides. Reply in {language}."
Validate the JSON before rendering. Show it as a card at the top of /plan with a skeleton "正在整理你的照護計畫…". On error or after an 8s timeout, hide the card and show a small "重試 Retry"; the deterministic plan must always stay visible.
Don't change planEngine, the wizard or the map.
```

### L3: demo-proof the AI
```
For both demo cases (示範一 and 示範二), save the first successful explain-plan result per case in src/data/demo-cache.json and show it instantly in demo mode (fall back to the live call if missing). Nothing else changes.
```

### L4 (optional): caregiver burnout check
```
Add a card on /plan "你還好嗎？How are YOU doing?": 4 questions scored 0–3 (sleep, time for yourself, feeling overwhelmed, help from others). Score ≥ 6: warm message + remaining respite from planEngine (with "how far it goes") + 3 nearest respite/community providers with tel: links. Pure frontend. Don't touch other sections.
```

### L5: pre-demo gate (no new features)
```
Demo lock. Check the published URL signed-out and report PASS/FAIL: demo case 1 and demo case 2 from a clean state with the exact docs/01 numbers; AI card (and fallback when AI fails); alerts row; tel: links; map at 375px; print plan; no console errors; no horizontal scroll; no placeholder text or dead links; title/favicon/social preview present; no secrets in frontend. Fix only blocking FAIL items.
```

### Fix prompt
```
Bug on [route/component]. Steps: [ ]. Expected: [ ]. Actual: [ ]. Error: [paste]. Find the root cause and fix only that; don't change other files, data, design or config. Tell me what you verified.
```

**Publish:** Lovable → Publish → test the link on a phone → keep it open for the demo.
