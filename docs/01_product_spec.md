# 01: Product spec

## Demo contract
- **User:** adult child (30–55) in Taipei or New Taipei whose parent just became dependent, or is already in the LTC system without using it fully.
- **Problem:** the LTC system has 4 benefit types, 7 levels, 3 copay groups, prior-use rules and 11,722 providers. Families don't know what they can apply for, what it costs, what they've already used, or who to call, so they lose weeks or let money expire. Taipei has the highest 65+ share (24.18%) but ranks only 20th in LTC coverage (58.1%).
- **Promise:** from panic to a plan in 2 minutes.
- **Golden path:** Landing → choose a demo case → /plan with alerts and exact NT$ amounts → "Call this first" → 1966 call script → (after the call) providers near you.
- **Wow moments:**
  - **Case 1:** "start before discharge, it takes 4 days instead of 51".
  - **Case 2:** "NT$X of unused care money resets on Oct 31, plus a full year of respite you haven't touched".
- **Out of scope:** foreign/live-in caregiver features, login, payments, admin, LINE bot (pitch it as the next step), agency listings.

## Priorities
- **P0:** data loading, wizard, plan engine + plan page, "Call this first", provider list + map.
- **P1:** community tab, self-pay tab, 1966 call script, two demo cases, printable plan, polish, ZH/EN toggle.
- **P2 (in Lovable):** AI plan explanation, burnout check.

## Routes / screens
1. **`/` Landing**
   - Headline: "爸媽需要照顧了？兩分鐘看懂長照" / EN "Your parent needs care? Understand long-term care in 2 minutes".
   - Subline: "全台 11,722 個政府長照單位，我們幫你找到最適合的".
   - Buttons: "開始 Start".
   - Demo cards (each one tap → /plan):
     - "示範一：媽媽中風住院 Mom's stroke, discharge next week";
     - "示範二：爸爸已在長照，但額度快過期 Dad is already in the system, money about to expire".
   - 3 stat cards: 20.7% of Taiwan is 65+ · 2,666 providers in Taipei & New Taipei · data updated 2026-10-16.
