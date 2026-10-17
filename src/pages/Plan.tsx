import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Accessibility,
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Bus,
  ClipboardList,
  Coffee,
  FileText,
  HandHeart,
  Home,
  Hospital,
  Info,
  ListChecks,
  MapPinned,
  Pencil,
  Phone,
  Printer,
  Receipt,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { LoadState, Page, Section, TierBadge } from "@/components/Shell";
import { CallButton, CallFirst } from "@/components/plan/CallFirst";
import { BenefitCard, Callout, MoneySplit, Notes } from "@/components/plan/PlanParts";
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
import { CATEGORY_LABELS, ntd, pct, TIER_LABELS } from "@/lib/i18n";
import { computePlan, LEVELS, type PlanResult } from "@/lib/planEngine";
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
  const { selectedLevel, setSelectedLevel, setDraft } = usePlan();
  const cityKey = cityKeyOf(answers.city);
  const data = useData(() => Promise.all([loadRules(), loadDistricts(), loadProviders(cityKey)]), [cityKey]);
  const community = useData(() => (answers.city === "新北市" ? loadCommunity() : Promise.resolve([] as CommunityPoint[])), [answers.city]);

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
  const place = lang === "zh" ? `${answers.city}${answers.district}` : `${answers.district}, ${answers.city}`;

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

      <CallFirst answers={answers} plan={plan} rules={rules} tierA={tierA} script={script} />

      {plan.showBenefits ? (
        <>
          <Hero plan={plan} rules={rules} onSelect={setSelectedLevel} />
          <BenefitCards answers={answers} plan={plan} rules={rules} />
        </>
      ) : (
        <Section title={t("notEligibleNext")} icon={<Users className="h-5 w-5 text-primary" aria-hidden />}>
          <Callout tone="success" icon={<HandHeart className="h-6 w-6" />} title={t("communityFirstCard")}>
            <p>{lang === "zh" ? rules.eligibility.if_not_eligible.zh : rules.eligibility.if_not_eligible.en}</p>
            <Button asChild className="no-print mt-3 min-h-12">
              <Link to="/map?tab=community">
                {t("tabCommunity")}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Callout>
        </Section>
      )}

      <HowToApply rules={rules} docs={script.docs[lang]} />

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
                  <span className="font-semibold text-primary">{h.number}</span>
                </a>
              </li>
            ))}
        </ul>
      </Section>

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

function Hero({ plan, rules, onSelect }: { plan: PlanResult; rules: Rules; onSelect: (l?: Level) => void }) {
  const { t, tx } = useLang();
  return (
    <section className="print-card mt-6 rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft sm:p-5" aria-label={t("heroGovPays")}>
      {plan.care ? (
        <>
          <p className="text-sm opacity-90">{t("heroCareOnly", { level: plan.care.level })}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm opacity-90">{t("heroGovPays")}</div>
              <div className="text-3xl font-semibold">{ntd(plan.care.govPays)}</div>
            </div>
            <div>
              <div className="text-sm opacity-90">
                {t("heroYouPay")} · {pct(plan.care.rate)}
              </div>
              <div className="text-3xl font-semibold text-accent">{ntd(plan.care.youPay)}</div>
            </div>
          </div>
        </>
      ) : plan.showLevelSelector ? (
        <p className="text-lg font-semibold">{t("heroPickLevel")}</p>
      ) : null}
      <p className="mt-3 text-sm opacity-90">{tx(rules.eligibility.income_does_not_reduce_benefit)}</p>

      {plan.showLevelSelector && plan.careTable && (
        <div className="mt-4 rounded-xl bg-card p-3 text-foreground">
          <p className="font-semibold">{t("levelSelectorTitle")}</p>
          <p className="mb-2 text-sm text-muted-foreground">{tx(rules._wording_rules.amounts_without_level)}</p>
          <div role="radiogroup" aria-label={t("levelSelectorTitle")} className="divide-y">
            {LEVELS.map((lv) => {
              const row = plan.careTable!.find((r) => r.level === lv)!;
              const on = plan.level === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSelect(on ? undefined : lv)}
                  className={cn("grid min-h-12 w-full grid-cols-[4.5rem_1fr_1fr] items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150", on ? "bg-secondary font-semibold text-primary" : "hover:bg-muted")}
                >
                  <span>{t("levelN", { n: lv })}</span>
                  <span className="text-sm">
                    <span className="block text-xs text-muted-foreground">{t("govPays")}</span>
                    {ntd(row.govPays)}
                  </span>
                  <span className="text-sm">
                    <span className="block text-xs text-muted-foreground">{t("youPay")}</span>
                    {ntd(row.youPay)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("levelSelectorHint")}</p>
        </div>
      )}
    </section>
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

function HowToApply({ rules, docs }: { rules: Rules; docs: string[] }) {
  const { t, tx } = useLang();
  return (
    <Section title={t("applyTitle")} icon={<ListChecks className="h-5 w-5 text-primary" aria-hidden />}>
      <ol className="space-y-3">
        {rules.application_process.map((s) => (
          <li key={s.step} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{s.step}</span>
            <span className="pt-0.5">{tx(s)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="print-card rounded-2xl bg-card p-4 shadow-soft">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            {t("docsTitle")}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {docs.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
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
      <Notes items={[rules.quota_rules.reassessment]} />
    </Section>
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
        <p className="text-lg font-semibold">{t("afterCallSub", { n: serving.length.toLocaleString("en-US"), district: answers.district })}</p>
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
