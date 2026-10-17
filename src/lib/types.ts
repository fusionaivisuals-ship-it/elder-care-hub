// Shared types for CareMap. Field names match public/data/*.json (docs/03).

export type Lang = "zh" | "en";
export interface LText {
  zh: string;
  en: string;
}

export type City = "臺北市" | "新北市";
export type CityKey = "taipei" | "new-taipei";
export type AgeBand = "u50" | "50_54" | "55_64" | "65plus";
export type LtcStatus = "never" | "waiting" | "assessed" | "in_hospital";
export type Living = "home_family" | "home_none" | "residential"; // foreign/live-in caregivers are out of scope
export type Household = "type1" | "type2" | "type3" | "unknown"; // unknown → type3 + tip
/** Average household income per person per month, in official 2026 bands (ltc_rules.income_bands_2026). */
export type IncomeBand = "low" | "midlow" | "allowance2" | "general" | "unknown";
export type CopayType = "type1" | "type2" | "type3";
export type DisabilityLevel = "mild" | "moderate" | "severe" | "profound";
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Zone = "zone1" | "zone2" | "zone3" | "zone4";

export type Need =
  | "bathing"
  | "eating"
  | "walking_falls"
  | "out_of_bed"
  | "toileting"
  | "memory"
  | "medicine"
  | "appointments"
  | "home_unsafe";

export type OtherResidentialSubsidy = "disability_residential" | "public_placement" | "veterans_public_bed";

export interface Answers {
  city: City;
  district: string;
  age: AgeBand;
  indigenous: boolean;
  disabilityCert: boolean;
  disabilityLevel?: DisabilityLevel;
  dementia: boolean;
  pac: boolean;
  status: LtcStatus;
  level?: Level;
  planApprovedMonth?: string; // 'YYYY-MM'
  devicesUsed?: number;
  deviceApprovedMonth?: string; // 'YYYY-MM'
  respiteUsed?: number;
  disabilityDevice?: boolean;
  needs: Need[];
  living: Living;
  residentBefore2023?: boolean;
  otherResidentialSubsidies?: OtherResidentialSubsidy[];
  household: Household;
  /** Set by the wizard; household is derived from it. Demo cases set household directly. */
  incomeBand?: IncomeBand;
}

export type Category =
  | "case_management"
  | "home_care"
  | "day_care"
  | "professional"
  | "respite"
  | "transport"
  | "devices_home"
  | "community_station"
  | "home_doctor"
  | "meals";

export type Ownership = "public" | "nonprofit" | "company" | "clinic_pharmacy" | "private_facility" | "other";

export interface Provider {
  id: string;
  name: string;
  tier: "A" | "B" | "C";
  city: City;
  district: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  categories: Category[];
  services: string[];
  services_en: string[];
  serves_districts: string[];
  is_residential: boolean;
  beds: number;
  residents: number;
  open_beds: number;
  ownership: Ownership;
  contract_end: string;
  last_updated: string;
}

export interface District {
  city: City;
  city_key: CityKey;
  district: string;
  lat: number;
  lng: number;
  providers_located: number;
  providers_serving: number;
  transport_zone: Zone;
}

export interface CommunityPoint {
  name: string;
  city: string;
  district: string;
  address: string;
  type: string;
  source: string;
}

type CopayRates = Record<CopayType, number>;

export interface Rules {
  _version: string;
  _sources: Record<string, string>;
  _wording_rules: {
    never_say: string[];
    say_instead_meets_conditions: LText;
    say_instead_not_meeting: LText;
    amounts_without_level: LText;
  };
  eligibility: {
    identity_conditions: (LText & { id: string })[];
    if_not_eligible: LText;
    income_does_not_reduce_benefit: LText;
  };
  application_process: (LText & { step: number })[];
  discharge_planning: LText & { tip: LText };
  online_application: Record<City, { center_phone: string; apply_url: string; hotline_hours?: string; online_form_asks_for?: string[] }>;
  monthly_care_cap_ntd: Record<"2" | "3" | "4" | "5" | "6" | "7" | "8", number> & { _category: string };
  quota_rules: {
    carryover: LText;
    no_transfer: LText;
    over_cap: LText;
    reassessment: LText;
  };
  professional_services: LText & { examples: (LText & { code: string; price: string })[] };
  transport: {
    medical_DA01: LText;
    monthly_cap_ntd: Record<Zone, number>;
    community_BD03: LText;
  };
  devices_home_modification: {
    cycle: LText;
    group1: LText & { cap: number };
    group2: LText & { cap: number; home_modification_max: number; effective: string };
    prior_use_rules: (LText & { id: string })[];
    process: LText;
  };
  respite: {
    yearly_cap_ntd: { cms_2_6: number; cms_7_8: number };
    requires: LText;
    prices_ntd: (LText & { code: string; price: number; unit: string })[];
  };
  copay: {
    categories: Record<CopayType, LText & { pays: string }>;
    rates: Record<string, CopayRates>;
  };
  residential: {
    home_services_not_applicable: LText;
    subsidy: {
      amount: LText;
      eligible: LText;
      month_counting: LText;
      no_double: LText;
      how_to_apply: LText;
      not_eligible_facilities: LText;
    };
  };
  income_bands_2026: {
    _note: string;
    mapping: Record<Exclude<IncomeBand, "unknown">, LText & { copay: CopayType; copay_if_under_65?: CopayType }>;
    also_asset_tests: LText;
  } & Record<City, { min_living_cost: number; midlow_and_allowance_full: number; allowance_upper: number }>;
  tax_deduction: LText;
  hotlines: (LText & { number: string; verified: boolean })[];
  unverified_or_varies: string[];
}

export interface DemoCase {
  title_zh: string;
  title_en: string;
  answers: Answers;
  expected: Record<string, unknown>;
}

export interface DemoCases {
  case1: DemoCase;
  case2: DemoCase;
}
