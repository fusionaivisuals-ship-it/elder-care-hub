import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BedDouble, Clock, Crosshair, Info, MapPin, Navigation, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/components/LanguageProvider";
import { LoadState, TierBadge } from "@/components/Shell";
import type { MapPlace } from "@/components/ProviderMap";
import { usePlan } from "@/context/PlanContext";
import { useData } from "@/hooks/useData";
import {
  CITIES,
  cityKeyOf,
  directionsUrls,
  distanceFrom,
  districtCentroid,
  getDistricts,
  getProvidersFor,
  loadCommunity,
  loadDistricts,
  loadProviders,
  loadRules,
  neededCategories,
  phoneDisplay,
  phoneHref,
  providersServing,
  sortByProximity,
  wantsResidential,
} from "@/lib/data";
import { CATEGORY_LABELS, OWNERSHIP_LABELS, TIER_LABELS } from "@/lib/i18n";
import { cityName, DISTRICT_EN, districtName, sortDistricts } from "@/lib/places";
import { identityOk } from "@/lib/planEngine";
import { KEYS, load, save } from "@/lib/storage";
import type { Answers, Category, City, CommunityPoint, District, Lang, LText, Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const ProviderMap = lazy(() => import("@/components/ProviderMap"));
const PAGE = 20;
type Filter = "suggested" | "all" | "residential" | Category;
const FILTER_CATS: Category[] = ["case_management", "home_care", "day_care", "professional", "respite", "transport", "devices_home", "home_doctor", "meals"];
export const TIER_COLOR = { A: "#0F5257", B: "#E9A23B", C: "#2E7D5B" } as const;
const FULL_COLOR = "#8A9499";
type Center = { lat: number; lng: number };

/** City/district shown in the explorer: starts at the family's district, remembers changes for this session. */
export function useExplorerLocation(answers: Answers | null) {
  const base = answers ? `${answers.city}${answers.district}` : "";
  const saved = load<{ base: string; city: City; district: string } | null>("session", KEYS.map, null);
  const [loc, setLoc] = useState<{ city: City; district: string }>(() =>
    saved && saved.base === base ? { city: saved.city, district: saved.district } : { city: answers?.city ?? "臺北市", district: answers?.district ?? "" },
  );
  useEffect(() => {
    save("session", KEYS.map, { base, ...loc });
  }, [base, loc]);
  return [loc, setLoc] as const;
}

/** The three provider views (subsidized / community / self-pay), each with a map and a list. */
export function ProviderExplorer({ city, district, onLocation }: { city: City; district: string; onLocation: (l: { city: City; district: string }) => void }) {
  const { t, lang } = useLang();
  const { answers, selectedLevel } = usePlan();
  const [params, setParams] = useSearchParams();
  const districts = useData(loadDistricts, []);

  useEffect(() => {
    if (!districts.data || district) return;
    onLocation({ city, district: getDistricts(districts.data, city)[0]?.district ?? "" });
  }, [districts.data, city, district, onLocation]);

  const level = answers?.status === "assessed" ? answers.level : selectedLevel;
  const communityFirst = !answers || !identityOk(answers) || answers.status !== "assessed" || answers.level === 1;
  const tabs = communityFirst ? (["community", "subsidized", "selfpay"] as const) : (["subsidized", "community", "selfpay"] as const);
  const tabParam = params.get("tab");
  const tab = tabs.includes(tabParam as (typeof tabs)[number]) ? (tabParam as string) : tabs[0];
  const tabLabel = { subsidized: t("tabSubsidized"), community: t("tabCommunity"), selfpay: t("tabSelfPay") };

  if (!districts.data) return <LoadState error={districts.error} onRetry={districts.retry} />;

  return (
    <div>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">{t("chooseLocation")}</legend>
        <label className="text-sm text-muted-foreground">
          {t("city")}
          <select
            className="mt-1 block min-h-12 w-full rounded-xl border bg-card px-3 text-base text-foreground"
            value={city}
            onChange={(e) => {
              const c = e.target.value as City;
              onLocation({ city: c, district: getDistricts(districts.data!, c)[0]?.district ?? "" });
            }}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {cityName(c, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          {t("district")}
          <select className="mt-1 block min-h-12 w-full rounded-xl border bg-card px-3 text-base text-foreground" value={district} onChange={(e) => onLocation({ city, district: e.target.value })}>
            {sortDistricts(getDistricts(districts.data, city), lang).map((d) => (
              <option key={d.district} value={d.district}>
                {lang === "en" ? `${DISTRICT_EN[d.district] ?? d.district} (${d.district})` : d.district}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {lang === "en" && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("autoTranslated")}
        </p>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next, { replace: true });
        }}
        className="mt-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1">
          {tabs.map((k) => (
            <TabsTrigger key={k} value={k} className="min-h-11 whitespace-normal rounded-xl px-1 text-sm leading-tight sm:text-base">
              {tabLabel[k]}
            </TabsTrigger>
          ))}
        </TabsList>
        {district && <CityData city={city} district={district} answers={answers} level={level} />}
      </Tabs>
      <p className="mt-6 text-sm text-muted-foreground">{t("mapCaption")}</p>
    </div>
  );
}

function CityData({ city, district, answers, level }: { city: City; district: string; answers: Answers | null; level?: number }) {
  const cityKey = cityKeyOf(city);
  const data = useData(() => Promise.all([loadProviders(cityKey), loadDistricts(), loadRules()]), [cityKey]);
  const community = useData(() => (city === "新北市" ? loadCommunity() : Promise.resolve([] as CommunityPoint[])), [city]);
  if (!data.data) return <LoadState error={data.error} onRetry={data.retry} />;
  const [providers, districts, rules] = data.data;
  const center = districtCentroid(districts, city, district);
  const answersMatch = !!answers && answers.city === city && answers.district === district;
  return (
    <>
      <TabsContent value="subsidized">
        <Subsidized providers={providers} districts={districts} city={city} district={district} center={center} answers={answersMatch ? answers : null} level={level} />
      </TabsContent>
      <TabsContent value="community">
        <Community providers={providers} community={community.data ?? []} city={city} district={district} center={center} />
      </TabsContent>
      <TabsContent value="selfpay">
        <SelfPay providers={providers} district={district} center={center} overCap={rules.quota_rules.over_cap} />
      </TabsContent>
    </>
  );
}

// ---------- shared pieces ----------

/** Map + "show on map" wiring for one list. */
function useMapFocus() {
  const ref = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<{ id?: string; nonce: number }>({ nonce: 0 });
  const show = (id: string) => {
    setFocus((f) => ({ id, nonce: f.nonce + 1 }));
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return { ref, focus, show };
}

function MapBlock({ mapRef, center, places, focus, legend }: { mapRef: React.RefObject<HTMLDivElement>; center?: Center; places: MapPlace[]; focus: { id?: string; nonce: number }; legend: { color: string; label: string }[] }) {
  const { t } = useLang();
  if (!center) return null;
  return (
    <div ref={mapRef} className="no-print space-y-2">
      <Suspense fallback={<div className="flex h-80 items-center justify-center rounded-2xl bg-muted text-muted-foreground sm:h-[28rem]">{t("mapLoading")}</div>}>
        <ProviderMap center={center} places={places} focusId={focus.id} focusNonce={focus.nonce} />
      </Suspense>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: l.color }} aria-hidden />
            {l.label}
          </span>
        ))}
        <span>· {t("mapCount", { n: places.length })}</span>
      </div>
    </div>
  );
}

