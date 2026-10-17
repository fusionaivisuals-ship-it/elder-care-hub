import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Coffee,
  Hospital,
  Info,
  MapPinned,
  Pencil,
  Phone,
  Printer,
  Receipt,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { LoadState, Page, Section } from "@/components/Shell";
import { ActionPlan } from "@/components/plan/ActionPlan";

import { LevelPicker } from "@/components/plan/LevelPicker";
import { ProviderExplorer, useExplorerLocation } from "@/components/explorer/ProviderExplorer";
import { Callout } from "@/components/plan/PlanParts";
import { usePlan } from "@/context/PlanContext";
import { useData } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildCallScript } from "@/lib/callScript";
import {
  cityKeyOf,
  findDistrict,
  loadCommunity,
  loadDemoCases,
  loadDistricts,
  loadProviders,
  loadRules,
  nearestTierA,
  providersServing,
} from "@/lib/data";
import { ntd, ntdRange, pct } from "@/lib/i18n";
import { districtName, placeName } from "@/lib/places";
import { computePlan, incomeBandRanges, rate, type PlanResult } from "@/lib/planEngine";
import type { Answers, CommunityPoint, Level, Provider, Rules } from "@/lib/types";
import { cn } from "@/lib/utils";

const Plan = () => {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const { answers, setAnswers, setSelectedLevel, demo, setDemo } = usePlan();
  const demoParam = params.get("demo");
  const wantDemo = demoParam === "1" ? 1 : demoParam === "2" ? 2 : null;
  const demos = useData(() => (wantDemo ? loadDemoCases() : Promise.resolve(null)), [wantDemo]);
  useDocumentTitle(t("planTitle"));

  // ?demo=1|2 prefills the answers from data/demo-cases.json
  useEffect(() => {
    if (!wantDemo || !demos.data || demo === wantDemo) return;
    setAnswers(demos.data[wantDemo === 1 ? "case1" : "case2"].answers);
    setSelectedLevel(undefined);
    setDemo(wantDemo);
  }, [wantDemo, demos.data, demo, setAnswers, setSelectedLevel, setDemo]);

  if (wantDemo && demo !== wantDemo) {
    return (
      <Page>
        <LoadState error={demos.error} onRetry={demos.retry} />
      </Page>
    );
  }

  if (!answers) {
    return (
      <Page className="flex flex-col items-center justify-center gap-4 text-center">
        <ClipboardList className="h-10 w-10 text-primary" aria-hidden />
        <h1 className="text-2xl">{t("noAnswers")}</h1>
        <p className="text-muted-foreground">{t("noAnswersSub")}</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild className="min-h-12 px-6 text-base">
            <Link to="/start">{t("start")}</Link>
          </Button>
          <Button variant="outline" className="min-h-12 px-6 text-base" onClick={() => setParams({ demo: "1" })}>
            {t("demo1")}
          </Button>
          <Button variant="outline" className="min-h-12 px-6 text-base" onClick={() => setParams({ demo: "2" })}>
            {t("demo2")}
          </Button>
        </div>
      </Page>
    );
  }

  return <PlanView answers={answers} demo={demo} onSwitchDemo={(n) => setParams({ demo: String(n) })} />;
};

type Part = 1 | 2 | 3;

