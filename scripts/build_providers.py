"""Clean MOHW 長照ABC據點 (abc.csv) into Lovable-ready files.

Usage: python3 -I build_providers.py <abc.csv> <out_dir>
"""
import csv, json, re, sys, collections, os

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

COUNTY = {
    "63000": "臺北市", "64000": "高雄市", "65000": "新北市", "66000": "臺中市",
    "67000": "臺南市", "68000": "桃園市", "10002": "宜蘭縣", "10004": "新竹縣",
    "10005": "苗栗縣", "10007": "彰化縣", "10008": "南投縣", "10009": "雲林縣",
    "10010": "嘉義縣", "10013": "屏東縣", "10014": "臺東縣", "10015": "花蓮縣",
    "10016": "澎湖縣", "10017": "基隆市", "10018": "新竹市", "10020": "嘉義市",
    "09007": "連江縣", "09020": "金門縣",
}
COUNTY_EN = {
    "臺北市": "Taipei City", "高雄市": "Kaohsiung City", "新北市": "New Taipei City",
    "臺中市": "Taichung City", "臺南市": "Tainan City", "桃園市": "Taoyuan City",
    "宜蘭縣": "Yilan County", "新竹縣": "Hsinchu County", "苗栗縣": "Miaoli County",
    "彰化縣": "Changhua County", "南投縣": "Nantou County", "雲林縣": "Yunlin County",
    "嘉義縣": "Chiayi County", "屏東縣": "Pingtung County", "臺東縣": "Taitung County",
    "花蓮縣": "Hualien County", "澎湖縣": "Penghu County", "基隆市": "Keelung City",
    "新竹市": "Hsinchu City", "嘉義市": "Chiayi City", "連江縣": "Lienchiang County",
    "金門縣": "Kinmen County",
}

# Service string -> (category, English label)
def classify(s):
    rules = [
        (r"輔具|無障礙", "devices_home", "Assistive devices & home modification"),
        (r"喘息", "respite", "Respite care"),
        (r"交通", "transport", "Transportation"),
        (r"個案管理", "case_management", "Case management (A center)"),
        (r"巷弄", "community_station", "Neighborhood care station (C)"),
        (r"日間照顧", "day_care", "Day care center"),
        (r"家庭托顧", "day_care", "Family-based day care"),
        (r"小規模多機能", "day_care", "Small multi-function center"),
        (r"居家服務", "home_care", "Home care (in-home aide)"),
        (r"專業", "professional", "Professional services (rehab/nursing)"),
        (r"家庭醫師", "home_doctor", "Home-visit family doctor"),
        (r"沐浴", "home_care", "Mobile bathing"),
        (r"營養|餐飲", "meals", "Meal services"),
    ]
    for pat, cat, en in rules:
        if re.search(pat, s):
            return cat, en
    return "other", s

def num(x):
    try:
        return float(x)
    except Exception:
        return None

