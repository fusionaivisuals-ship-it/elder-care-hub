// CareMap rules engine (docs/02). Pure, deterministic functions; all NT$ math lives here.
// Inputs: wizard answers + ltc_rules.json. No AI, no guessing. NT$ rounded with Math.round.
import type { AgeBand, Answers, City, CopayType, Household, IncomeBand, LText, Level, Rules, Zone } from "./types";

export type RateCategory = "care_professional" | "respite" | "devices_home" | `transport_${Zone}`;

export interface Money {
  cap: number;
  govPays: number;
  youPay: number;
  rate: number;
}

export interface CarryoverPeriod {
  start: string; // 'YYYY-MM'
  end: string; // 'YYYY-MM-DD' (last day of period)
  daysLeft: number;
}

export interface CareResult extends Money {
  level: Level;
  period?: CarryoverPeriod;
}

export interface CareTableRow extends Money {
  level: Level;
}

export interface TransportResult extends Money {
  zone: Zone;
  highlight: boolean;
}

export type DevicesMode = "group1_only" | "choose" | "compare";

export interface DevicesResult {
  mode: DevicesMode;
  rate: number;
  used: number;
  group1: { cap: number; remaining: number; youPayIfAllUsed: number; govPaysIfAllUsed: number };
  group2: { cap: number; remaining: number; youPayIfAllUsed: number; govPaysIfAllUsed: number; homeModMax: number };
  periodEnd?: string; // 'YYYY-MM' (group 1 only)
  group2From?: string; // 'YYYY-MM'
  showDisabilityOverlap: boolean;
  highlight: boolean;
}

export interface RespiteResult {
  cap: number;
  used: number;
  remaining: number;
  rate: number;
  youPay: number;
  govPays: number;
  goesAsFar: { residentialDays: number; daycareDays: number; homeVisits2h: number };
}

export interface RespiteTable {
  rate: number;
  rows: { levels: "2-6" | "7-8"; cap: number; youPay: number; govPays: number }[];
}

export type ResidentialStatus = "eligible_15000" | "eligible_5000" | "needs_level4" | "not_eligible";

export interface ResidentialResult {
  status: ResidentialStatus;
  monthly: number;
  cannotCombine: boolean;
}

export type BannerKind = "meets" | "not_meeting" | "assessed" | "level1";

export interface Alert {
  id: "carryover_reset" | "respite_unused" | "apply_before_discharge";
  date?: string;
  daysLeft?: number;
}

export type CallFirstKind = "ward_nurse" | "city_center" | "tier_a" | "hotline_1966";

export interface PlanResult {
  identityOk: boolean;
  banner: { kind: BannerKind; text: LText };
  copayType: CopayType;
  householdUnknown: boolean;
  assessed: boolean;
  /** Level used for amounts: the assessed level, or the one the user tapped in the selector. */
  level?: Level;
  levelSource: "assessed" | "selected" | "none";
  showLevelSelector: boolean;
  showBenefits: boolean;
  communityFirst: boolean;
  care?: CareResult;
  careTable?: CareTableRow[];
  transport?: TransportResult;
  devices?: DevicesResult;
  respite?: RespiteResult;
  respiteTable?: RespiteTable;
  respiteNeedsCaregiver: boolean;
  residential?: ResidentialResult;
  alerts: Alert[];
  callFirst: CallFirstKind;
}

export const LEVELS: Level[] = [2, 3, 4, 5, 6, 7, 8];
export const CARRYOVER_ALERT_DAYS = 31;
export const GROUP2_EFFECTIVE_MONTH = "2026-07";

// ---------- small date helpers (month strings 'YYYY-MM', local dates) ----------

export function parseMonth(m: string): { y: number; mo: number } {
  const [y, mo] = m.split("-").map(Number);
  return { y, mo };
}