export function NavButtons({ place, onShow }: { place: { name: string; address: string; lat?: number | null; lng?: number | null; phone?: string }; onShow?: () => void }) {
  const { t } = useLang();
  const nav = directionsUrls(place);
  return (
    <div className="no-print mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {place.phone && (
        <Button asChild className="min-h-12">
          <a href={phoneHref(place.phone)}>
            <Phone className="mr-1.5 h-4 w-4" aria-hidden />
            {t("call")}
          </a>
        </Button>
      )}
      {onShow && (
        <Button variant="outline" className="min-h-12" onClick={onShow}>
          <Crosshair className="mr-1.5 h-4 w-4" aria-hidden />
          {t("showOnMap")}
        </Button>
      )}
      <Button asChild variant="outline" className="min-h-12">
        <a href={nav.google} target="_blank" rel="noreferrer" aria-label={`${t("navGoogle")}: ${place.name}`}>
          <Navigation className="mr-1.5 h-4 w-4" aria-hidden />
          {t("navGoogle")}
        </a>
      </Button>
      <Button asChild variant="outline" className="min-h-12">
        <a href={nav.apple} target="_blank" rel="noreferrer" aria-label={`${t("navApple")}: ${place.name}`}>
          <Navigation className="mr-1.5 h-4 w-4" aria-hidden />
          {t("navApple")}
        </a>
      </Button>
    </div>
  );
}