2. **`/start` Wizard** (one question per screen, progress bar, Back):
   1. City → district (from districts.json).
   2. Who is your parent: age band (<50 / 50–54 / 55–64 / 65+); toggles: indigenous, disability certificate (+ level mild/moderate/severe/profound), dementia diagnosis, NHI post-acute care program (PAC).
   3. Status with LTC: never applied / applied, waiting for assessment / already assessed (→ level 1–8 + care plan approval month) / still in hospital.
   4. Already used (only if assessed):
      - devices/home modification: amount used so far (NT$) + the month that device benefit was approved;
      - respite used this year (NT$);
      - any device from the disability device subsidy (yes/no).
   5. Needs (multi): bathing, eating/swallowing, walking/falls, getting out of bed, toileting, memory/confusion, medicine, getting to appointments, home is unsafe.
   6. Living situation: at home with family caring / at home, nobody caring yet / lives in a residential facility (→ moved in before 2023-01-01? + receives: disability residential subsidy / public placement / veterans' home public bed / none).
   7. Household status: 低收入戶或中低收入戶 / receives 中低收入老人生活津貼 or 身障生活補助 / general / not sure (= general + tip).
3. **`/plan` Plan** (updated 2026-10-17: split into two parts)
   - **Layout:** header, eligibility banner and alerts are always on top. Below them are two tabs, "① 打電話與準備 Call & prepare" and "② 補助試算 Benefit estimate", switched by `?part=2`. Both parts are always printed.
   - **Part 1, a numbered 3-step checklist:**
     1. 先打給這裡: who to call, with tap-to-call and the call script.
     2. 準備好這些: a document checklist, plus what to tell the assessor (the needs), or for assessed parents what to raise with the case manager (reset date, unused respite).
     3. 接下來會發生什麼: the official 4-step process with "你在這裡", based on status. Not eligible or level 1 shows the community card instead.
     - Then the hotlines and a "下一步：看看補助有多少" button.
   - **Part 2:**
     - copay rates for this household (care/respite, devices, transport) with the income-band estimate note;
     - the **level picker**: a 1–8 scale, mild → severe, showing each level's monthly care cap. Not assessed: nothing is pre-selected and a tapped level is labelled "example, not a prediction". Assessed: their level is pre-selected and badged "你的等級", and other levels are comparison only (the details stay on their level);
     - the **level guide** for the chosen level: what that level unlocks (care, respite, transport and devices the same at every level, residential subsidy at level 4+), plus "等級怎麼決定？" (official MOHW definition and reassessment rule) and a comparison table of all levels;
     - the separate benefit cards are gone: each row of the level guide has "細節與官方來源 Details & official sources" (rule notes + source links), and personal details for the plan's own level (reset date, respite left and how far it goes, device money left). Then the tax deduction.
   - **Part 3, "附近服務 Nearby services":** a map explorer with three tabs (subsidized / community / self-pay), each with a map, a list, Call, Google Maps and Apple Maps directions, and "show on map". New Taipei community care centers have no coordinates in the source, so they're listed (directions by address) but not mapped.
   - **Session memory:** language in localStorage; answers, wizard step, chosen level and map location in sessionStorage (survives refresh, cleared when the tab closes). The footer has "清除我的回答 Clear my answers".
   - **English names:** `scripts/translate_names.py` adds `name_en` / `address_en` (glossary + Hanyu Pinyin, official English names for big hospitals). Labelled as automatic, with the Chinese shown underneath.
   - **No mild/moderate/severe labels:** levels are never given these labels, because no official mapping exists.
   - **Original screen spec below.**
   - **Eligibility banner:** exact wording from the rules file.
   - **Pinned "先打給這裡 Call this first":**
     - in hospital → "ask the ward nurse for 出院準備服務" + the city LTC center;
     - not assessed → city LTC center phone + online form + 1966;
     - assessed → nearest tier-A center in the district.
   - **Call script, directly under Call this first** (template-built from the answers: who to ask, what to say, documents to have ready; copy button, tap-to-call). Case 2 script asks the case manager to use the remaining care money before the reset date and to book respite.
   - **Alerts row** (only when they apply):
     - "額度將於 {date} 歸零 Unused care money resets on {date} ({n} days)";
     - "喘息額度尚未使用 Respite not used yet this year";
     - "出院前就能申請 Apply before discharge".
   - **Hero line:** what the government pays per month vs what you pay (exact if assessed; otherwise via the level selector).
   - **Benefit cards** (each with government pays / you pay / rule notes / source link):
     - care & professional (+ carry-over period end);
     - transport;
     - devices & home modification (remaining + group 2 date);
     - respite (remaining + "how far it goes");
     - residential subsidy when relevant.
   - **How to apply:** 4 official steps + documents checklist + tax deduction NT$180,000 note.
   - **Print / save plan** (print CSS) for sharing with siblings.
   - **After the call: providers near you** (summary at the bottom; link to /map).
4. **`/map` Providers**
   - **Tabs:**
     - 政府補助服務 Subsidized (providers in or serving the district, filtered by needs; map + list; tier badges; open beds; tap-to-call; ownership tag);
     - 社區據點 Community (no assessment needed: community-new-taipei + tier C + 家庭托顧);
     - 自費選項 Self-pay (text cards: extra hours above the cap from the same providers; licensed residential homes with open beds).
   - Community tab comes first when the parent isn't eligible, is level 1, or isn't assessed.

## Demo case 1: "Mom's stroke, discharge next week" (new to the system)
**Answers:**
- **Location:** 新北市板橋區.
- **Parent:** age 65+ (81), no certificates.
- **LTC status:** still in hospital (stroke), never applied.
- **Needs:** walking/falls, getting out of bed, bathing, eating/swallowing, appointments.
- **Living:** at home with family caring (daughter).
- **Household:** receives 中低收入老人生活津貼 (type 2).

**Expected:**
- **Banner:** meets the conditions to apply; the level is decided by the assessment.
- **Call this first:** the ward nurse, asking for 出院準備服務 (the hospital assesses before discharge; average 4 days to services vs 51). Backup: New Taipei LTC center 02-2968-3331 + online form.
- **Level selector:** nothing pre-selected. If the user taps level 6, care is NT$28,070/month and she pays 5% = NT$1,404.
- **Transport:** zone2 NT$1,840, pays 9% = NT$166.
- **Respite:** NT$32,340/year, pays 5% = NT$1,617.
- **Devices:** group 1 or group 2 (new case, can choose), pays 10%.
- **Providers:** 1,076 serve 板橋區 (358 respite, 154 home care, 77 day care, 67 professional/rehab).
- **Nearest A-center:** 新北市私立常錦居家長照機構, 忠孝路52號3樓, 02-8952-0607. 亞東紀念醫院 (an A-center) is 0.5 km away.
- **Residential:** 25 homes with 124 open beds (海山護理之家 53 open).
- **Community:** 94 community care centers + 7 C stations in 板橋區.

## Demo case 2: "Dad is in the system, but money is about to expire" (prior use)
**Answers:**
- **Location:** 臺北市萬華區.
- **Parent:** age 65+ (79).
- **LTC status:** already assessed, level 5, care plan approved 2026-05.
- **Already used:** devices NT$25,000, approved 2025-02; respite NT$0.
- **Needs:** walking/falls, toileting, memory/confusion, appointments.
- **Living:** at home with family caring (son).
- **Household:** general (type 3).

**Expected:**
- **Banner:** assessed at level 5.
- **Care:** NT$24,100/month, pays 16% = NT$3,856. **Alert:** the current 6-month period (2026-05 → 2026-10) ends **2026-10-31**; unused amounts reset (14 days left on 2026-10-17).
- **Respite:** NT$32,340 unused, pays 16% = NT$5,174. It goes as far as **14 days** of residential respite, or 25 day-care days, or 42 two-hour home visits.
- **Devices:** group 1 (approved before 2026-07-01). NT$15,000 of NT$40,000 left until 2028-02; group 2 (NT$60,000) available from **2028-02**.
- **Transport:** zone1 NT$1,680, pays 30% = NT$504.
- **Residential subsidy:** shown as an option (level 4+), up to NT$15,000/month.
- **Tax deduction:** NT$180,000 note.
- **Call this first:** his A-center, 慈濟居家長照機構, 莒光路222號5樓, 02-2302-3479 (nearest to the district centroid).
- **Providers:** 922 serve 萬華區.