export function addMonths(m: string, n: number): string {
  const { y, mo } = parseMonth(m);
  const idx = y * 12 + (mo - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

function monthIndex(m: string): number {
  const { y, mo } = parseMonth(m);
  return y * 12 + (mo - 1);
}

function lastDayOfMonth(m: string): string {
  const { y, mo } = parseMonth(m);
  const d = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${m}-${String(d).padStart(2, "0")}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10));
  const b = Date.UTC(+toISO.slice(0, 4), +toISO.slice(5, 7) - 1, +toISO.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

// ---------- §1 eligibility ----------

export function identityOk(a: Pick<Answers, "age" | "indigenous" | "dementia" | "disabilityCert" | "pac">): boolean {
  const indigenous55 = a.indigenous && (a.age === "55_64" || a.age === "65plus");
  return a.age === "65plus" || indigenous55 || a.dementia || a.disabilityCert || a.pac;
}

// ---------- §2 copay ----------

export function copayType(h: Household): CopayType {
  return h === "unknown" ? "type3" : h;
}

/** Income band → copay household type. Seniors' allowance (type 2 band) only exists for 65+. */
export function householdFromIncome(rules: Rules, band: IncomeBand, age: AgeBand): Household {
  if (band === "unknown") return "unknown";
  const m = rules.income_bands_2026.mapping[band];
  return age !== "65plus" && m.copay_if_under_65 ? m.copay_if_under_65 : m.copay;
}

/** NT$ limits of each band for a city: [from, to] per person per month (to undefined = no upper limit). */
export function incomeBandRanges(rules: Rules, city: City): Record<Exclude<IncomeBand, "unknown">, [number, number | undefined]> {
  const c = rules.income_bands_2026[city];
  return {
    low: [0, c.min_living_cost],
    midlow: [c.min_living_cost + 1, c.midlow_and_allowance_full],
    allowance2: [c.midlow_and_allowance_full + 1, c.allowance_upper],
    general: [c.allowance_upper + 1, undefined],
  };
}

export function rate(rules: Rules, category: RateCategory, household: Household): number {
  return rules.copay.rates[category][copayType(household)];
}

function money(cap: number, r: number): Money {
  const youPay = Math.round(cap * r);
  return { cap, rate: r, youPay, govPays: cap - youPay };
}

// ---------- §3 care & professional ----------

export function careCap(rules: Rules, level: Level): number {
  if (level < 2) return 0;
  return rules.monthly_care_cap_ntd[String(level) as keyof Rules["monthly_care_cap_ntd"]] as number;
}

export function computeCare(rules: Rules, level: Level, household: Household): Money {
  return money(careCap(rules, level), rate(rules, "care_professional", household));
}

export function careTable(rules: Rules, household: Household): CareTableRow[] {
  return LEVELS.map((level) => ({ level, ...computeCare(rules, level, household) }));
}

/** 6-month periods starting at the plan approval month; returns the period containing today. */
export function carryoverPeriod(planApprovedMonth: string, today: Date): CarryoverPeriod {
  const todayISO = toISODate(today);
  const elapsed = monthIndex(todayISO.slice(0, 7)) - monthIndex(planApprovedMonth);
  const k = Math.max(0, Math.floor(elapsed / 6));
  const start = addMonths(planApprovedMonth, k * 6);
  const end = lastDayOfMonth(addMonths(start, 5));
  return { start, end, daysLeft: daysBetween(todayISO, end) };
}

// ---------- §4 transport ----------

export function computeTransport(rules: Rules, zone: Zone, household: Household, needs: string[]): TransportResult {
  const m = money(rules.transport.monthly_cap_ntd[zone], rate(rules, `transport_${zone}`, household));
  return { ...m, zone, highlight: needs.includes("appointments") };
}

// ---------- §5 devices & home modification ----------

const DEVICE_NEEDS = ["walking_falls", "bathing", "out_of_bed", "toileting", "home_unsafe"];

export function computeDevices(
  rules: Rules,
  a: Pick<Answers, "devicesUsed" | "deviceApprovedMonth" | "disabilityDevice" | "household" | "needs">,
): DevicesResult {
  const g1cap = rules.devices_home_modification.group1.cap;
  const g2cap = rules.devices_home_modification.group2.cap;
  const r = rate(rules, "devices_home", a.household);
  const used = a.devicesUsed ?? 0;
  let mode: DevicesMode;
  let periodEnd: string | undefined;
  if (!used && !a.deviceApprovedMonth) mode = "choose";
  else if (a.deviceApprovedMonth && a.deviceApprovedMonth < GROUP2_EFFECTIVE_MONTH) {
    mode = "group1_only";
    periodEnd = addMonths(a.deviceApprovedMonth, 36);
  } else mode = "compare";
  // In group1_only mode, group 2 is a fresh future period, so nothing is used from it yet
  const pot = (cap: number, usedFromPot: number) => {
    const remaining = Math.max(cap - usedFromPot, 0);
    const youPayIfAllUsed = Math.round(remaining * r);
    return { cap, remaining, youPayIfAllUsed, govPaysIfAllUsed: remaining - youPayIfAllUsed };
  };
  return {
    mode,
    rate: r,
    used,
    group1: pot(g1cap, used),
    group2: { ...pot(g2cap, mode === "group1_only" ? 0 : used), homeModMax: rules.devices_home_modification.group2.home_modification_max },
    periodEnd,
    group2From: periodEnd,
    showDisabilityOverlap: !!a.disabilityDevice,
    highlight: a.needs.some((n) => DEVICE_NEEDS.includes(n)),
  };
}

// ---------- §6 respite ----------

export function respiteCap(rules: Rules, level: Level): number {
  return level <= 6 ? rules.respite.yearly_cap_ntd.cms_2_6 : rules.respite.yearly_cap_ntd.cms_7_8;
}

function respitePrice(rules: Rules, code: string, fallback: number): number {
  return rules.respite.prices_ntd.find((p) => p.code === code)?.price ?? fallback;
}

export function computeRespite(rules: Rules, level: Level, used: number | undefined, household: Household): RespiteResult {
  const cap = respiteCap(rules, level);
  const u = used ?? 0;
  const remaining = Math.max(cap - u, 0);
  const r = rate(rules, "respite", household);
  const youPay = Math.round(remaining * r);
  return {
    cap,
    used: u,
    remaining,
    rate: r,
    youPay,
    govPays: remaining - youPay,
    goesAsFar: {
      residentialDays: Math.floor(remaining / respitePrice(rules, "GA05", 2310)),
      daycareDays: Math.floor(remaining / respitePrice(rules, "GA03", 1250)),
      homeVisits2h: Math.floor(remaining / respitePrice(rules, "GA09", 770)),
    },
  };
}

export function respiteTable(rules: Rules, household: Household): RespiteTable {
  const r = rate(rules, "respite", household);
  const row = (levels: "2-6" | "7-8", cap: number) => ({ levels, ...money(cap, r) });
  return { rate: r, rows: [row("2-6", rules.respite.yearly_cap_ntd.cms_2_6), row("7-8", rules.respite.yearly_cap_ntd.cms_7_8)] };
}

// ---------- §7 residential subsidy ----------

export function computeResidential(
  a: Pick<Answers, "disabilityCert" | "disabilityLevel" | "residentBefore2023" | "otherResidentialSubsidies">,
  level: Level | undefined,
): ResidentialResult {
  const moderatePlus = a.disabilityCert && !!a.disabilityLevel && a.disabilityLevel !== "mild";
  const cannotCombine = (a.otherResidentialSubsidies?.length ?? 0) > 0;
  if ((level ?? 0) >= 4 || moderatePlus) return { status: "eligible_15000", monthly: 15000, cannotCombine };
  if (a.residentBefore2023) return { status: "eligible_5000", monthly: 5000, cannotCombine };
  if (level === undefined) return { status: "needs_level4", monthly: 0, cannotCombine };
  return { status: "not_eligible", monthly: 0, cannotCombine };
}

// ---------- the whole plan ----------

export interface PlanOptions {
  today: Date;
  zone: Zone;
  /** Level tapped in the selector when not assessed. Ignored when assessed. */
  selectedLevel?: Level;
}

export function computePlan(a: Answers, rules: Rules, opts: PlanOptions): PlanResult {
  const ok = identityOk(a);
  const assessed = a.status === "assessed" && a.level !== undefined;
  const level1 = assessed && a.level === 1;
  const level: Level | undefined = assessed ? a.level : opts.selectedLevel;
  const levelSource = assessed ? "assessed" : opts.selectedLevel ? "selected" : "none";
  const atHome = a.living !== "residential";
  const showBenefits = ok && !level1;
  const alerts: Alert[] = [];

  let banner: PlanResult["banner"];
  if (level1) banner = { kind: "level1", text: { zh: "已評估為第1級：第1級沒有長照給付，建議先使用社區據點。", en: "Assessed at level 1: level 1 has no LTC benefits; community stations are the place to start." } };
  else if (assessed) banner = { kind: "assessed", text: { zh: `已評估為第${a.level}級`, en: `Assessed at level ${a.level}` } };
  else if (ok) banner = { kind: "meets", text: rules._wording_rules.say_instead_meets_conditions };
  else banner = { kind: "not_meeting", text: rules._wording_rules.say_instead_not_meeting };

  const plan: PlanResult = {
    identityOk: ok,
    banner,
    copayType: copayType(a.household),
    householdUnknown: a.household === "unknown",
    assessed,
    level: level1 ? undefined : level,
    levelSource: level1 ? "assessed" : levelSource,
    showLevelSelector: showBenefits && !assessed,
    showBenefits,
    communityFirst: !ok || level1 || !assessed,
    respiteNeedsCaregiver: a.living === "home_none",
    alerts,
    callFirst: a.status === "in_hospital" ? "ward_nurse" : a.status === "assessed" ? (level1 ? "hotline_1966" : "tier_a") : "city_center",
  };

  if (a.status === "in_hospital") alerts.push({ id: "apply_before_discharge" });
  if (!showBenefits) return plan;

  if (atHome) {
    if (!assessed) plan.careTable = careTable(rules, a.household);
    if (level) {
      plan.care = { level, ...computeCare(rules, level, a.household) };
      if (assessed && a.planApprovedMonth) {
        const period = carryoverPeriod(a.planApprovedMonth, opts.today);
        plan.care.period = period;
        if (period.daysLeft >= 0 && period.daysLeft <= CARRYOVER_ALERT_DAYS) alerts.push({ id: "carryover_reset", date: period.end, daysLeft: period.daysLeft });
      }
    }
    plan.transport = computeTransport(rules, opts.zone, a.household, a.needs);
    plan.devices = computeDevices(rules, a);
    if (a.living === "home_family") {
      if (!assessed) plan.respiteTable = respiteTable(rules, a.household);
      if (level) plan.respite = computeRespite(rules, level, assessed ? a.respiteUsed : 0, a.household);
      if (assessed && !a.respiteUsed) alerts.push({ id: "respite_unused" });
    }
  }

  if (!atHome || (level ?? 0) >= 4) plan.residential = computeResidential(a, level);

  // Most urgent first: money resetting, then discharge, then unused respite
  const order: Alert["id"][] = ["carryover_reset", "apply_before_discharge", "respite_unused"];
  alerts.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  return plan;
}
