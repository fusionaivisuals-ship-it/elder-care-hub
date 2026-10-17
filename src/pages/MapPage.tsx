import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BedDouble, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/components/LanguageProvider";
import { LoadState, Page, TierBadge } from "@/components/Shell";
import { CallButton } from "@/components/plan/CallFirst";
import { usePlan } from "@/context/PlanContext";
import { useData } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  CITIES,
  cityKeyOf,
  distanceFrom,
  districtCentroid,
  getDistricts,
  getProvidersFor,
  loadCommunity,
  loadDistricts,
  loadProviders,
  loadRules,
  mapsSearchUrl,
  neededCategories,
  providersServing,
  sortByProximity,
  wantsResidential,
} from "@/lib/data";
import { CATEGORY_LABELS, OWNERSHIP_LABELS, TIER_LABELS } from "@/lib/i18n";
import { identityOk } from "@/lib/planEngine";
import type { Category, City, CommunityPoint, District, Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const ProviderMap = lazy(() => import("@/components/ProviderMap"));
const PAGE = 20;
type Filter = "suggested" | "all" | "residential" | Category;
const FILTER_CATS: Category[] = ["case_management", "home_care", "day_care", "professional", "respite", "transport", "devices_home", "home_doctor", "meals"];

const MapPage = () => {
  const { t } = useLang();
  const { answers, selectedLevel } = usePlan();
  const [params, setParams] = useSearchParams();
  const districts = useData(loadDistricts, []);
  const [city, setCity] = useState<City>(answers?.city ?? "臺北市");
  const [district, setDistrict] = useState<string>(answers?.district ?? "");
  useDocumentTitle(t("mapTitle"));

  useEffect(() => {
    if (!districts.data || district) return;
    setDistrict(getDistricts(districts.data, city)[0]?.district ?? "");
  }, [districts.data, city, district]);

  const level = answers?.status === "assessed" ? answers.level : selectedLevel;
  const communityFirst = !answers || !identityOk(answers) || answers.status !== "assessed" || answers.level === 1;
  const tab = params.get("tab") ?? (communityFirst ? "community" : "subsidized");
  const tabs = communityFirst ? (["community", "subsidized", "selfpay"] as const) : (["subsidized", "community", "selfpay"] as const);
  const tabLabel = { subsidized: t("tabSubsidized"), community: t("tabCommunity"), selfpay: t("tabSelfPay") };

  return (
    <Page>
      <Button asChild variant="ghost" size="sm" className="no-print -ml-2 mb-2 min-h-12">
        <Link to={answers ? "/plan" : "/"}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          {answers ? t("planTitle") : t("home")}
        </Link>
      </Button>
      <h1 className="text-2xl sm:text-3xl">{t("mapTitle")}</h1>

      {!districts.data ? (
        <LoadState error={districts.error} onRetry={districts.retry} />
      ) : (
        <>
          <fieldset className="mt-4 grid grid-cols-2 gap-2">
            <legend className="sr-only">{t("chooseLocation")}</legend>
            <label className="text-sm text-muted-foreground">
              {t("city")}
              <select
                className="mt-1 block min-h-12 w-full rounded-xl border bg-card px-3 text-base text-foreground"
                value={city}
                onChange={(e) => {
                  const c = e.target.value as City;
                  setCity(c);
                  setDistrict(getDistricts(districts.data!, c)[0]?.district ?? "");
                }}
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              {t("district")}
              <select className="mt-1 block min-h-12 w-full rounded-xl border bg-card px-3 text-base text-foreground" value={district} onChange={(e) => setDistrict(e.target.value)}>
                {getDistricts(districts.data, city).map((d) => (
                  <option key={d.district}>{d.district}</option>
                ))}
              </select>
            </label>
          </fieldset>

          <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="mt-5">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1">
              {tabs.map((k) => (
                <TabsTrigger key={k} value={k} className="min-h-11 rounded-xl px-1 text-sm sm:text-base">
                  {tabLabel[k]}
                </TabsTrigger>
              ))}
            </TabsList>
            {district && (
              <CityData city={city} district={district} answersMatch={!!answers && answers.city === city && answers.district === district} level={level} />
            )}
          </Tabs>
          <p className="mt-6 text-sm text-muted-foreground">{t("mapCaption")}</p>
        </>
      )}
    </Page>
  );
};

function CityData({ city, district, answersMatch, level }: { city: City; district: string; answersMatch: boolean; level?: number }) {
  const cityKey = cityKeyOf(city);
  const data = useData(() => Promise.all([loadProviders(cityKey), loadDistricts(), loadRules()]), [cityKey]);
  const community = useData(() => (city === "新北市" ? loadCommunity() : Promise.resolve([] as CommunityPoint[])), [city]);
  if (!data.data) return <LoadState error={data.error} onRetry={data.retry} />;
  const [providers, districts, rules] = data.data;
  const center = districtCentroid(districts, city, district);
  return (
    <>
      <TabsContent value="subsidized">
        <Subsidized providers={providers} districts={districts} city={city} district={district} center={center} answersMatch={answersMatch} level={level} />
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

function ProviderItem({ p, center, district }: { p: Provider; center?: { lat: number; lng: number }; district: string }) {
  const { t, lang } = useLang();
  const d = distanceFrom(p, center);
  return (
    <li className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={p.tier} label={TIER_LABELS[p.tier][lang]} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{OWNERSHIP_LABELS[p.ownership][lang]}</span>
        {d !== undefined && <span className="text-xs text-muted-foreground">{d.toFixed(1)} km</span>}
      </div>
      <p className="mt-2 font-semibold leading-snug">{p.name}</p>
      <a href={mapsSearchUrl(p.address)} target="_blank" rel="noreferrer" className="mt-1 flex min-h-12 items-center gap-1 text-sm text-muted-foreground hover:underline">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {p.address}
      </a>
      {p.district !== district && <p className="mt-1 text-xs text-muted-foreground">{t("servesDistrict", { district: p.district })}</p>}
      <p className="mt-2 text-sm">{(lang === "zh" ? p.services : p.services_en).join("、")}</p>
      {p.is_residential && p.beds > 0 && (
        <p className={cn("mt-1 flex items-center gap-1 text-sm font-semibold", p.open_beds > 0 ? "text-success" : "text-muted-foreground")}>
          <BedDouble className="h-4 w-4" aria-hidden />
          {t("openBeds", { open: p.open_beds, beds: p.beds })}
        </p>
      )}
      {p.phone && (
        <div className="mt-3">
          <CallButton phone={p.phone} variant="outline" />
        </div>
      )}
    </li>
  );
}

function PagedList({ items, center, district }: { items: Provider[]; center?: { lat: number; lng: number }; district: string }) {
  const { t } = useLang();
  const [n, setN] = useState(PAGE);
  useEffect(() => setN(PAGE), [items]);
  return (
    <>
      <ul className="space-y-3">
        {items.slice(0, n).map((p) => (
          <ProviderItem key={p.id} p={p} center={center} district={district} />
        ))}
      </ul>
      {items.length > n && (
        <Button variant="outline" className="mt-3 min-h-12 w-full" onClick={() => setN(n + PAGE)}>
          {t("showMore")} ({items.length - n})
        </Button>
      )}
    </>
  );
}

function Subsidized({
  providers,
  districts,
  city,
  district,
  center,
  answersMatch,
  level,
}: {
  providers: Provider[];
  districts: District[];
  city: City;
  district: string;
  center?: { lat: number; lng: number };
  answersMatch: boolean;
  level?: number;
}) {
  const { t, lang } = useLang();
  const { answers } = usePlan();
  const [filter, setFilter] = useState<Filter>(answersMatch ? "suggested" : "all");
  const [wide, setWide] = useState(false);
  useEffect(() => {
    setWide(false);
    setFilter(answersMatch ? "suggested" : "all");
  }, [district, answersMatch]);

  const base = useMemo(() => {
    const pool = wide ? providers : providersServing(providers, district);
    return sortByProximity(pool, district, center);
  }, [providers, district, center, wide]);

  // Same rules as getProvidersFor (docs/02 §9), applied to the current pool (district, or whole city when widened)
  const suggested = useMemo(() => {
    if (!answersMatch || !answers) return [];
    if (!wide) return getProvidersFor(providers, districts, answers, level);
    const cats = new Set(neededCategories(answers));
    const res = wantsResidential(answers, level);
    return base.filter((p) => p.categories.some((c) => cats.has(c)) || (res && p.is_residential));
  }, [answersMatch, answers, providers, districts, level, wide, base]);

  const matches = (f: Filter, p: Provider) => (f === "all" ? true : f === "residential" ? p.is_residential : f === "suggested" ? true : p.categories.includes(f));
  const list = filter === "suggested" ? suggested : base.filter((p) => matches(filter, p));
  const chips: { id: Filter; label: string; count: number }[] = [
    ...(answersMatch ? [{ id: "suggested" as Filter, label: t("filterSuggested"), count: suggested.length }] : []),
    { id: "all" as Filter, label: t("filterAll"), count: base.length },
    ...FILTER_CATS.map((c) => ({ id: c as Filter, label: CATEGORY_LABELS[c][lang], count: base.filter((p) => p.categories.includes(c)).length })),
    { id: "residential" as Filter, label: t("filterResidential"), count: base.filter((p) => p.is_residential).length },
  ].filter((c) => c.count > 0 || c.id === filter);

  return (
    <div className="mt-4 space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t("filterAll")}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors duration-150",
              filter === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
            )}
          >
            {c.label} {c.count}
          </button>
        ))}
      </div>
      {center && (
        <Suspense fallback={<div className="flex h-72 items-center justify-center rounded-2xl bg-muted text-muted-foreground">{t("mapLoading")}</div>}>
          <ProviderMap center={center} providers={list} />
        </Suspense>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{t("resultsCount", { n: list.length.toLocaleString("en-US") })}</span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-tier-a" /> A {TIER_LABELS.A[lang]}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-tier-b" /> B {TIER_LABELS.B[lang]}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-tier-c" /> C {TIER_LABELS.C[lang]}
        </span>
        {wide && <span>{t("widened")}</span>}
      </div>
      {list.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p>{t("emptyFilter")}</p>
          {!wide && (
            <Button className="mt-3 min-h-12" onClick={() => setWide(true)}>
              {t("widenCity")} ({city})
            </Button>
          )}
        </div>
      ) : (
        <PagedList items={list} center={center} district={district} />
      )}
    </div>
  );
}

