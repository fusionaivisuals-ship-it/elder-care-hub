# 03: Data dictionary

License for all government data: **Open Government Data License, version 1 (政府資料開放授權條款第1版)**. Free use, including commercial use, with attribution. The app shows the source in the footer and under the map.

## providers-taipei.json / providers-new-taipei.json (app-ready)
- **Source:** Ministry of Health and Welfare 長照ABC據點, data.gov.tw/dataset/88270.
- **File:** https://ltcpap.mohw.gov.tw/publish/abc.csv (updated daily; latest change 2026-10-16 16:04).
- **Processing (scripts/build_providers.py):** 26,240 raw rows → merged per provider code (機構代碼) → 11,722 providers nationwide. Area codes decoded into city/district names. ~15 service names grouped into 10 categories (ZH + EN). Tier = A if any row is A, else C if any C, else B.

| field | meaning |
|---|---|
| id | MOHW provider code |
| name | provider name (ZH) |
| tier | A case-management center · B service provider · C neighborhood care station |
| city, district | location (臺北市/新北市 + 區) |
| address, phone | as published |
| lat, lng | WGS84 (98% present) |
| categories | case_management, home_care, day_care, professional, respite, transport, devices_home, community_station, home_doctor, meals |
| services / services_en | original contracted service names / English labels |
| serves_districts | districts the provider is contracted to serve |
| is_residential, beds, residents, open_beds | residential homes: open beds = beds − residents |
| ownership | public / nonprofit / company / clinic_pharmacy / private_facility / other (derived from the name) |
| contract_end, last_updated | contract end date (YYYYMMDD), last change |

**Counts (Taipei + New Taipei):**
- total 2,666;
- by tier: A 149 · B 2,462 · C 55;
- by service: devices 1,220 · respite 942 · home care 509 · day care 248 · professional 199 · home doctor 119 · transport 114;
- residential 197 (13,302 beds, 2,081 open);
- by ownership: company 1,202 · clinics/pharmacies 660 · private facilities 290 · nonprofit 287 · public 112 · other 115.

**Wanhua:** 922 providers serve the district, including 5 A-centers.

## districts.json
41 districts: city, city_key, district, centroid lat/lng (average of provider coordinates), providers_located, providers_serving, transport_zone.

## ltc_rules.json
The official rules (2026). Sections:
- `_sources`, `_wording_rules`, `eligibility`, `application_process`, `discharge_planning`, `online_application`;
- `monthly_care_cap_ntd`, `quota_rules`, `professional_services`, `transport`, `devices_home_modification` (incl. `prior_use_rules`), `respite` (incl. `prices_ntd`), `copay`, `foreign_caregiver_household`, `residential`;
- `tax_deduction`, `hotlines` (with a `verified` flag), `unverified_or_varies`.

## community-new-taipei.json (created by scripts/fetch_data.sh)
- **Source:** New Taipei City Social Welfare Department, 社區照顧關懷據點 (data.ntpc.gov.tw dataset abfde51a-e8c1-4b2b-bd8f-eeb548a793b7).
- **Size:** 648 rows: name, city, district, address (no coordinates).
- **Live API:** https://data.ntpc.gov.tw/api/datasets/abfde51a-e8c1-4b2b-bd8f-eeb548a793b7/json?page=0&size=1000

## taipei_district_aging.csv
65+ share by Taipei district, end of 2025 (Taipei Department of Civil Affairs via Storm Media). Wanhua is highest at 26.43%.

## providers_national.csv
All 11,722 providers across 22 cities and counties, for scaling beyond Taipei.

## Other official datasets (not used yet; for the roadmap)
- NHI home medical care integrated plan clinics (居家醫療整合計畫參與院所), data.gov.tw 39331, updated daily.
- National elderly welfare institution list (data.gov.tw 8572, historical 2021).
- Taipei elderly welfare institutions (data.taipei, 92 homes with bed types) and Taipei nursing homes (18); New Taipei nursing homes (75).
- Taipei Rehabus (復康巴士) operators.
