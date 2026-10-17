import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCallScript } from "./callScript";
import { districtCentroid, findDistrict, getDistricts, getProvidersFor, nearestTierA, providersServing } from "./data";
import { carryoverPeriod, currentProcessStep, levelGuide, computeDevices, computePlan, computeResidential, computeRespite, computeTransport, householdFromIncome, identityOk, incomeBandRanges } from "./planEngine";
import type { Answers, DemoCases, District, Provider, Rules } from "./types";

const read = <T,>(f: string): T => JSON.parse(readFileSync(resolve(__dirname, "../../public/data", f), "utf-8"));
const rules = read<Rules>("ltc_rules.json");
const districts = read<District[]>("districts.json");
const taipei = read<Provider[]>("providers-taipei.json");
const newTaipei = read<Provider[]>("providers-new-taipei.json");
const demo = read<DemoCases>("demo-cases.json");
const TODAY = new Date(2026, 9, 17); // 2026-10-17, fixed for tests

const base: Answers = {
  city: "臺北市",
  district: "萬華區",
  age: "65plus",
  indigenous: false,
  disabilityCert: false,
  dementia: false,
  pac: false,
  status: "assessed",
  level: 4,
  needs: [],
  living: "home_family",
  household: "type3",
};
const plan = (a: Partial<Answers>, selectedLevel?: Answers["level"]) => computePlan({ ...base, ...a }, rules, { today: TODAY, zone: "zone1", selectedLevel });

describe("planEngine (docs/02 unit tests)", () => {
  it("1. level 4, type3, home_family → care cap 18580, you pay 2973", () => {
    const p = plan({});
    expect(p.care?.cap).toBe(18580);
    expect(p.care?.youPay).toBe(2973);
    expect(p.care?.govPays).toBe(18580 - 2973);
  });

  it("2. level 4, type1 → you pay 0", () => {
    expect(plan({ household: "type1" }).care?.youPay).toBe(0);
  });

  it("3. plan approved 2026-05, today 2026-10-17 → period ends 2026-10-31, 14 days, alert", () => {
    const period = carryoverPeriod("2026-05", TODAY);
    expect(period.end).toBe("2026-10-31");
    expect(period.daysLeft).toBe(14);
    const p = plan({ planApprovedMonth: "2026-05" });
    expect(p.alerts.find((x) => x.id === "carryover_reset")).toMatchObject({ date: "2026-10-31", daysLeft: 14 });
    // next period starts 2026-11
    expect(carryoverPeriod("2026-05", new Date(2026, 10, 2)).end).toBe("2027-04-30");
  });

  it("4. devices used 25000, approved 2025-02 → group 1, remaining 15000, group 2 from 2028-02", () => {
    const d = computeDevices(rules, { devicesUsed: 25000, deviceApprovedMonth: "2025-02", household: "type3", needs: [] });
    expect(d.mode).toBe("group1_only");
    expect(d.group1.remaining).toBe(15000);
    expect(d.group2From).toBe("2028-02");
  });

  it("5. level 3, respite used 10000 → remaining 22340, 9 residential days", () => {
    const r = computeRespite(rules, 3, 10000, "type3");
    expect(r.remaining).toBe(22340);
    expect(r.goesAsFar.residentialDays).toBe(9);
  });

  it("6. level 7 → respite cap 48510", () => {
    expect(computeRespite(rules, 7, 0, "type3").cap).toBe(48510);
  });

  it("7. transport: Taipei type3 1680/504; New Taipei type2 1840/166", () => {
    expect(computeTransport(rules, "zone1", "type3", [])).toMatchObject({ cap: 1680, youPay: 504 });
    expect(computeTransport(rules, "zone2", "type2", [])).toMatchObject({ cap: 1840, youPay: 166, rate: 0.09 });
  });

  it("8. devices approved before 2026-07-01, used 15000 → group 1 remaining 25000 + group 2 date", () => {
    const d = computeDevices(rules, { devicesUsed: 15000, deviceApprovedMonth: "2026-06", household: "type3", needs: [] });
    expect(d.mode).toBe("group1_only");
    expect(d.group1.remaining).toBe(25000);
    expect(d.group2From).toBe("2029-06");
  });

  it("9. age 60, no conditions → not meeting; community first", () => {
    const p = plan({ age: "55_64", status: "never", level: undefined });
    expect(identityOk({ ...base, age: "55_64" })).toBe(false);
    expect(p.banner.kind).toBe("not_meeting");
    expect(p.banner.text).toEqual(rules._wording_rules.say_instead_not_meeting);
    expect(p.communityFirst).toBe(true);
    expect(p.showBenefits).toBe(false);
  });

  it("10. residential, level 3, moderate cert, public placement → 15000 + cannot-combine", () => {
    const r = computeResidential({ disabilityCert: true, disabilityLevel: "moderate", otherResidentialSubsidies: ["public_placement"] }, 3);
    expect(r).toEqual({ status: "eligible_15000", monthly: 15000, cannotCombine: true });
    const p = plan({ living: "residential", level: 3, disabilityCert: true, disabilityLevel: "moderate", otherResidentialSubsidies: ["public_placement"] });
    expect(p.residential?.monthly).toBe(15000);
    expect(p.care).toBeUndefined();
    expect(p.respite).toBeUndefined();
  });

  it("11. level 1 assessed → no benefit cards", () => {
    const p = plan({ level: 1 });
    expect(p.showBenefits).toBe(false);
    expect(p.care).toBeUndefined();
    expect(p.communityFirst).toBe(true);
  });

  it("not assessed → official table, nothing pre-selected", () => {
    const p = plan({ status: "never", level: undefined });
    expect(p.banner.text).toEqual(rules._wording_rules.say_instead_meets_conditions);
    expect(p.showLevelSelector).toBe(true);
    expect(p.level).toBeUndefined();
    expect(p.care).toBeUndefined();
    expect(p.careTable?.map((r) => r.cap)).toEqual([10020, 15460, 18580, 24100, 28070, 32090, 36180]);
  });

  it("residentBefore2023 without level 4 → 5000", () => {
    expect(computeResidential({ disabilityCert: false, residentBefore2023: true }, 3).monthly).toBe(5000);
    expect(computeResidential({ disabilityCert: false }, 3).status).toBe("not_eligible");
  });
});

