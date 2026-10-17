// Data layer: fetches static JSON from /data (public/data) on the client, with in-memory caching.
// Pure helpers below take the loaded arrays so they can be unit-tested without fetch.
import type { Answers, Category, City, CityKey, CommunityPoint, DemoCases, District, Provider, Rules } from "./types";

const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${path} (${r.status})`);
      return r.json();
    });
    // Don't cache failures, so a retry can succeed
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path) as Promise<T>;
}

export const loadRules = () => loadJson<Rules>("/data/ltc_rules.json");
export const loadDistricts = () => loadJson<District[]>("/data/districts.json");
export const loadProviders = (cityKey: CityKey) => loadJson<Provider[]>(`/data/providers-${cityKey}.json`);
export const loadCommunity = () => loadJson<CommunityPoint[]>("/data/community-new-taipei.json");
export const loadDemoCases = () => loadJson<DemoCases>("/data/demo-cases.json");

export const CITIES: City[] = ["臺北市", "新北市"];
export const cityKeyOf = (city: City): CityKey => (city === "臺北市" ? "taipei" : "new-taipei");

export function getDistricts(districts: District[], city: City): District[] {
  return districts.filter((d) => d.city === city);
}

export function findDistrict(districts: District[], city: City, district: string): District | undefined {
  return districts.find((d) => d.city === city && d.district === district);
}

export function districtCentroid(districts: District[], city: City, district: string): { lat: number; lng: number } | undefined {
  const d = findDistrict(districts, city, district);
  return d ? { lat: d.lat, lng: d.lng } : undefined;
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function distanceFrom(p: Provider, c?: { lat: number; lng: number }): number | undefined {
  if (!c || p.lat == null || p.lng == null) return undefined;
  return haversineKm(c.lat, c.lng, p.lat, p.lng);
}

/** Providers located in, or contracted to serve, the district. */
export function providersServing(providers: Provider[], district: string): Provider[] {
  return providers.filter((p) => p.district === district || p.serves_districts.includes(district));
}

/** Located-in-district first, then by distance to the centroid (unknown coordinates last). */
export function sortByProximity(list: Provider[], district: string, c?: { lat: number; lng: number }): Provider[] {
  return [...list].sort((a, b) => {
    const ia = a.district === district ? 0 : 1;
    const ib = b.district === district ? 0 : 1;
    if (ia !== ib) return ia - ib;
    return (distanceFrom(a, c) ?? Infinity) - (distanceFrom(b, c) ?? Infinity);
  });
}

/** Which provider categories the family needs (docs/02 §9). */
export function neededCategories(answers: Pick<Answers, "needs" | "living">): Category[] {
  const n = new Set(answers.needs);
  const cats: Category[] = ["case_management"];
  if (answers.living === "home_family") cats.push("respite");
  if (n.has("walking_falls") || n.has("bathing") || n.has("home_unsafe") || n.has("out_of_bed") || n.has("toileting")) cats.push("devices_home");
  if (n.has("appointments")) cats.push("transport");
  if (answers.living !== "residential") cats.push("home_care", "day_care");
  if (n.has("walking_falls") || n.has("out_of_bed") || n.has("eating")) cats.push("professional");
  return cats;
}

export function wantsResidential(answers: Pick<Answers, "living">, level?: number): boolean {
  return answers.living === "residential" || (level ?? 0) >= 4;
}

/** docs/02 §9: providers matching the family's needs, sorted by proximity. */
export function getProvidersFor(
  providers: Provider[],
  districts: District[],
  answers: Pick<Answers, "city" | "district" | "needs" | "living">,
  level?: number,
): Provider[] {
  const cats = new Set(neededCategories(answers));
  const residential = wantsResidential(answers, level);
  const base = providersServing(providers, answers.district);
  const matched = base.filter((p) => p.categories.some((c) => cats.has(c)) || (residential && p.is_residential));
  return sortByProximity(matched, answers.district, districtCentroid(districts, answers.city, answers.district));
}

/** Nearest tier-A center located in the district (tie → first); fallback: nearest A in the city. */
export function nearestTierA(providers: Provider[], districts: District[], city: City, district: string): Provider | undefined {
  const c = districtCentroid(districts, city, district);
  if (!c) return undefined;
  const pick = (list: Provider[]) => {
    let best: Provider | undefined;
    let bestD = Infinity;
    for (const p of list) {
      const d = distanceFrom(p, c);
      if (d !== undefined && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  };
  const inCity = providers.filter((p) => p.tier === "A" && p.city === city);
  return pick(inCity.filter((p) => p.district === district)) ?? pick(inCity);
}

/** Taiwan phone numbers in the file sometimes omit the 02 area code. */
export function phoneDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^0/.test(t) || /^\d{4}$/.test(t) ? t : `02-${t}`;
}

export function phoneHref(raw: string): string {
  return `tel:${phoneDisplay(raw).replace(/[^\d+]/g, "")}`;
}

export function mapsSearchUrl(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
