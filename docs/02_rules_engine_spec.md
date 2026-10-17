# 02: Rules engine spec (`src/lib/planEngine.ts`)

Pure TypeScript functions. Input = wizard answers, rules = `ltc_rules.json`. **No AI, no guessing.** Round NT$ to whole numbers (Math.round).

## Types (suggested)
```ts
type AgeBand = 'u50' | '50_54' | '55_64' | '65plus';
type LtcStatus = 'never' | 'waiting' | 'assessed' | 'in_hospital';
type Living = 'home_family' | 'home_none' | 'residential'; // foreign/live-in caregivers are out of scope
type Household = 'type1' | 'type2' | 'type3' | 'unknown'; // unknown → type3 + tip
interface Answers {
  city: '臺北市' | '新北市'; district: string;
  age: AgeBand; indigenous: boolean; disabilityCert: boolean; disabilityLevel?: 'mild'|'moderate'|'severe'|'profound';
  dementia: boolean; pac: boolean;
  status: LtcStatus; level?: 1|2|3|4|5|6|7|8; planApprovedMonth?: string; // 'YYYY-MM'
  devicesUsed?: number; deviceApprovedMonth?: string; /* 'YYYY-MM' */ respiteUsed?: number; disabilityDevice?: boolean;
  needs: string[]; living: Living;
  residentBefore2023?: boolean; otherResidentialSubsidies?: string[];
  household: Household;
}
```

## 1. Eligibility
- `identityOk` = age 65plus || (indigenous && age ≥ 55) || dementia || disabilityCert || pac.
- Banner text:
  - `identityOk` → `_wording_rules.say_instead_meets_conditions`;
  - otherwise → `say_instead_not_meeting`, and the Community tab comes first.
- If status = assessed:
  - level ≥ 2 → "已評估為第{level}級 Assessed at level {level}";
  - level 1 → no benefits; community stations first.
- If not assessed → show `amounts_without_level` + the level selector (no default).

## 2. Copay
`rate(category) = rules.copay.rates[category][household==='unknown' ? 'type3' : household]`
Transport category = `transport_${zone}`; zone from districts.json (Taipei zone1; New Taipei zone2; 烏來區 zone4).
- **Income bands (wizard step 7, added 2026-10-17):** the wizard asks for average household income per person per month in the official 2026 bands from `ltc_rules.income_bands_2026` (Taipei: ≤20,744 / 20,745–29,635 / 29,636–39,960 / ≥39,961; New Taipei: ≤17,750 / 17,751–26,625 / 26,626–39,960 / ≥39,961). `householdFromIncome(band, age)` maps them to type1 / type1 / type2 (65+ only, else type3) / type3; "not sure" → unknown → type3 + tip. The plan says this is an estimate that applies only after the district office approves the status. Demo cases still set `household` directly.

## 3. Care & professional services (monthly)
- `cap = monthly_care_cap_ntd[level]`
- `youPay = round(cap * rate('care_professional'))`; `govPays = cap - youPay`.
- Always show `quota_rules.carryover` and `no_transfer` notes.
- **Carry-over period end** (if planApprovedMonth): periods are 6 months starting at the approval month (approval 2026-05 → 2026-05..2026-10, then 2026-11..2027-04, …). `currentPeriodEnd` = last day of the period containing today; `daysLeft` = days until then. If daysLeft ≤ 31 → alert "額度將於 {date} 歸零 Unused care money resets on {date} ({daysLeft} days) — 請和個管員確認是否還有未使用額度 Ask your case manager what's unused".
- If living = residential → **don't show** (home/community benefits don't apply).

## 4. Transport (monthly, medical trips)
- `cap = transport.monthly_cap_ntd[zone]`; `youPay = round(cap * rate('transport_'+zone))`.
- Highlight if needs include `appointments`. Hidden for residential.

## 5. Devices & home modification (3-year period)
- If deviceApprovedMonth ≤ 2026-06 → group 1 only: `cap = 40000`, period ends at deviceApprovedMonth + 3 years; show "第二組 Group 2 (NT$60,000) 可於 {deviceApprovedMonth + 3 years} 起申請". If no devices used yet → new period: show the Group 1 vs Group 2 choice.
- Else → show the Group 1 vs Group 2 comparison (group 2 home-mod max 20,000; smart devices rental only).
- `remaining = max(cap - devicesUsed, 0)`; `youPayRate = rate('devices_home')` ("you pay 30% of what you use").
- If disabilityDevice → show `min_service_life` + `disability_overlap`.
- Highlight if needs include walking/falls, bathing, out_of_bed, toileting, home_unsafe.

## 6. Respite (yearly)
- Only if living = home_family. If respiteUsed is 0 or empty and the parent is assessed → alert "喘息額度尚未使用 Respite not used yet this year".
- `cap = level <= 6 ? 32340 : 48510`; `remaining = max(cap - respiteUsed, 0)`; `youPay = round(remaining * rate('respite'))`.
- "How far it goes" (on remaining): days_residential = floor(remaining / 2310); days_daycare = floor(remaining / 1250); home_visits_2h = floor(remaining / 770).
- If living = home_none → don't show respite; show "需要有家庭照顧者才可使用喘息".

## 7. Residential subsidy
- Show when living = residential OR level ≥ 4 (as an option).
- Eligible if level ≥ 4 OR disabilityLevel in [moderate, severe, profound] → up to NT$15,000/month.
- Else if residentBefore2023 → NT$5,000/month.
- Else → not eligible.
- If otherResidentialSubsidies is not empty → warning "同月不可重複領取 Cannot combine in the same month" + `no_double` text.
- Always show `month_counting` + `how_to_apply`.

## 8. Next steps / call first
- in_hospital → discharge_planning card first + "Call this first: 病房護理站 Ward nurse — ask for 出院準備服務".
- never/waiting → city center phone + online link (`online_application[city]`) + 1966.
- assessed → nearest tier-A provider in the district by haversine distance to the district centroid (tie → first). Fallback: nearest A in the city.

## 9. Provider filtering (`getProvidersFor`)
- Base set: `district === d || serves_districts.includes(d)`.
- Category needs:
  - case_management always;
  - respite if family caregiver;
  - devices_home if mobility/bathing/home unsafe;
  - transport if appointments;
  - home_care + day_care if not residential;
  - professional if walking/falls/out_of_bed/eating;
  - `is_residential` if level ≥ 4 or living = residential.
- Sort: providers located in the district first, then by distance.

## Unit tests (must pass)
1. level 4, type3, home_family → care cap 18580, you pay 2973.
2. level 4, type1 (mid-low-income household) → you pay 0.
3. planApprovedMonth 2026-05, today 2026-10-17 → currentPeriodEnd 2026-10-31, daysLeft 14, alert shown.
4. devicesUsed 25000, deviceApprovedMonth 2025-02 → group 1, remaining 15000, group 2 from 2028-02.
5. level 3, respiteUsed 10000 → remaining 22340; residential days 9.
6. level 7 → respite cap 48510.
7. Taipei transport type3 → cap 1680, pay 504. New Taipei type2 → cap 1840, pay 166 (9%).
8. devices: approved before 2026-07-01, used 15000 → group 1 remaining 25000 + group 2 date shown.
9. age 60, no conditions → not meeting conditions; community first.
10. residential, level 3, moderate disability cert, receives public placement → eligible 15000 + cannot-combine warning.
11. level 1 assessed → no benefit cards.
12. Demo case 1 and demo case 2 (docs/01) → numbers exactly as listed (case 1 with level 6 selected: care pay 1404, transport pay 166, respite pay 1617).
