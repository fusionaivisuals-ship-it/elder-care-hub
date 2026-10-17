import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Accessibility,
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bus,
  ClipboardList,
  Coffee,
  HandHeart,
  Home,
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
import { LoadState, Page, Section, TierBadge } from "@/components/Shell";
import { ActionPlan } from "@/components/plan/ActionPlan";
import { CallButton } from "@/components/plan/CallFirst";
import { LevelPicker } from "@/components/plan/LevelPicker";
import { BenefitCard, Callout, MoneySplit } from "@/components/plan/PlanParts";
import { usePlan } from "@/context/PlanContext";
import { useData } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildCallScript } from "@/lib/callScript";
import {
  cityKeyOf,
  distanceFrom,
  districtCentroid,
  findDistrict,
  getProvidersFor,
  loadCommunity,
  loadDemoCases,
  loadDistricts,
  loadProviders,
  loadRules,
  nearestTierA,
  providersServing,
} from "@/lib/data";
import { CATEGORY_LABELS, ntd, ntdRange, pct, TIER_LABELS } from "@/lib/i18n";
import { districtName, placeName } from "@/lib/places";
import { computePlan, incomeBandRanges, rate, type PlanResult } from "@/lib/planEngine";
import type { Answers, CommunityPoint, District, Level, Provider, Rules } from "@/lib/types";
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

