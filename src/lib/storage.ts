// Small, failure-safe wrappers around browser storage (private mode or blocked storage must never break the app).
// - localStorage: preferences only (language).
// - sessionStorage: the family's answers, so a refresh keeps their place. It is cleared when the tab closes
//   and never leaves the device (CLAUDE.md §3 privacy).

type Area = "local" | "session";

function area(a: Area): Storage | undefined {
  try {
    return a === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function load<T>(a: Area, key: string, fallback: T): T {
  try {
    const raw = area(a)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(a: Area, key: string, value: unknown): void {
  try {
    if (value === undefined || value === null) area(a)?.removeItem(key);
    else area(a)?.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or storage blocked: the app keeps working in memory
  }
}

export const KEYS = {
  lang: "caremap.lang",
  plan: "caremap.plan.v1",
  map: "caremap.map.v1",
  scroll: "caremap.scroll.v1",
} as const;

/** Removes everything CareMap saved about the family (language preference is kept). */
export function clearSession(): void {
  for (const k of [KEYS.plan, KEYS.map, KEYS.scroll]) save("session", k, undefined);
}