function Bilingual({ zh, en, lang, className, small }: { zh: string; en?: string; lang: Lang; className?: string; small?: boolean }) {
  return (
    <>
      <span className={cn("block", className)}>{lang === "en" && en ? en : zh}</span>
      {lang === "en" && en && <span className={cn("block text-muted-foreground", small ? "text-xs" : "text-sm")}>{zh}</span>}
    </>
  );
}

function ProviderCard({ p, center, district, onShow }: { p: Provider; center?: Center; district: string; onShow?: () => void }) {
  const { t, lang } = useLang();
  const d = distanceFrom(p, center);
  return (
    <li className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={p.tier} label={TIER_LABELS[p.tier][lang]} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{OWNERSHIP_LABELS[p.ownership][lang]}</span>
        {d !== undefined && <span className="text-xs text-muted-foreground">{d.toFixed(1)} km</span>}
      </div>
      <p className="mt-2 font-semibold leading-snug">
        <Bilingual zh={p.name} en={p.name_en} lang={lang} small />
      </p>
      <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <Bilingual zh={p.address} en={p.address_en} lang={lang} small />
        </span>
      </div>
      {p.district !== district && <p className="mt-1 text-xs text-muted-foreground">{t("servesDistrict", { district: districtName(p.district, lang) })}</p>}
      <p className="mt-2 text-sm">{(lang === "zh" ? p.services : p.services_en).join(lang === "zh" ? "、" : ", ")}</p>
      {p.is_residential && p.beds > 0 && (
        <p className={cn("mt-1 flex items-center gap-1 text-sm font-semibold", p.open_beds > 0 ? "text-success" : "text-muted-foreground")}>
          <BedDouble className="h-4 w-4" aria-hidden />
          {t("openBeds", { open: p.open_beds, beds: p.beds })}
        </p>
      )}
      {p.phone && <p className="mt-1 text-sm text-muted-foreground">{phoneDisplay(p.phone)}</p>}
      <NavButtons place={p} onShow={p.lat != null && onShow ? onShow : undefined} />
    </li>
  );
}

function PagedList<T>({ items, render }: { items: T[]; render: (x: T) => React.ReactNode }) {
  const { t } = useLang();
  const [n, setN] = useState(PAGE);
  useEffect(() => setN(PAGE), [items]);
  return (
    <>
      <ul className="space-y-3">{items.slice(0, n).map(render)}</ul>
      {items.length > n && (
        <Button variant="outline" className="mt-3 min-h-12 w-full" onClick={() => setN(n + PAGE)}>
          {t("showMore")} ({items.length - n})
        </Button>
      )}
    </>
  );
}

function toPlace(p: Provider, lang: Lang, color: string, detail: string): MapPlace | null {
  if (p.lat == null || p.lng == null) return null;
  return { id: p.id, name: p.name, name_en: p.name_en, address: p.address, address_en: p.address_en, lat: p.lat, lng: p.lng, phone: p.phone, color, detail, big: p.tier === "A" };
}

const servicesLine = (p: Provider, lang: Lang) => `${p.tier} · ${TIER_LABELS[p.tier][lang]} · ${p.categories.map((c) => CATEGORY_LABELS[c][lang]).join(lang === "zh" ? "、" : ", ")}`;

// ---------- tabs ----------

