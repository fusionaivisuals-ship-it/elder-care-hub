"""Add English names and addresses to the app data (name_en, address_en).

Usage: python3 scripts/translate_names.py data      (needs: pip install pypinyin==0.53.0)

Deterministic, so it can be re-run every time the MOHW data is refreshed:
- names: a glossary of care/organisation terms (護理之家 → Nursing Home, 股份有限公司 → Co., Ltd.)
  plus Hanyu Pinyin for proper names; "X附設Y" becomes "Y (run by X)".
- addresses: Taiwan's official English address order (Hanyu Pinyin, the romanization used on
  Taipei / New Taipei street signs), e.g. 臺北市萬華區莒光路222號5樓 → "5F, No. 222, Juguang Rd., Wanhua Dist., Taipei City".
These are automatic translations; the Chinese original stays the reference (the UI says so).
"""
import json, re, sys
from pypinyin import Style, lazy_pinyin

D = sys.argv[1]

DISTRICT_EN = {
    "中正區": "Zhongzheng", "大同區": "Datong", "中山區": "Zhongshan", "松山區": "Songshan", "大安區": "Da'an", "萬華區": "Wanhua",
    "信義區": "Xinyi", "士林區": "Shilin", "北投區": "Beitou", "內湖區": "Neihu", "南港區": "Nangang", "文山區": "Wenshan",
    "板橋區": "Banqiao", "三重區": "Sanchong", "中和區": "Zhonghe", "永和區": "Yonghe", "新莊區": "Xinzhuang", "新店區": "Xindian",
    "樹林區": "Shulin", "鶯歌區": "Yingge", "三峽區": "Sanxia", "淡水區": "Tamsui", "汐止區": "Xizhi", "瑞芳區": "Ruifang",
    "土城區": "Tucheng", "蘆洲區": "Luzhou", "五股區": "Wugu", "泰山區": "Taishan", "林口區": "Linkou", "深坑區": "Shenkeng",
    "石碇區": "Shiding", "坪林區": "Pinglin", "三芝區": "Sanzhi", "石門區": "Shimen", "八里區": "Bali", "平溪區": "Pingxi",
    "雙溪區": "Shuangxi", "貢寮區": "Gongliao", "金山區": "Jinshan", "萬里區": "Wanli", "烏來區": "Wulai",
}
CITY_EN = {"臺北市": "Taipei City", "台北市": "Taipei City", "新北市": "New Taipei City"}
CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}