function Community({ providers, community, city, district, center }: { providers: Provider[]; community: CommunityPoint[]; city: City; district: string; center?: { lat: number; lng: number } }) {
  const { t } = useLang();
  const points = community.filter((c) => c.district === district);
  const cStations = sortByProximity(providersServing(providers, district).filter((p) => p.tier === "C"), district, center);
  const familyDaycare = sortByProximity(
    providersServing(providers, district).filter((p) => p.services.some((s) => s.includes("家庭托顧"))),
    district,
    center,
  );

  return (
    <div className="mt-4 space-y-6">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
        <Users className="h-4 w-4" aria-hidden />
        {t("noAssessment")}
      </p>

      {city === "臺北市" && <p className="rounded-2xl bg-secondary p-4 text-secondary-foreground">{t("taipeiCommunityNote")}</p>}

      {points.length > 0 && (
        <section>
          <h2 className="text-lg">
            {t("communityCenters")} · {points.length}
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">{t("communityCentersSub")}</p>
          <ul className="space-y-2">
            {points.map((c) => (
              <li key={c.name + c.address} className="rounded-2xl bg-card p-4 shadow-soft">
                <p className="font-semibold leading-snug">{c.name}</p>
                <a href={mapsSearchUrl(c.address || c.name)} target="_blank" rel="noreferrer" className="mt-1 flex min-h-12 items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {c.address || t("openInMaps")}
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cStations.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">
            {t("cStations")} · {cStations.length}
          </h2>
          <PagedList items={cStations} center={center} district={district} />
        </section>
      )}

      {familyDaycare.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">
            {t("familyDaycare")} · {familyDaycare.length}
          </h2>
          <PagedList items={familyDaycare} center={center} district={district} />
        </section>
      )}

      {points.length === 0 && cStations.length === 0 && familyDaycare.length === 0 && city !== "臺北市" && <p className="text-muted-foreground">{t("noneHere")}</p>}
    </div>
  );
}

function SelfPay({ providers, district, center, overCap }: { providers: Provider[]; district: string; center?: { lat: number; lng: number }; overCap: { zh: string; en: string } }) {
  const { t, tx } = useLang();
  const serving = providersServing(providers, district);
  const home = serving.filter((p) => p.categories.includes("home_care")).length;
  const day = serving.filter((p) => p.categories.includes("day_care")).length;
  const homes = providers
    .filter((p) => p.is_residential && p.district === district)
    .sort((a, b) => b.open_beds - a.open_beds || (distanceFrom(a, center) ?? 0) - (distanceFrom(b, center) ?? 0));

  return (
    <div className="mt-4 space-y-6">
      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" aria-hidden />
          {t("selfPayExtraTitle")}
        </h2>
        <p className="mt-2">{t("selfPayExtraBody", { home, day })}</p>
        <p className="mt-2 text-sm text-muted-foreground">{tx(overCap)}</p>
      </section>
      <section>
        <h2 className="flex items-center gap-2 text-lg">
          <BedDouble className="h-5 w-5 text-primary" aria-hidden />
          {t("selfPayHomesTitle")} · {homes.length}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("selfPayHomesBody", { district })}</p>
        {homes.length ? <PagedList items={homes} center={center} district={district} /> : <p className="text-muted-foreground">{t("noneHere")}</p>}
      </section>
      <p className="text-sm text-muted-foreground">{t("selfPayNoListing")}</p>
    </div>
  );
}

export default MapPage;
