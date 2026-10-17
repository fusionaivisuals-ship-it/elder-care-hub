# 08: Pitch and demo (90 seconds + Q&A)

**One line:** CareMap turns Taiwan's long-term care system into a 2-minute plan: what your parent can apply for, what you'll pay, what's left, and who to call first, built on live government data.

## Script
**[0–20s] Problem**
"Since last December Taiwan has been a super-aged society: 20.7% of people are over 65. Taipei is the oldest city, at 24%, yet it ranks 20th for long-term care coverage, at only 58%. The help exists; families just can't navigate it: 11,000 providers, 7 care levels, 3 copay groups, and rules about money that expires."

**[20–50s] Demo case 1: "Mom's stroke, discharge next week"** (tap 示範一)
1. "Mei-Ling's mom, 81, had a stroke and is in hospital in Banqiao. They've never applied."
2. "First thing CareMap says: don't wait. Ask the ward nurse for discharge planning today. Hospitals that do it get families into care in 4 days instead of 51."
3. "She meets the conditions to apply. The assessment decides the level, so we show the official table. Because she gets the senior allowance, she pays only 5%: at level 6 that's NT$1,404 a month for NT$28,070 of care."
4. "1,076 providers serve Banqiao, 124 care-home beds are open right now, and 94 community centers need no assessment at all."

**[50–75s] Demo case 2: "Dad's money is about to expire"** (tap 示範二)
1. "This dad in Wanhua is already level 5. But his unused care money resets on October 31: 14 days from now."
2. "He hasn't used any respite this year. That's NT$32,340, about 14 days in a care home, so his son can rest."
3. "His device budget? NT$15,000 left, and the bigger NT$60,000 option only opens in 2028. Families learn these rules too late; CareMap shows them upfront, with the official source on every card."
4. "Call this first: his real case manager center, one tap."

**[75–90s] Proof and next steps**
"Built on Ministry of Health and Welfare data updated yesterday: 11,722 providers nationwide and the 2026 regulation, turned into a tested rules engine. AI explains, it never makes numbers. Next: a LINE bot, hospital discharge planners, and nationwide coverage, because by 2035 Taiwan will have 1.3 million people needing care."

## Deck (5 slides, submit at 16:30)
1. **Problem:** 20.7% aged 65+ · Taipei at 58% coverage (20th) · 1.3M needing care by 2035.
2. **CareMap:** the one-liner + two screenshots (case 1 discharge card, case 2 reset alert).
3. **Real data:**
   - MOHW 長照ABC據點: 26,240 rows → 11,722 providers (98% with coordinates).
   - The 2026 LTC regulation as machine-readable rules.
   - New Taipei community care centers.
4. **How we built it:**
   - Data pipeline (download → clean → decode → categorize).
   - Rules engine with unit tests.
   - Claude Code for the core plus Lovable (GitHub sync, Lovable Cloud AI for explanations).
   - AI never produces numbers.
5. **Impact and next steps:**
   - Families: weeks become 2 minutes, and no expired money.
   - The system: people arrive at 1966 prepared, and discharge planning gets used.
   - Next: LINE bot, discharge planners, nationwide.

## Q&A
- **"Is the money accurate?"** The caps, copays, carry-over and device rules come from the 2026 regulation and 1966.gov.tw; every card links to its source. If the parent isn't assessed yet, we show the official table and never guess a level.
- **"How do you know the money expires?"** The regulation says unused care money can be used within 6 months from the care plan approval month, then it resets. We calculate the date from the approval month the family enters.
- **"Is the AI making things up?"** No number comes from AI. It only explains what our tested engine calculated.
- **"Why not just call 1966?"** We get families to 1966 or the hospital prepared, with a script, documents and the right center, and we catch rules they'd only learn too late.
- **"What about private providers?"** 96% of the contracted providers are private companies, clinics and nonprofits; the government pays. We also show self-pay options and care homes with open beds.
- **"Privacy?"** No login; answers stay in the browser session and nothing about health is stored.
- **"Limitations?"**
  - It covers Taipei and New Taipei today (the national file is ready).
  - A few rules vary by city (we say "ask 1966").
  - Community center data is New Taipei only for now.

## Judging map
- Problem fit 10%: two real family moments.
- Impact 25%: Taipei's coverage gap; expiring benefits; 1.3M people by 2035.
- Prototype 25%: a working flow with exact numbers.
- Open data 15%: 3 official datasets + the regulation.
- Pitch 10%: the script above.
- Audience 30%: everyone has parents.