# Longest first. "" drops a term whose meaning is carried by another (財團法人 … 基金會 → … Foundation).
GLOSSARY = sorted({
    "股份有限公司": "Co., Ltd.", "有限公司": "Ltd.", "有限合夥": "LP", "企業社": "Enterprise", "商行": "Trading", "分公司": "Branch",
    "醫療財團法人": "", "財團法人": "", "社團法人": "", "中華民國": "R.O.C.", "臺灣省": "Taiwan Province", "台灣省": "Taiwan Province",
    "臺北市": "Taipei City", "台北市": "Taipei City", "新北市": "New Taipei City", "臺灣": "Taiwan", "台灣": "Taiwan",
    "私立": "Private", "市立": "Municipal", "國立": "National", "公立": "Public",
    "綜合長照機構": "Integrated LTC Agency", "居家長照機構": "Home Care Agency", "社區長照機構": "Community Care Agency",
    "住宿長照機構": "Residential LTC Agency", "長照機構": "LTC Agency", "老人長期照顧中心": "Senior Long-term Care Center",
    "長期照顧中心": "Long-term Care Center", "長期照護中心": "Long-term Care Center", "養護型": "Nursing Care", "長期照護型": "Long-term Care",
    "失智照顧型": "Dementia Care", "安養": "Senior Living", "養護": "Nursing Care",
    "護理之家": "Nursing Home", "居家護理所": "Home Nursing Agency", "護理所": "Nursing Agency",
    "物理治療所": "Physical Therapy Clinic", "職能治療所": "Occupational Therapy Clinic", "語言治療所": "Speech Therapy Clinic",
    "心理治療所": "Psychotherapy Clinic", "治療所": "Therapy Clinic", "診所": "Clinic", "紀念醫院": "Memorial Hospital", "醫院": "Hospital",
    "醫學院": "College of Medicine", "大學": "University", "分院": "Branch", "院區": "Branch", "藥局": "Pharmacy", "藥品": "Pharmaceutical",
    "醫療器材行": "Medical Supply Store", "醫療器材": "Medical Supplies", "醫療用品": "Medical Supplies", "醫療儀器": "Medical Equipment",
    "儀器": "Equipment", "輔具": "Assistive Devices", "門市部": "Store", "門市": "Store", "生技": "Biotech", "科技": "Technology",
    "日間照顧中心": "Day Care Center", "日照中心": "Day Care Center", "小規模多機能": "Small Multi-function", "家庭托顧": "Family Day Care",
    "社區照顧關懷據點": "Community Care Station", "關懷據點": "Care Station", "巷弄長照站": "Neighborhood Care Station", "據點": "Station",
    "社區發展協會": "Community Development Association", "發展協會": "Development Association", "社會福利協會": "Social Welfare Association",
    "社會福利基金會": "Social Welfare Foundation", "社會福利": "Social Welfare", "慈善事業基金會": "Charity Foundation", "文教基金會": "Cultural & Educational Foundation",
    "基金會": "Foundation", "協會": "Association", "學會": "Society", "公會": "Guild", "合作社": "Cooperative", "功德會": "Merit Society",
    "長老教會": "Presbyterian Church", "教會": "Church", "基督": "Christian", "天主教": "Catholic", "佛教": "Buddhist", "慈濟": "Tzu Chi",
    "紅十字會": "Red Cross", "分會": "Branch", "老人服務中心": "Senior Service Center", "服務中心": "Service Center", "中心": "Center",
    "社會局": "Dept. of Social Welfare", "衛生局": "Dept. of Health", "市政府": "City Government", "區公所": "District Office", "衛生所": "Health Center",
    "里辦公處": "Village Office", "榮民之家": "Veterans Home", "榮民": "Veterans", "國軍": "Armed Forces", "長青": "Senior", "老人": "Senior",
    "失智": "Dementia", "身心障礙": "Disability", "復健": "Rehabilitation", "交通": "Transport", "居家": "Home", "照顧": "Care", "照護": "Care",
    "長照": "LTC", "關懷": "Care", "互助": "Mutual Aid", "社區": "Community", "家園": "Home", "之家": "Home", "健康": "Health", "醫療": "Medical",
    "福利": "Welfare", "愛心": "Love", "樂齡": "Senior", "工作室": "Studio", "事業": "Enterprise", "實業": "Industrial", "國際": "International",
    "管理顧問": "Management Consulting", "顧問": "Consulting", "股份": "", "委託": "", "經營管理": "",
    "臺北市政府": "Taipei City Government", "台北市政府": "Taipei City Government", "新北市政府": "New Taipei City Government", "政府": "Government",
    "銀髮": "Senior", "義肢": "Prosthetics", "器材": "Equipment", "醫藥": "Medical", "先生": "", "含夾層": "incl. mezzanine", "衛生福利部": "Ministry of Health and Welfare",
    # official English names of large hospitals / organisations (pinyin would be wrong)
    "亞東紀念醫院": "Far Eastern Memorial Hospital", "馬偕紀念醫院": "MacKay Memorial Hospital", "耕莘醫院": "Cardinal Tien Hospital",
    "國泰綜合醫院": "Cathay General Hospital", "新光吳火獅紀念醫院": "Shin Kong Wu Ho-Su Memorial Hospital", "振興醫院": "Cheng Hsin General Hospital",
    "臺北榮民總醫院": "Taipei Veterans General Hospital", "三軍總醫院": "Tri-Service General Hospital", "萬芳醫院": "Wan Fang Hospital",
    "雙和醫院": "Shuang Ho Hospital", "臺北醫學大學": "Taipei Medical University", "臺北市立聯合醫院": "Taipei City Hospital",
    "國立臺灣大學醫學院附設醫院": "National Taiwan University Hospital", "臺灣大學": "National Taiwan University", "長庚": "Chang Gung",
    "居家式服務類長期照顧服務機構": "Home-based LTC Service Agency", "社區式服務類長期照顧服務機構": "Community-based LTC Service Agency",
    "住宿式服務類長期照顧服務機構": "Residential LTC Service Agency", "綜合式服務類長期照顧服務機構": "Integrated LTC Service Agency",
    "長期照顧服務機構": "LTC Service Agency", "照顧服務": "Care Service", "服務": "Service", "機構": "Agency",
    "淡水": "Tamsui", "臺北": "Taipei", "台北": "Taipei", "新北": "New Taipei", "企業": "Enterprise", "貿易": "Trading", "開發": "Development",
    "兒童": "Children's", "婦幼": "Women & Children", "牙醫": "Dental", "中醫": "Chinese Medicine", "眼科": "Ophthalmology", "骨科": "Orthopedics",
    "家醫科": "Family Medicine", "內科": "Internal Medicine", "復健科": "Rehabilitation", "聯合": "United", "家庭": "Family", "生活": "Living",
    "站": "Station", "協進會": "Association", "促進會": "Promotion Association", "聯盟": "Alliance", "總會": "National Association",
    "恩主公醫院": "En Chu Kong Hospital", "永和耕莘醫院": "Cardinal Tien Hospital Yonghe Branch", "號": "No.", "輔仁大學": "Fu Jen Catholic University", "部立臺北醫院": "Taipei Hospital, MOHW", "和信治癌中心醫院": "Koo Foundation Sun Yat-Sen Cancer Center",
}.items(), key=lambda kv: -len(kv[0]))

