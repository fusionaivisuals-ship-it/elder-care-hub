"""Build app-ready JSON from cleaned CSV + raw community data.

Usage: python3 -I scripts/build_app_data.py data
Outputs (in data/): providers-taipei.json, providers-new-taipei.json, districts.json,
community-new-taipei.json (if data/raw/ntpc_community_care.json exists)
"""
import csv, json, re, sys, os, collections

d = sys.argv[1]
rows = list(csv.DictReader(open(f"{d}/providers_taipei_newtaipei.csv", encoding="utf-8")))

def own(n):
    if re.search(r"市立|國立|縣立|市政府|衛生所|區公所|榮民|三軍|國軍", n): return "public"
    if re.search(r"財團法人|社團法人|協會|基金會|教會|合作社", n): return "nonprofit"
    if re.search(r"股份有限公司|有限公司|企業社|商行", n): return "company"
    if re.search(r"醫院|診所|藥局|醫療器材|治療所|護理所", n): return "clinic_pharmacy"
    if re.search(r"私立", n): return "private_facility"
    return "other"

L = lambda s: [x for x in s.split("|") if x]
out = collections.defaultdict(list)
for r in rows:
    out[r["city"]].append({
        "id": r["id"], "name": r["name"], "tier": r["tier"], "city": r["city"], "district": r["district"],
        "address": r["address"], "lat": float(r["lat"]) if r["lat"] else None, "lng": float(r["lng"]) if r["lng"] else None,
        "phone": r["phone"], "categories": L(r["categories"]), "services": L(r["services"]), "services_en": L(r["services_en"]),
        "serves_districts": L(r["serves_districts"]), "is_residential": r["is_residential"] == "True",
        "beds": int(r["beds"]), "residents": int(r["residents"]), "open_beds": int(r["open_beds"]),
        "ownership": own(r["name"]), "contract_end": r["contract_end"], "last_updated": r["last_updated"],
    })
key = {"臺北市": "taipei", "新北市": "new-taipei"}
for c, lst in out.items():
    json.dump(lst, open(f"{d}/providers-{key[c]}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

dist = []
groups = collections.defaultdict(list)
for c, lst in out.items():
    for o in lst:
        if o["lat"] and o["district"]:
            groups[(c, o["district"])].append(o)
for (c, name), lst in sorted(groups.items()):
    serving = sum(1 for o in out[c] if o["district"] == name or name in o["serves_districts"])
    dist.append({"city": c, "city_key": key[c], "district": name,
                 "lat": round(sum(o["lat"] for o in lst) / len(lst), 5), "lng": round(sum(o["lng"] for o in lst) / len(lst), 5),
                 "providers_located": len(lst), "providers_serving": serving,
                 "transport_zone": "zone1" if c == "臺北市" else ("zone4" if name == "烏來區" else "zone2")})
json.dump(dist, open(f"{d}/districts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

raw = f"{d}/raw/ntpc_community_care.json"
if os.path.exists(raw):
    items = json.load(open(raw, encoding="utf-8"))
    comm = [{"name": i.get("title", ""), "city": i.get("county", "新北市"), "district": i.get("town", ""), "address": i.get("address", ""),
             "type": "community_care_center", "source": "新北市政府社會局 社區照顧關懷據點"} for i in items]
    json.dump(comm, open(f"{d}/community-new-taipei.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("community points:", len(comm))
print("providers:", {k: len(v) for k, v in out.items()}, "districts:", len(dist))