describe("income bands (2026 official thresholds)", () => {
  it("Taipei and New Taipei ranges", () => {
    expect(incomeBandRanges(rules, "臺北市")).toEqual({ low: [0, 20744], midlow: [20745, 29635], allowance2: [29636, 39960], general: [39961, undefined] });
    expect(incomeBandRanges(rules, "新北市").midlow).toEqual([17751, 26625]);
  });
  it("band → copay type; reduced senior allowance band only for 65+", () => {
    expect(householdFromIncome(rules, "low", "65plus")).toBe("type1");
    expect(householdFromIncome(rules, "midlow", "55_64")).toBe("type1");
    expect(householdFromIncome(rules, "allowance2", "65plus")).toBe("type2");
    expect(householdFromIncome(rules, "allowance2", "55_64")).toBe("type3");
    expect(householdFromIncome(rules, "general", "65plus")).toBe("type3");
    expect(householdFromIncome(rules, "unknown", "65plus")).toBe("unknown");
  });
});

describe("level guide", () => {
  it("level 6 type2: care 28070 / pay 1404, respite 32340 / 1617, residential yes", () => {
    const g = levelGuide(rules, 6, "type2");
    expect(g.care).toMatchObject({ cap: 28070, youPay: 1404 });
    expect(g.respite).toMatchObject({ cap: 32340, youPay: 1617 });
    expect(g.residentialEligible).toBe(true);
  });
  it("level 3 no residential; level 7 respite 48510; level 1 no benefits", () => {
    expect(levelGuide(rules, 3, "type3").residentialEligible).toBe(false);
    expect(levelGuide(rules, 7, "type3").respite?.cap).toBe(48510);
    expect(levelGuide(rules, 1, "type3")).toEqual({ level: 1, hasBenefits: false, residentialEligible: false });
  });
  it("process step from status", () => {
    expect(currentProcessStep("never")).toBe(0);
    expect(currentProcessStep("in_hospital")).toBe(0);
    expect(currentProcessStep("waiting")).toBe(1);
    expect(currentProcessStep("assessed")).toBe(2);
  });
});