function PlanView({ answers, demo, onSwitchDemo }: { answers: Answers; demo: 1 | 2 | null; onSwitchDemo: (n: 1 | 2) => void }) {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const { selectedLevel, setSelectedLevel, setDraft, setWizardStep } = usePlan();
  // Assessed parents: their level is fixed; the picker only previews other levels for comparison
  const [compareLevel, setCompareLevel] = useState<Level | undefined>();
  const cityKey = cityKeyOf(answers.city);
  const data = useData(() => Promise.all([loadRules(), loadDistricts(), loadProviders(cityKey)]), [cityKey]);
  const community = useData(() => (answers.city === "新北市" ? loadCommunity() : Promise.resolve([] as CommunityPoint[])), [answers.city]);
  useEffect(() => setCompareLevel(undefined), [answers]);

  const computed = useMemo(() => {
    if (!data.data) return null;
    const [rules, districts, providers] = data.data;
    const zone = findDistrict(districts, answers.city, answers.district)?.transport_zone ?? (answers.city === "臺北市" ? "zone1" : "zone2");
    const plan = computePlan(answers, rules, { today: new Date(), zone, selectedLevel });
    const tierA = nearestTierA(providers, districts, answers.city, answers.district);
    const script = buildCallScript(answers, plan, rules, tierA);
    return { rules, districts, providers, plan, tierA, script };
  }, [data.data, answers, selectedLevel]);

  if (!computed) {
    return (
      <Page>
        <LoadState error={data.error} onRetry={data.retry} />
      </Page>
    );
  }
  const { rules, districts, providers, plan, tierA, script } = computed;
  const place = placeName(answers.city, answers.district, lang);
  // ① call & prepare · ② benefit estimate (only when there are benefits to estimate) · ③ nearby services
  const parts: Part[] = plan.showBenefits ? [1, 2, 3] : [1, 3];
  const wanted = Number(params.get("part")) as Part;
  const part: Part = parts.includes(wanted) ? wanted : 1;
  const goPart = (p: Part, tab?: string) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete("part");
    else next.set("part", String(p));
    if (tab) next.set("tab", tab);
    setParams(next);
    // land at the start of the chosen part (just under the sticky top bar), not at the top of the page
    requestAnimationFrame(() => {
      const nav = document.getElementById("plan-parts");
      if (nav) window.scrollTo({ top: nav.getBoundingClientRect().top + window.scrollY - 56 });
    });
  };
  const viewLevel = plan.assessed ? compareLevel ?? answers.level : selectedLevel;
  const chooseLevel = (l?: Level) => (plan.assessed ? setCompareLevel(l) : setSelectedLevel(l));

  const bannerTone = plan.banner.kind === "assessed" ? "success" : plan.banner.kind === "meets" ? "info" : "warning";
  const bannerIcon = plan.banner.kind === "assessed" ? <BadgeCheck className="h-6 w-6" /> : plan.banner.kind === "meets" ? <Info className="h-6 w-6" /> : <TriangleAlert className="h-6 w-6" />;

  return (
    <Page>
      {demo && (
        <div className="no-print mb-4 rounded-2xl bg-secondary p-2 text-sm" role="group" aria-label={t("demoMode")}>
          <p className="px-2 pb-1 font-semibold text-secondary-foreground">{t("demoMode")}</p>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map((n) => (
              <Button key={n} size="sm" variant={demo === n ? "default" : "ghost"} className="h-auto min-h-12 whitespace-normal py-2 leading-snug" onClick={() => onSwitchDemo(n)} aria-pressed={demo === n}>
                {t(n === 1 ? "demo1" : "demo2")}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">{t("planTitle")}</h1>
          <p className="text-muted-foreground">{t("planFor", { place })}</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="no-print min-h-12 shrink-0">
          <Link
            to="/start"
            onClick={() => {
              setDraft({ ...answers });
              setWizardStep(0);
            }}
          >
            <Pencil className="mr-1 h-4 w-4" aria-hidden />
            {t("editAnswers")}
          </Link>
        </Button>
      </div>

      {/* LOVABLE_AI_HOOK: explain-plan — AI summary card goes here (input: answers + plan; it must never change numbers) */}

      <div className="mt-5">
        <Callout tone={bannerTone} icon={bannerIcon} title={plan.banner.text[lang]} />
      </div>

      <AlertsRow plan={plan} />

      <nav id="plan-parts" aria-label={t("partsLabel")} className="no-print sticky top-14 z-10 -mx-4 mt-6 bg-background/95 px-4 py-2 backdrop-blur-sm">
          <div role="tablist" className={cn("grid gap-1 rounded-2xl bg-muted p-1", parts.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {parts.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                id={`part-tab-${p}`}
                aria-selected={part === p}
                aria-controls={`part-${p}`}
                onClick={() => goPart(p)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-xs font-semibold leading-tight transition-colors duration-150 sm:min-h-12 sm:flex-row sm:gap-2 sm:text-base",
                  part === p ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs", part === p ? "bg-primary text-primary-foreground" : "bg-border text-foreground")}>{p}</span>
                {t(p === 1 ? "part1Tab" : p === 2 ? "part2Tab" : "part3Tab")}
              </button>
            ))}
          </div>
        </nav>

      {/* Parts 1 and 2 stay in the DOM so the printed plan contains both; part 3 (maps) is screen-only */}
      <div id="part-1" role="tabpanel" aria-labelledby="part-tab-1" className={cn("mt-6", part !== 1 && "hidden print:block")}>
        <ActionPlan answers={answers} plan={plan} rules={rules} tierA={tierA} script={script} onOpenCommunity={() => goPart(3, "community")} />
        <Hotlines rules={rules} />
        {plan.showBenefits ? <NextPart onClick={() => goPart(2)} title={t("toPart2")} sub={t("toPart2Sub")} /> : <NextPart onClick={() => goPart(3)} title={t("toPart3")} sub={t("toPart3Sub")} />}
      </div>

      {plan.showBenefits && (
        <div id="part-2" role="tabpanel" aria-labelledby="part-tab-2" className={cn("mt-6", part !== 2 && "hidden print:block")}>
          <BenefitEstimate answers={answers} plan={plan} rules={rules} viewLevel={viewLevel} onChoose={chooseLevel} />
          <NextPart onClick={() => goPart(3)} title={t("toPart3")} sub={t("toPart3Sub")} />
          <Button variant="ghost" className="no-print mt-4 min-h-12" onClick={() => goPart(1)}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            {t("toPart1")}
          </Button>
        </div>
      )}

      {/* Mounted only while visible: Leaflet can't size a map inside a hidden element */}
      {part === 3 && (
        <div id="part-3" role="tabpanel" aria-labelledby="part-tab-3" className="no-print mt-6">
          <NearbyServices answers={answers} providers={providers} community={community.data ?? []} />
        </div>
      )}

      <div className="no-print mt-8 flex flex-col items-start gap-1">
        <Button variant="outline" className="min-h-12 text-base" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-5 w-5" aria-hidden />
          {t("printPlan")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("printHint")}</p>
      </div>

    </Page>
  );
}

function Hotlines({ rules }: { rules: Rules }) {
  const { t, lang } = useLang();
  return (
    <Section title={t("hotlinesTitle")} icon={<Phone className="h-5 w-5 text-primary" aria-hidden />}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rules.hotlines
          .filter((h) => h.number !== "1955") // foreign caregiver line: out of scope
          .map((h) => (
            <li key={h.number}>
              <a href={`tel:${h.number.replace(/\D/g, "")}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-secondary">
                <span className="text-sm">
                  {lang === "zh" ? h.zh : h.en}
                  {!h.verified && <span className="ml-1 text-xs text-muted-foreground">({t("unverified")})</span>}
                </span>
                <span className="whitespace-nowrap font-semibold text-primary">{h.number}</span>
              </a>
            </li>
          ))}
      </ul>
    </Section>
  );
}

function AlertsRow({ plan }: { plan: PlanResult }) {
  const { t } = useLang();
  if (!plan.alerts.length) return null;
  return (
    <div className="mt-4 space-y-3" role="region" aria-label="alerts">
      {plan.alerts.map((a) =>
        a.id === "carryover_reset" ? (
          <Callout key={a.id} tone="error" icon={<AlarmClock className="h-6 w-6" />} title={t("alertReset", { date: a.date!, n: a.daysLeft! })}>
            {t("alertResetSub")}
          </Callout>
        ) : a.id === "respite_unused" ? (
          <Callout key={a.id} tone="warning" icon={<Coffee className="h-6 w-6" />} title={t("alertRespite")}>
            {t("alertRespiteSub")}
            {plan.respite && ` · ${ntd(plan.respite.remaining)}`}
          </Callout>
        ) : (
          <Callout key={a.id} tone="info" icon={<Hospital className="h-6 w-6" />} title={t("alertDischarge")}>
            {t("alertDischargeSub")}
          </Callout>
        ),
      )}
    </div>
  );
}

/** Part 2: copay rates → level picker + guide → benefit details → tax. */
function BenefitEstimate({ answers, plan, rules, viewLevel, onChoose }: { answers: Answers; plan: PlanResult; rules: Rules; viewLevel?: Level; onChoose: (l?: Level) => void }) {
  const { t, tx, lang } = useLang();
  const band = answers.incomeBand;
  const typeNo = { type1: 1, type2: 2, type3: 3 }[plan.copayType];
  const zone = plan.transport?.zone ?? "zone1";
  const rates = [
    { label: t("copayCare"), r: rate(rules, "care_professional", answers.household) },
    { label: t("copayDevices"), r: rate(rules, "devices_home", answers.household) },
    { label: t("copayTransport"), r: rate(rules, `transport_${zone}`, answers.household) },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">{t("part2Intro")}</p>

      <section aria-labelledby="copay-h" className="print-card rounded-2xl bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="copay-h" className="text-lg">
            {t("copayTitle")}
          </h3>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold text-secondary-foreground">{t("copayTypeN", { n: typeNo })}</span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {rates.map((x) => (
            <li key={x.label} className="rounded-xl bg-muted/60 p-2 text-center">
              <span className="block text-2xl font-semibold text-primary">{pct(x.r)}</span>
              <span className="block text-xs leading-snug text-muted-foreground">{x.label}</span>
            </li>
          ))}
        </ul>
        {band && band !== "unknown" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("hhEstimate", {
              range: ntdRange(incomeBandRanges(rules, answers.city)[band], lang),
              type: t("copayTypeLabel", { n: typeNo, pct: pct(rate(rules, "care_professional", plan.copayType)) }),
            })}
          </p>
        ) : plan.householdUnknown ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("hhUnknownTip")}</p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">{tx(rules.eligibility.income_does_not_reduce_benefit)}</p>
      </section>

      <LevelPicker answers={answers} plan={plan} rules={rules} viewLevel={viewLevel} onChoose={onChoose} />


      <div className="print-card rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-1 flex items-center gap-1.5 font-semibold">
          <Receipt className="h-4 w-4 text-primary" aria-hidden />
          {t("taxTitle")}
        </p>
        <p className="text-sm text-muted-foreground">{tx(rules.tax_deduction)}</p>
        <a href={rules._sources.tax_deduction} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-10 items-center text-sm text-primary underline underline-offset-2">
          {t("source")}
        </a>
      </div>
    </div>
  );
}

function NextPart({ onClick, title, sub }: { onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print mt-8 flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-left text-primary-foreground shadow-soft transition-opacity duration-150 hover:opacity-95"
    >
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm opacity-90">{sub}</span>
      </span>
      <ArrowRight className="h-6 w-6 shrink-0" aria-hidden />
    </button>
  );
}

/** Part 3: what's around the family, then the map explorer (subsidized / community / self-pay). */
function NearbyServices({ answers, providers, community }: { answers: Answers; providers: Provider[]; community: CommunityPoint[] }) {
  const { t, lang } = useLang();
  const [loc, setLoc] = useExplorerLocation(answers);
  const serving = providersServing(providers, answers.district);
  const homes = providers.filter((p) => p.is_residential && p.district === answers.district);
  const openBeds = homes.reduce((s, p) => s + p.open_beds, 0);
  const communityCount = community.filter((c) => c.district === answers.district).length + providers.filter((p) => p.tier === "C" && p.district === answers.district).length;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{t("part3Intro")}</p>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="flex items-start gap-2 text-lg font-semibold">
          <MapPinned className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          {t("afterCallSub", { n: serving.length.toLocaleString("en-US"), district: districtName(answers.district, lang) })}
        </p>
        <ul className="mt-1 space-y-0.5 pl-7 text-sm text-muted-foreground">
          {homes.length > 0 && <li>{t("homesOpen", { homes: homes.length, beds: openBeds })}</li>}
          {communityCount > 0 && <li>{t("communityCount", { n: communityCount })}</li>}
        </ul>
      </div>
      <ProviderExplorer city={loc.city} district={loc.district} onLocation={setLoc} />
    </div>
  );
}

export default Plan;