with open(src, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

# district code -> name (mode of names parsed from addresses)
dist_votes = collections.defaultdict(collections.Counter)
for r in rows:
    city = COUNTY.get(r["縣市"], "")
    a = r["地址全址"].replace("台", "臺")
    if city and a.startswith(city):
        m = re.match(r"(.{1,4}?[區鄉鎮市])", a[len(city):])
        if m:
            dist_votes[r["區"]][m.group(1)] += 1
DIST = {k: v.most_common(1)[0][0] for k, v in dist_votes.items()}

orgs = {}
for r in rows:
    oid = r["機構代碼"].strip()
    if not oid:
        continue
    city = COUNTY.get(r["縣市"], "")
    svc = r["特約服務項目"].strip()
    o = orgs.get(oid)
    if o is None:
        lat, lng = num(r["緯度"]), num(r["經度"])
        if lat is not None and not (21 < lat < 27):
            lat = None
        if lng is not None and not (118 < lng < 123):
            lng = None
        o = orgs[oid] = {
            "id": oid,
            "name": r["機構名稱"].strip(),
            "tier": (r["O_ABC"].strip() or "B"),
            "city": city,
            "city_en": COUNTY_EN.get(city, ""),
            "district": DIST.get(r["區"], ""),
            "address": r["地址全址"].strip(),
            "lat": round(lat, 6) if lat else None,
            "lng": round(lng, 6) if lng else None,
            "phone": r["機構電話"].strip(),
            "email": r["電子郵件"].strip(),
            "services": [],
            "services_en": [],
            "categories": [],
            "serves_districts": set(),
            "beds": 0,
            "residents": 0,
            "contract_end": r["特約迄日"].strip(),
            "last_updated": r["最後異動時間"].strip(),
        }
    t = r["O_ABC"].strip()
    if t == "A" or (t == "C" and o["tier"] != "A"):
        o["tier"] = t
    if svc and svc not in o["services"]:
        cat, en = classify(svc)
        o["services"].append(svc)
        if en not in o["services_en"]:
            o["services_en"].append(en)
        if cat not in o["categories"]:
            o["categories"].append(cat)
    for code in r["特約區域"].split(";"):
        if code.strip() in DIST:
            o["serves_districts"].add(DIST[code.strip()])
    o["beds"] = max(o["beds"], int(num(r["開放床數"]) or 0))
    o["residents"] = max(o["residents"], int(num(r["現有住民"]) or 0))
    if r["最後異動時間"].strip() > o["last_updated"]:
        o["last_updated"] = r["最後異動時間"].strip()

for o in orgs.values():
    o["serves_districts"] = sorted(o["serves_districts"])
    if o["tier"] == "C" and "community_station" not in o["categories"]:
        o["categories"].append("community_station")
    if o["tier"] == "A" and "case_management" not in o["categories"]:
        o["categories"].append("case_management")
    o["is_residential"] = o["beds"] > 0
    o["open_beds"] = max(o["beds"] - o["residents"], 0) if o["beds"] else 0

allorgs = sorted(orgs.values(), key=lambda o: (o["city"], o["district"], o["tier"], o["name"]))

FIELDS = ["id", "name", "tier", "city", "city_en", "district", "address", "lat", "lng",
          "phone", "email", "categories", "services", "services_en", "serves_districts",
          "is_residential", "beds", "residents", "open_beds", "contract_end", "last_updated"]

def write_csv(path, items):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for o in items:
            row = dict(o)
            for k in ("categories", "services", "services_en", "serves_districts"):
                row[k] = "|".join(o[k])
            w.writerow({k: row[k] for k in FIELDS})

def write_json(path, items):
    with open(path, "w", encoding="utf-8") as f:
        json.dump([{k: o[k] for k in FIELDS} for o in items], f, ensure_ascii=False, separators=(",", ":"))

tp = [o for o in allorgs if o["city"] in ("臺北市", "新北市")]
write_csv(f"{out}/providers_national.csv", allorgs)
write_csv(f"{out}/providers_taipei_newtaipei.csv", tp)
write_json(f"{out}/providers_taipei_newtaipei.json", tp)

# Districts lookup with counts
dist_rows = collections.Counter((o["city"], o["district"]) for o in allorgs if o["district"])
with open(f"{out}/districts.csv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["city", "city_en", "district", "provider_count"])
    for (c, d), n in sorted(dist_rows.items()):
        w.writerow([c, COUNTY_EN.get(c, ""), d, n])

stats = {
    "source_rows": len(rows),
    "orgs_national": len(allorgs),
    "orgs_taipei_newtaipei": len(tp),
    "with_coords_national": sum(1 for o in allorgs if o["lat"]),
    "by_tier_national": collections.Counter(o["tier"] for o in allorgs),
    "by_category_tp": collections.Counter(c for o in tp for c in o["categories"]),
    "residential_tp": sum(1 for o in tp if o["is_residential"]),
    "latest_update": max(o["last_updated"] for o in allorgs),
    "districts": len(dist_rows),
}
print(json.dumps(stats, ensure_ascii=False, indent=1, default=dict))