describe("12. demo cases (docs/01)", () => {
  it("case 1 with level 6 selected", () => {
    const a = demo.case1.answers;
    const zone = findDistrict(districts, a.city, a.district)!.transport_zone;
    expect(zone).toBe("zone2");
    const none = computePlan(a, rules, { today: TODAY, zone });
    expect(none.banner.kind).toBe("meets");
    expect(none.level).toBeUndefined();
    expect(none.callFirst).toBe("ward_nurse");
    expect(none.alerts.map((x) => x.id)).toEqual(["apply_before_discharge"]);
    expect(none.devices?.mode).toBe("choose");
    expect(none.devices?.rate).toBe(0.1);

    const p = computePlan(a, rules, { today: TODAY, zone, selectedLevel: 6 });
    expect(p.care).toMatchObject({ cap: 28070, youPay: 1404 });
    expect(p.transport).toMatchObject({ cap: 1840, youPay: 166 });
    expect(p.respite).toMatchObject({ cap: 32340, youPay: 1617 });

    expect(providersServing(newTaipei, "板橋區").length).toBe(1076);
    expect(nearestTierA(newTaipei, districts, "新北市", "板橋區")?.name).toBe("新北市私立常錦居家長照機構");
    const homes = newTaipei.filter((x) => x.is_residential && x.district === "板橋區");
    expect(homes.length).toBe(25);
    expect(homes.reduce((s, x) => s + x.open_beds, 0)).toBe(124);
  });

  it("case 2", () => {
    const a = demo.case2.answers;
    const p = computePlan(a, rules, { today: TODAY, zone: "zone1" });
    expect(p.banner.text.en).toBe("Assessed at level 5");
    expect(p.care).toMatchObject({ cap: 24100, youPay: 3856 });
    expect(p.care?.period).toMatchObject({ end: "2026-10-31", daysLeft: 14 });
    expect(p.respite).toMatchObject({ remaining: 32340, youPay: 5174, goesAsFar: { residentialDays: 14, daycareDays: 25, homeVisits2h: 42 } });
    expect(p.devices).toMatchObject({ mode: "group1_only", group1: { remaining: 15000 }, group2From: "2028-02" });
    expect(p.transport).toMatchObject({ cap: 1680, youPay: 504 });
    expect(p.residential).toMatchObject({ status: "eligible_15000", monthly: 15000 });
    expect(p.alerts.map((x) => x.id)).toEqual(["carryover_reset", "respite_unused"]);
    expect(p.callFirst).toBe("tier_a");
  });
});

describe("data layer", () => {
  it("Taipei has 12 districts; 41 total", () => {
    expect(getDistricts(districts, "臺北市").length).toBe(12);
    expect(districts.length).toBe(41);
  });

  it("Wanhua nearest tier A = 慈濟居家長照機構 (02-23023479)", () => {
    const a = nearestTierA(taipei, districts, "臺北市", "萬華區");
    expect(a?.name).toContain("慈濟居家長照機構");
    expect(a?.phone).toBe("02-23023479");
  });

  it("Wanhua: same-city providers serving the district matches districts.json", () => {
    const d = findDistrict(districts, "臺北市", "萬華區")!;
    expect(providersServing(taipei, "萬華區").length).toBe(d.providers_serving);
  });

  it("getProvidersFor puts in-district providers first", () => {
    const list = getProvidersFor(taipei, districts, demo.case2.answers, 5);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].district).toBe("萬華區");
    expect(districtCentroid(districts, "臺北市", "萬華區")).toBeDefined();
  });
});

describe("call script", () => {
  it("case 2 script mentions the reset date and respite", () => {
    const a = demo.case2.answers;
    const p = computePlan(a, rules, { today: TODAY, zone: "zone1" });
    const tierA = nearestTierA(taipei, districts, a.city, a.district);
    const s = buildCallScript(a, p, rules, tierA);
    expect(s.say.zh.join("")).toContain("2026-10-31");
    expect(s.say.zh.join("")).toContain("喘息");
    expect(s.say.en.join(" ")).toContain("respite");
  });

  it("case 1 script asks the ward nurse for discharge planning", () => {
    const a = demo.case1.answers;
    const p = computePlan(a, rules, { today: TODAY, zone: "zone2" });
    const s = buildCallScript(a, p, rules, undefined);
    expect(s.say.zh.join("")).toContain("出院準備服務");
  });
});