HAN = re.compile(r"[一-鿿]+")


# Readings that pypinyin gets wrong for Taiwanese place and street names (長安 Chang'an, 三重 Sanchong)
READING = {"長": "chang", "重": "chong"}


def py(chars: str) -> str:
    """Hanyu Pinyin without tones; ü → yu (Taiwan street-sign convention, e.g. Lyu)."""
    syl = [READING.get(c) or p for c, p in zip(chars, lazy_pinyin(chars, style=Style.NORMAL, v_to_u=False))] if len(lazy_pinyin(chars)) == len(chars) else lazy_pinyin(chars, style=Style.NORMAL, v_to_u=False)
    # apostrophe before a vowel-initial syllable (Chang'an, Da'an)
    out = syl[0] if syl else ""
    for x in syl[1:]:
        out += ("'" if x[:1] in "aeo" else "") + x
    return out.replace("v", "yu")


def proper(chunk: str) -> str:
    """A run of Chinese characters that isn't a glossary term → capitalised pinyin words."""
    if chunk.endswith("區") and chunk in DISTRICT_EN:
        return DISTRICT_EN[chunk]
    parts = [chunk] if len(chunk) <= 3 else [chunk[i:i + 2] for i in range(0, len(chunk), 2)]
    return " ".join(py(p).capitalize() for p in parts)


def translate_segment(s: str) -> str:
    s = s.replace("（", "(").replace("）", ")").replace("－", "-").replace("　", " ")
    for d, en in DISTRICT_EN.items():  # "萬華區" inside names → "Wanhua"
        s = s.replace(d, f" {en} ")
    out, i = [], 0
    while i < len(s):
        for zh, en in GLOSSARY:
            if s.startswith(zh, i):
                if en:
                    out.append(en)
                i += len(zh)
                break
        else:
            m = HAN.match(s, i)
            other = re.compile(r"[^\u4e00-\u9fff]+").match(s, i)
            if not m and other:
                out.append(other.group(0))
                i += len(other.group(0))
                continue
            if m:
                # cut the run at the next glossary term so terms inside it still translate
                run = m.group(0)
                cut = min([run.find(zh) for zh, _ in GLOSSARY if zh and run.find(zh) > 0] + [len(run)])
                out.append(proper(run[:cut]))
                i += cut
            else:
                out.append(s[i])
                i += 1
    text = "".join(w if not w.strip() or w in "()-&,. " else f" {w.strip()} " for w in out)
    text = re.sub(r"\s+", " ", text).replace("( ", "(").replace(" )", ")").strip(" -")
    return text


def translate_name(name: str) -> str:
    n = name.strip()
    m = re.match(r"^(.+?)委託(.+?)經營管理(.+)$", n)
    if m:
        return f"{translate_segment(m.group(3))} (operated by {translate_segment(m.group(2))} for {translate_segment(m.group(1))})"
    # "X醫療財團法人Y醫院…": the hospital is the name people know; drop the foundation prefix
    n = re.sub(r"^醫療財團法人.*?基金會(?=.+醫院)", "", n)
    m = re.search(r"醫療財團法人(.+醫院.*)$", n)
    if m:
        n = m.group(1)
    if "附設" in n and not n.endswith("醫學院附設醫院"):
        parent, child = n.rsplit("附設", 1)
        return f"{translate_segment(child)} (run by {translate_segment(parent)})"
    return translate_segment(n)


def num(s: str) -> str:
    """'2' / '二' / '十四' / '二十' → '2' / '2' / '14' / '20'."""
    if s.isdigit():
        return s
    if "十" in s:
        tens, _, ones = s.partition("十")
        return str((CN_NUM.get(tens, 1) if tens else 1) * 10 + (CN_NUM.get(ones, 0) if ones else 0))
    return str(CN_NUM[s]) if s in CN_NUM else s