function Subsidized({
  providers,
  districts,
  city,
  district,
  center,
  answers,
  level,
}: {
  providers: Provider[];
  districts: District[];
  city: City;
  district: string;
  center?: Center;
  answers: Answers | null;
  level?: number;
}) {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>(answers ? "suggested" : "all");
  const [wide, setWide] = useState(false);
  const { ref, focus, show } = useMapFocus();
  useEffect(() => {
    setWide(false);
    setFilter(answers ? "suggested" : "all");
  }, [district, answers]);

  const base = useMemo(() => sortByProximity(wide ? providers : providersServing(providers, district), district, center), [providers, district, center, wide]);

  // Same rules as getProvidersFor (docs/02 §9), applied to the current pool (district, or whole city when widened)
  const suggested = useMemo(() => {
    if (!answers) return [];
    if (!wide) return getProvidersFor(providers, districts, answers, level);
    const cats = new Set(neededCategories(answers));
    const res = wantsResidential(answers, level);
    return base.filter((p) => p.categories.some((c) => cats.has(c)) || (res && p.is_residential));
  }, [answers, providers, districts, level, wide, base]);

  const matches = (f: Filter, p: Provider) => (f === "all" || f === "suggested" ? true : f === "residential" ? p.is_residential : p.categories.includes(f));
  const list = filter === "suggested" ? suggested : base.filter((p) => matches(filter, p));
  const chips: { id: Filter; label: string; count: number }[] = [
    ...(answers ? [{ id: "suggested" as Filter, label: t("filterSuggested"), count: suggested.length }] : []),
    { id: "all" as Filter, label: t("filterAll"), count: base.length },
    ...FILTER_CATS.map((c) => ({ id: c as Filter, label: CATEGORY_LABELS[c][lang], count: base.filter((p) => p.categories.includes(c)).length })),
    { id: "residential" as Filter, label: t("filterResidential"), count: base.filter((p) => p.is_residential).length },
  ].filter((c) => c.count > 0 || c.id === filter);
  const places = list.map((p) => toPlace(p, lang, TIER_COLOR[p.tier], servicesLine(p, lang))).filter(Boolean) as MapPlace[];

  return (
    <div className="mt-4 space-y-4">
      <div className="no-print -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t("filterAll")}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors duration-150", filter === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40")}
          >
            {c.label} {c.count}
          </button>
        ))}
      </div>
      <MapBlock
        mapRef={ref}
        center={center}
        places={places}
        focus={focus}
        legend={(["A", "B", "C"] as const).map((k) => ({ color: TIER_COLOR[k], label: `${k} ${TIER_LABELS[k][lang]}` }))}
      />
      <p className="font-semibold">
        {t("resultsCount", { n: list.length.toLocaleString("en-US") })}
        {wide && <span className="ml-2 font-normal text-muted-foreground">{t("widened")}</span>}
      </p>
      {list.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p>{t("emptyFilter")}</p>
          {!wide && (
            <Button className="mt-3 min-h-12" onClick={() => setWide(true)}>
              {t("widenCity")} ({cityName(city, lang)})
            </Button>
          )}
        </div>
      ) : (
        <PagedList items={list} render={(p) => <ProviderCard key={p.id} p={p} center={center} district={district} onShow={() => show(p.id)} />} />
      )}
    </div>
  );
}