function PlanView({ answers, demo, onSwitchDemo }: { answers: Answers; demo: 1 | 2 | null; onSwitchDemo: (n: 1 | 2) => void }) {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const { selectedLevel, setSelectedLevel, setDraft } = usePlan();
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
  const hasParts = plan.showBenefits;
  const part = hasParts && params.get("part") === "2" ? 2 : 1;
  const goPart = (p: 1 | 2) => {
    const next = new URLSearchParams(params);
    if (p === 2) next.set("part", "2");
    else next.delete("part");
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
          <Link to="/start" onClick={() => setDraft({ ...answers })}>
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

      {hasParts && (
        <nav id="plan-parts" aria-label={t("partsLabel")} className="no-print sticky top-14 z-10 -mx-4 mt-6 bg-background/95 px-4 py-2 backdrop-blur-sm">
          <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            {([1, 2] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                id={`part-tab-${p}`}
                aria-selected={part === p}
                aria-controls={`part-${p}`}
                onClick={() => goPart(p)}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors duration-150 sm:text-base",
                  part === p ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs", part === p ? "bg-primary text-primary-foreground" : "bg-border text-foreground")}>{p}</span>
                {t(p === 1 ? "part1Tab" : "part2Tab")}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Both parts stay in the DOM so the printed plan contains everything */}
      <div id="part-1" role={hasParts ? "tabpanel" : undefined} aria-labelledby={hasParts ? "part-tab-1" : undefined} className={cn("mt-6", part !== 1 && "hidden print:block")}>
        <ActionPlan answers={answers} plan={plan} rules={rules} tierA={tierA} script={script} />
        <Hotlines rules={rules} />
        {hasParts && (
          <button
            type="button"
            onClick={() => goPart(2)}
            className="no-print mt-8 flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-left text-primary-foreground shadow-soft transition-opacity duration-150 hover:opacity-95"
          >
            <span>
              <span className="block text-lg font-semibold">{t("toPart2")}</span>
              <span className="block text-sm opacity-90">{t("toPart2Sub")}</span>
            </span>
            <ArrowRight className="h-6 w-6 shrink-0" aria-hidden />
          </button>
        )}
      </div>

      {hasParts && (
        <div id="part-2" role="tabpanel" aria-labelledby="part-tab-2" className={cn("mt-6", part !== 2 && "hidden print:block")}>
          <BenefitEstimate answers={answers} plan={plan} rules={rules} viewLevel={viewLevel} onChoose={chooseLevel} />
          <Button variant="ghost" className="no-print mt-6 min-h-12" onClick={() => goPart(1)}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            {t("toPart1")}
          </Button>
        </div>
      )}

      <div className="no-print mt-8 flex flex-col items-start gap-1">
        <Button variant="outline" className="min-h-12 text-base" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-5 w-5" aria-hidden />
          {t("printPlan")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("printHint")}</p>
      </div>

      <ProvidersSummary answers={answers} plan={plan} providers={providers} districts={districts} community={community.data ?? []} />
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

      <section aria-labelledby="details-h">
        <h3 id="details-h" className="text-xl">
          {plan.level ? t("detailsTitleLevel", { n: plan.level }) : t("detailsTitleNoLevel")}
        </h3>
        {!plan.level && answers.living !== "residential" && <p className="mt-1 text-sm text-muted-foreground">{t("detailsNoLevelHint")}</p>}
        <BenefitCards answers={answers} plan={plan} rules={rules} />
      </section>

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


function BenefitCards({ answers, plan, rules }: { answers: Answers; plan: PlanResult; rules: Rules }) {
  const { t, tx } = useLang();
  const src = rules._sources;
  const dh = rules.devices_home_modification;
  const priorRule = (id: string) => dh.prior_use_rules.find((r) => r.id === id);
  const sub = rules.residential.subsidy;

  return (
    <div className="mt-6 space-y-4">
      {answers.living === "residential" && <Callout tone="info" icon={<Home className="h-6 w-6" />} title={t("residentialNoHome")} />}

      {plan.care && (
        <BenefitCard
          icon={<HandHeart className="h-5 w-5" aria-hidden />}
          title={t("cardCare")}
          subtitle={t("cardCareSub")}
          notes={[rules.quota_rules.carryover, rules.quota_rules.no_transfer, rules.quota_rules.over_cap, rules.professional_services]}
          sources={[src.regulation_full_text_mirror, src.carryover_ruling, src.professional_page]}
        >
          <MoneySplit govPays={plan.care.govPays} youPay={plan.care.youPay} rate={plan.care.rate} unit={t("perMonth")} />
          {plan.care.period && (
            <p className={cn("mt-3 flex items-start gap-1.5 text-sm", plan.care.period.daysLeft <= 31 ? "font-semibold text-destructive" : "text-muted-foreground")}>
              <AlarmClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("periodEnds", { start: plan.care.period.start, end: plan.care.period.end, n: plan.care.period.daysLeft })}
            </p>
          )}
        </BenefitCard>
      )}

      {plan.transport && (
        <BenefitCard
          icon={<Bus className="h-5 w-5" aria-hidden />}
          title={t("cardTransport")}
          subtitle={t("cardTransportSub")}
          highlight={plan.transport.highlight}
          notes={[rules.transport.medical_DA01, rules.quota_rules.carryover, rules.transport.community_BD03]}
          sources={[src.transport_page]}
        >
          <MoneySplit govPays={plan.transport.govPays} youPay={plan.transport.youPay} rate={plan.transport.rate} unit={t("perMonth")} />
        </BenefitCard>
      )}

      {plan.devices && (
        <BenefitCard
          icon={<Accessibility className="h-5 w-5" aria-hidden />}
          title={t("cardDevices")}
          subtitle={`${t("cardDevicesSub")} · ${t("youPayOfUse", { pct: pct(plan.devices.rate) })}`}
          highlight={plan.devices.highlight}
          notes={[
            dh.cycle,
            plan.devices.mode === "group1_only" ? priorRule("group1_before_20260701") : undefined,
            priorRule("remaining"),
            priorRule("used_up_early"),
            plan.devices.showDisabilityOverlap ? priorRule("min_service_life") : undefined,
            plan.devices.showDisabilityOverlap ? priorRule("disability_overlap") : undefined,
            dh.process,
          ]}
          sources={[src.devices_page, src.devices_qa_20260701]}
        >
          {plan.devices.mode === "group1_only" ? (
            <div className="space-y-3">
              <p className="font-semibold">
                {t("group1")} · {t("devicesRemaining", { left: ntd(plan.devices.group1.remaining), cap: ntd(plan.devices.group1.cap), end: plan.devices.periodEnd! })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("devicesUsedLabel")} {ntd(plan.devices.used)} · {t("ifAllUsed")}:
              </p>
              <MoneySplit govPays={plan.devices.group1.govPaysIfAllUsed} youPay={plan.devices.group1.youPayIfAllUsed} rate={plan.devices.rate} />
              <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">{t("group2From", { cap: ntd(plan.devices.group2.cap), date: plan.devices.group2From! })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t(plan.devices.mode === "choose" ? "devicesChoose" : "devicesCompare")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["group1", "group2"] as const).map((g) => {
                  const pot = plan.devices![g];
                  return (
                    <div key={g} className="rounded-xl border p-3">
                      <p className="font-semibold">
                        {t(g)} · {ntd(pot.cap)}
                      </p>
                      <p className="mb-2 text-sm text-muted-foreground">{g === "group1" ? t("group1Desc") : t("group2Desc", { max: ntd(plan.devices!.group2.homeModMax) })}</p>
                      {plan.devices!.mode === "compare" && (
                        <p className="mb-2 text-sm">
                          {t("remaining")} {ntd(pot.remaining)}
                        </p>
                      )}
                      <p className="text-sm">
                        {t("ifAllUsed")}: {t("govPays")} {ntd(pot.govPaysIfAllUsed)} · {t("youPay")} {ntd(pot.youPayIfAllUsed)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </BenefitCard>
      )}

      {plan.respiteNeedsCaregiver && answers.living === "home_none" && <Callout tone="warning" icon={<Coffee className="h-6 w-6" />} title={t("respiteNeedsCaregiver")} />}

      {(plan.respite || plan.respiteTable) && (
        <BenefitCard
          icon={<Coffee className="h-5 w-5" aria-hidden />}
          title={t("cardRespite")}
          subtitle={t("cardRespiteSub")}
          notes={[rules.respite.requires, rules.quota_rules.no_transfer]}
          sources={[src.respite_page]}
        >
          {plan.respite ? (
            <div className="space-y-3">
              {plan.respite.used > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("devicesUsedLabel")} {ntd(plan.respite.used)} / {ntd(plan.respite.cap)}
                </p>
              )}
              <p className="font-semibold">
                {t("remaining")} {ntd(plan.respite.remaining)}
                {t("perYear")}
              </p>
              <MoneySplit govPays={plan.respite.govPays} youPay={plan.respite.youPay} rate={plan.respite.rate} />
              <div>
                <p className="text-sm font-semibold">{t("goesAsFar")}</p>
                <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-3">
                  <li className="rounded-lg bg-muted/60 px-3 py-2">{t("daysResidential", { n: plan.respite.goesAsFar.residentialDays })}</li>
                  <li className="rounded-lg bg-muted/60 px-3 py-2">{t("daysDaycare", { n: plan.respite.goesAsFar.daycareDays })}</li>
                  <li className="rounded-lg bg-muted/60 px-3 py-2">{t("visitsHome", { n: plan.respite.goesAsFar.homeVisits2h })}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {plan.respiteTable!.rows.map((r) => (
                <div key={r.levels} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                  <span className="font-semibold">
                    {t("respiteLevels", { levels: r.levels })} · {ntd(r.cap)}
                    {t("perYear")}
                  </span>
                  <span>
                    {t("govPays")} {ntd(r.govPays)} · {t("youPay")} {ntd(r.youPay)} ({pct(plan.respiteTable!.rate)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </BenefitCard>
      )}

      {plan.residential && (
        <BenefitCard
          icon={<Home className="h-5 w-5" aria-hidden />}
          title={t("cardResidential")}
          subtitle={answers.living === "residential" ? t("cardResidentialSub") : t("resOption")}
          notes={[sub.eligible, sub.month_counting, sub.how_to_apply, sub.not_eligible_facilities]}
          sources={[src.residential_subsidy_page, src.residential_subsidy_qa]}
        >
          <p className={cn("font-semibold", plan.residential.monthly ? "text-primary" : "text-muted-foreground")}>
            {plan.residential.status === "eligible_15000"
              ? t("resEligible15000")
              : plan.residential.status === "eligible_5000"
                ? t("resEligible5000")
                : plan.residential.status === "needs_level4"
                  ? t("resNeedsLevel")
                  : t("resNotEligible")}
          </p>
          {plan.residential.cannotCombine && (
            <div className="mt-3">
              <Callout tone="warning" icon={<TriangleAlert className="h-5 w-5" />} title={t("cannotCombine")}>
                {tx(sub.no_double)}
              </Callout>
            </div>
          )}
        </BenefitCard>
      )}
    </div>
  );
}

function ProvidersSummary({ answers, plan, providers, districts, community }: { answers: Answers; plan: PlanResult; providers: Provider[]; districts: District[]; community: CommunityPoint[] }) {
  const { t, lang } = useLang();
  const serving = providersServing(providers, answers.district);
  const homes = providers.filter((p) => p.is_residential && p.district === answers.district);
  const openBeds = homes.reduce((s, p) => s + p.open_beds, 0);
  const communityCount = community.filter((c) => c.district === answers.district).length + providers.filter((p) => p.tier === "C" && p.district === answers.district).length;
  const c = districtCentroid(districts, answers.city, answers.district);
  const top = getProvidersFor(providers, districts, answers, plan.level).slice(0, 3);
  const mapLink = plan.communityFirst && !plan.showBenefits ? "/map?tab=community" : "/map";

  return (
    <Section title={t("afterCallTitle")} icon={<MapPinned className="h-5 w-5 text-primary" aria-hidden />} className="no-print">
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="text-lg font-semibold">{t("afterCallSub", { n: serving.length.toLocaleString("en-US"), district: districtName(answers.district, lang) })}</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {homes.length > 0 && <li>{t("homesOpen", { homes: homes.length, beds: openBeds })}</li>}
          {communityCount > 0 && <li>{t("communityCount", { n: communityCount })}</li>}
        </ul>
        <ul className="mt-4 divide-y">
          {top.map((p) => {
            const d = distanceFrom(p, c);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <TierBadge tier={p.tier} label={TIER_LABELS[p.tier][lang]} />
                  <p className="mt-1 font-semibold leading-snug">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.categories.map((cat) => CATEGORY_LABELS[cat][lang]).join("・")}
                    {d !== undefined && ` · ${d.toFixed(1)} km`}
                  </p>
                </div>
                {p.phone && <CallButton phone={p.phone} label={t("call")} variant="outline" />}
              </li>
            );
          })}
        </ul>
        <Button asChild className="mt-3 min-h-12 w-full text-base sm:w-auto">
          <Link to={mapLink}>
            {t("seeMap")}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </Section>
  );
}

export default Plan;