def ordinal(n: str) -> str:
    k = int(n)
    return f"{k}{'th' if 10 <= k % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(k % 10, 'th')}"


def road_en(r: str) -> str:
    """莒光路 → Juguang Rd.; 中山北路 → Zhongshan N. Rd.; 德昌2街 → Dechang 2nd St."""
    kind = {"路": "Rd.", "街": "St.", "大道": "Blvd.", "道": "Rd."}
    for zh, en in kind.items():
        if r.endswith(zh):
            base = r[: -len(zh)]
            break
    else:
        return proper(r)
    direction = ""
    if base and base[-1] in "東西南北":
        direction = {"東": "E.", "西": "W.", "南": "S.", "北": "N."}[base[-1]] + " "
        base = base[:-1]
    if len(base) > 1 and base[-1] in CN_NUM:
        base = base[:-1] + str(CN_NUM[base[-1]])
    m = re.match(r"^(.*?)(\d+)$", base)
    if m:
        return f"{py(m.group(1)).capitalize()} {ordinal(m.group(2))} {en}"
    return f"{py(base).capitalize()} {direction}{en}"


ADDR = re.compile(
    r"^(?P<city>臺北市|台北市|新北市)?(?P<dist>[一-鿿]{1,3}區)?"
    r"(?:[一-鿿]{1,4}里)?(?:\d+鄰)?"
    r"(?P<road>[一-鿿\d]+?(?:大道|路|街|道))?"
    r"(?:(?P<sec>[一二三四五六七八九十\d]+)段)?"
    r"(?:(?P<lane>[\d之-]+)巷)?(?:(?P<alley>[\d之-]+)弄)?"
    r"(?:(?P<no>[\d之、,\-]+)號)?(?P<rest>.*)$"
)


def translate_address(a: str) -> str:
    a = a.strip().replace("－", "-").replace("　", "")
    m = ADDR.match(a)
    if not m or not (m.group("road") or m.group("no")):
        return translate_segment(a)
    g = m.groupdict()
    parts = []
    rest = g["rest"] or ""
    multi = re.match(r"^(?P<fs>\d+(?:[、,]\d+)+)樓(?P<tail>.*)$", rest)
    if multi:
        parts.append(" & ".join(f"{f}F" for f in re.split(r"[、,]", multi.group("fs"))))
        rest = multi.group("tail")
    fl = None if multi else re.match(r"^(?P<b>地下)?(?P<f>[\d一二三四五六七八九十]+)樓(?:之(?P<x>\d+))?(?P<tail>.*)$", rest)
    if multi:
        pass
    elif rest.startswith("地下室"):
        parts.append("B1")
        rest = rest[3:]
    elif fl:
        f = num(fl.group("f"))
        parts.append(f"B{f}" if fl.group("b") else f"{f}F" + (f"-{fl.group('x')}" if fl.group("x") else ""))
        rest = fl.group("tail")
    rest = rest.strip("、, ")
    trailing = ""
    if rest:
        rest_en = translate_segment(re.sub(r"(\d+)樓", r"\1F", re.sub(r"(\d+)室", r"Rm. \1", rest)))
        if rest_en.startswith("("):
            trailing = " " + rest_en  # e.g. "(incl. mezzanine)" goes after the whole address
        elif rest_en:
            parts.insert(0, rest_en)
    if g["no"]:
        parts.append("No. " + g["no"].replace("之", "-").replace("、", ", "))
    if g["alley"]:
        parts.append("Aly. " + g["alley"].replace("之", "-"))
    if g["lane"]:
        parts.append("Ln. " + g["lane"].replace("之", "-"))
    if g["sec"]:
        parts.append("Sec. " + num(g["sec"]))
    if g["road"]:
        parts.append(road_en(g["road"]))
    if g["dist"]:
        parts.append(f"{DISTRICT_EN.get(g['dist'], proper(g['dist'][:-1]))} Dist.")
    if g["city"]:
        parts.append(CITY_EN[g["city"]])
    return ", ".join(p for p in parts if p) + trailing


if __name__ == "__main__":
    for f in ["providers-taipei.json", "providers-new-taipei.json", "community-new-taipei.json"]:
        path = f"{D}/{f}"
        try:
            items = json.load(open(path, encoding="utf-8"))
        except FileNotFoundError:
            continue
        for it in items:
            it["name_en"] = translate_name(it["name"])
            it["address_en"] = translate_address(it["address"]) if it.get("address") else ""
        json.dump(items, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f, len(items))