function Community({ providers, community, city, district, center }: { providers: Provider[]; community: CommunityPoint[]; city: City; district: string; center?: Center }) {
  const { t, lang } = useLang();
  const { ref, focus, show } = useMapFocus();
  const points = community.filter((c) => c.district === district);
  const serving = providersServing(providers, district);
  const cStations = sortByProximity(serving.filter((p) => p.tier === "C"), district, center);
  const familyDaycare = sortByProximity(
    serving.filter((p) => p.tier !== "C" && p.services.some((s) => s.includes("家庭托顧"))),
    district,
    center,
  );
  const FAMILY_COLOR = "#E9A23B";
  const places = [
    ...cStations.map((p) => toPlace(p, lang, TIER_COLOR.C, t("cStations"))),
    ...familyDaycare.map((p) => toPlace(p, lang, FAMILY_COLOR, t("familyDaycare"))),
  ].filter(Boolean) as MapPlace[];

  return (
    <div className="mt-4 space-y-6">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
        <Users className="h-4 w-4" aria-hidden />
        {t("noAssessment")}
      </p>

      {places.length > 0 && (
        <MapBlock
          mapRef={ref}
          center={center}
          places={places}
          focus={focus}
          legend={[
            { color: TIER_COLOR.C, label: t("cStations") },
            { color: FAMILY_COLOR, label: t("familyDaycare") },
          ]}
        />
      )}

      {cStations.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg">
            {t("cStations")} · {cStations.length}
          </h3>
          <PagedList items={cStations} render={(p) => <ProviderCard key={p.id} p={p} center={center} district={district} onShow={() => show(p.id)} />} />
        </section>
      )}

      {familyDaycare.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg">
            {t("familyDaycare")} · {familyDaycare.length}
          </h3>
          <PagedList items={familyDaycare} render={(p) => <ProviderCard key={p.id} p={p} center={center} district={district} onShow={() => show(p.id)} />} />
        </section>
      )}

      {city === "臺北市" && <p className="rounded-2xl bg-secondary p-4 text-secondary-foreground">{t("taipeiCommunityNote")}</p>}

      {points.length > 0 && (
        <section>
          <h3 className="text-lg">
            {t("communityCenters")} · {points.length}
          </h3>
          <p className="text-sm text-muted-foreground">{t("communityCentersSub")}</p>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">{t("noCoordsNote")}</p>
          <PagedList
            items={points}
            render={(c) => (
              <li key={c.name + c.address} className="rounded-2xl bg-card p-4 shadow-soft">
                <p className="font-semibold leading-snug">
                  <Bilingual zh={c.name} en={c.name_en} lang={lang} small />
                </p>
                <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <Bilingual zh={c.address} en={c.address_en} lang={lang} small />
                  </span>
                </div>
                <NavButtons place={c} />
              </li>
            )}
          />
        </section>
      )}

      {points.length === 0 && cStations.length === 0 && familyDaycare.length === 0 && city !== "臺北市" && <p className="text-muted-foreground">{t("noneHere")}</p>}
    </div>
  );
}

function SelfPay({ providers, district, center, overCap }: { providers: Provider[]; district: string; center?: Center; overCap: LText }) {
  const { t, tx, lang } = useLang();
  const { ref, focus, show } = useMapFocus();
  const serving = providersServing(providers, district);
  const home = serving.filter((p) => p.categories.includes("home_care")).length;
  const day = serving.filter((p) => p.categories.includes("day_care")).length;
  const homes = providers
    .filter((p) => p.is_residential && p.district === district)
    .sort((a, b) => b.open_beds - a.open_beds || (distanceFrom(a, center) ?? 0) - (distanceFrom(b, center) ?? 0));
  const places = homes
    .map((p) => toPlace(p, lang, p.open_beds > 0 ? TIER_COLOR.C : FULL_COLOR, t("openBeds", { open: p.open_beds, beds: p.beds })))
    .filter(Boolean) as MapPlace[];

  return (
    <div className="mt-4 space-y-6">
      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" aria-hidden />
          {t("selfPayExtraTitle")}
        </h3>
        <p className="mt-2">{t("selfPayExtraBody", { home, day })}</p>
        <p className="mt-2 text-sm text-muted-foreground">{tx(overCap)}</p>
      </section>
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg">
          <BedDouble className="h-5 w-5 text-primary" aria-hidden />
          {t("selfPayHomesTitle")} · {homes.length}
        </h3>
        <p className="text-sm text-muted-foreground">{t("selfPayHomesBody", { district: districtName(district, lang) })}</p>
        {places.length > 0 && (
          <MapBlock
            mapRef={ref}
            center={center}
            places={places}
            focus={focus}
            legend={[
              { color: TIER_COLOR.C, label: t("legendOpenBeds") },
              { color: FULL_COLOR, label: t("legendFull") },
            ]}
          />
        )}
        {homes.length ? (
          <PagedList items={homes} render={(p) => <ProviderCard key={p.id} p={p} center={center} district={district} onShow={() => show(p.id)} />} />
        ) : (
          <p className="text-muted-foreground">{t("noneHere")}</p>
        )}
      </section>
      <p className="text-sm text-muted-foreground">{t("selfPayNoListing")}</p>
    </div>
  );
}
