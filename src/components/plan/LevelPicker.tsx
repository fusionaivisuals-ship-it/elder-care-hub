import { Accessibility, AlarmClock, Bus, Check, Coffee, ExternalLink, HandHeart, Home, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import { useLang } from "@/components/LanguageProvider";
import { ntd, pct } from "@/lib/i18n";
import { careCap, levelGuide, type PlanResult } from "@/lib/planEngine";
import type { Answers, Level, LText, Rules } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Level scale 1–8 (mild → severe) + a guide for the chosen level.
 * Not assessed: choosing a level drives the whole estimate (an example, never a prediction).
 * Assessed: the parent's level is fixed; other levels can be viewed for comparison only.
 */
export function LevelPicker({
  answers,
  plan,
  rules,
  viewLevel,
  onChoose,
}: {
  answers: Answers;
  plan: PlanResult;
  rules: Rules;
  viewLevel?: Level;
  onChoose: (l?: Level) => void;
}) {
  const { t, tx } = useLang();
  const own = plan.assessed ? answers.level : undefined;

  return (
    <section aria-labelledby="levels-h" className="print-card rounded-2xl bg-card p-4 shadow-soft sm:p-5">
      <h3 id="levels-h" className="text-lg">
        {own ? t("pickLevelTitleAssessed") : t("pickLevelTitle")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{own ? t("pickLevelSubAssessed", { level: own }) : t("pickLevelSubNot")}</p>

      {/* the scale */}
      <div role="radiogroup" aria-label={t("pickLevelTitle")} className="no-print mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-8">
        {ALL_LEVELS.map((lv) => {
          const on = viewLevel === lv;
          const isOwn = own === lv;
          const cap = lv >= 2 ? careCap(rules, lv) : 0;
          return (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${t("levelN", { n: lv })}${isOwn ? ` · ${t("yourLevel")}` : ""}`}
              onClick={() => onChoose(on && !own ? undefined : lv)}
              className={cn(
                "relative flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 px-1 py-2 transition-colors duration-150",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50",
                lv === 1 && !on && "text-muted-foreground",
              )}
            >
              {isOwn && (
                <span
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold leading-5",
                    on ? "bg-accent text-foreground" : "bg-primary text-primary-foreground",
                  )}
                >
                  {t("yourLevel")}
                </span>
              )}
              <span className="text-2xl font-semibold leading-none">{lv}</span>
              <span className={cn("mt-1 text-[11px] leading-tight", on ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {lv === 1 ? t("noBenefitShort") : cap.toLocaleString("en-US")}
              </span>
            </button>
          );
        })}
      </div>
      <div className="no-print mt-2 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
        <span>{t("scaleMild")}</span>
        <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-secondary to-primary" />
        <span>{t("scaleSevere")}</span>
      </div>

      <div className="mt-4" aria-live="polite">
        <Guide answers={answers} plan={plan} rules={rules} level={viewLevel} own={own} />
      </div>

      <details className="mt-4 rounded-xl border px-3 py-2">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold">
          <Info className="h-4 w-4 text-primary" aria-hidden />
          {t("howLevelsTitle")}
        </summary>
        <div className="space-y-2 pb-2 text-sm text-muted-foreground">
          <p>{tx(rules.eligibility.levels.definition)}</p>
          <p>{tx(rules.quota_rules.reassessment)}</p>
          <a href={rules._sources.levels_definition} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-primary underline underline-offset-2">
            {t("source")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </details>

      <CompareTable answers={answers} rules={rules} viewLevel={viewLevel} own={own} onChoose={onChoose} />
    </section>
  );
}

function Row({
  icon,
  label,
  children,
  muted,
  highlight,
  details,
  notes,
  sources,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  muted?: boolean;
  highlight?: boolean;
  details?: ReactNode;
  notes?: (LText | undefined)[];
  sources?: (string | undefined)[];
}) {
  const { t, tx } = useLang();
  const list = (notes ?? []).filter(Boolean) as LText[];
  const links = (sources ?? []).filter(Boolean) as string[];
  return (
    <li className={cn("flex items-start gap-3 py-3", muted && "opacity-70")}>
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary", highlight ? "bg-accent/30" : "bg-secondary")}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{label}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
        {details && <div className="mt-2 space-y-2 text-sm">{details}</div>}
        {(list.length > 0 || links.length > 0) && (
          <details className="mt-2 rounded-lg bg-card/70 px-3 py-1 text-sm">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 font-semibold text-primary">
              <Info className="h-4 w-4" aria-hidden />
              {t("detailsAndSources")}
            </summary>
            <ul className="list-disc space-y-1 pb-1 pl-5 text-muted-foreground">
              {list.map((n, k) => (
                <li key={k}>{tx(n)}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-x-4 pb-1">
              {links.map((u, k) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-primary underline underline-offset-2">
                  {t("source")}
                  {links.length > 1 ? ` ${k + 1}` : ""}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

/**
 * What a level unlocks, with each benefit's details and official sources.
 * For the plan's own level (assessed, or the one tapped), personal details are added:
 * when unused care money resets, respite left and how far it goes, device money left.
 */
function Guide({ answers, plan, rules, level, own }: { answers: Answers; plan: PlanResult; rules: Rules; level?: Level; own?: Level }) {
  const { t, tx } = useLang();
  const g = level ? levelGuide(rules, level, answers.household) : undefined;
  const atHome = answers.living !== "residential";
  const mine = !!level && plan.level === level; // personal numbers only apply to the plan's own level
  const src = rules._sources;
  const dh = rules.devices_home_modification;
  const prior = (id: string) => dh.prior_use_rules.find((r) => r.id === id);
  const sub = rules.residential.subsidy;
  const context = !level ? undefined : own ? (own === level ? t("guideYours") : t("guideCompare", { own, n: level })) : t("guideExample", { n: level });

  return (
    <div className="animate-fade-in rounded-xl border-2 border-primary/20 bg-secondary/40 p-3 sm:p-4">
      {level ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h4 className="text-lg text-primary">{t("guideTitle", { n: level })}</h4>
            <span className="text-xs text-muted-foreground">{t("guideScale", { n: level })}</span>
          </div>
          {/* 8-segment meter */}
          <div className="mt-2 grid grid-cols-8 gap-1" aria-hidden>
            {ALL_LEVELS.map((lv) => (
              <span key={lv} className={cn("h-2 rounded-full", lv <= level ? "bg-primary" : "bg-border")} />
            ))}
          </div>
          <p className={cn("mt-2 text-sm font-semibold", own && own !== level ? "text-warning" : "text-foreground")}>{context}</p>
        </>
      ) : (
        <p className="rounded-lg bg-card p-3 text-center text-muted-foreground">{t("guideEmpty")}</p>
      )}

      {atHome && !level && <p className="mt-3 text-sm font-semibold">{t("guideAnyLevel")}</p>}
      {!atHome && <p className="mt-3 text-sm">{t("residentialNoHome")}</p>}

      {g && !g.hasBenefits ? (
        <p className="mt-3 rounded-lg bg-card p-3">{t("guideLevel1")}</p>
      ) : (
        <ul className="mt-2 divide-y">
          {atHome && g?.care && (
            <Row
              icon={<HandHeart className="h-4 w-4" aria-hidden />}
              label={t("cardCare")}
              notes={[rules.quota_rules.carryover, rules.quota_rules.no_transfer, rules.quota_rules.over_cap, rules.professional_services]}
              sources={[src.regulation_full_text_mirror, src.carryover_ruling, src.professional_page]}
              details={
                mine && plan.care?.period ? (
                  <p className={cn("flex items-start gap-1.5", plan.care.period.daysLeft <= 31 ? "font-semibold text-destructive" : "text-muted-foreground")}>
                    <AlarmClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {t("periodEnds", { start: plan.care.period.start, end: plan.care.period.end, n: plan.care.period.daysLeft })}
                  </p>
                ) : undefined
              }
            >
              <span className="text-base font-semibold text-foreground">{ntd(g.care.cap)}</span>
              {t("perMonth")} · {t("govPays")} {ntd(g.care.govPays)} · {t("youPay")} <span className="font-semibold text-foreground">{ntd(g.care.youPay)}</span> ({pct(g.care.rate)})
            </Row>
          )}
          {atHome && g?.respite && (
            <Row
              icon={<Coffee className="h-4 w-4" aria-hidden />}
              label={t("cardRespite")}
              muted={answers.living !== "home_family"}
              notes={[rules.respite.requires, rules.quota_rules.no_transfer]}
              sources={[src.respite_page]}
              details={
                answers.living !== "home_family" ? (
                  <p className="text-muted-foreground">{t("respiteNeedsCaregiver")}</p>
                ) : mine && plan.respite ? (
                  <div>
                    {plan.respite.used > 0 && (
                      <p className="text-muted-foreground">
                        {t("devicesUsedLabel")} {ntd(plan.respite.used)} / {ntd(plan.respite.cap)}
                      </p>
                    )}
                    <p className="font-semibold">
                      {t("remaining")} {ntd(plan.respite.remaining)} · {t("youPay")} {ntd(plan.respite.youPay)}
                    </p>
                    <p className="mt-1 text-muted-foreground">{t("goesAsFar")}:</p>
                    <ul className="mt-1 grid gap-1 sm:grid-cols-3">
                      <li className="rounded-lg bg-card px-3 py-2">{t("daysResidential", { n: plan.respite.goesAsFar.residentialDays })}</li>
                      <li className="rounded-lg bg-card px-3 py-2">{t("daysDaycare", { n: plan.respite.goesAsFar.daycareDays })}</li>
                      <li className="rounded-lg bg-card px-3 py-2">{t("visitsHome", { n: plan.respite.goesAsFar.homeVisits2h })}</li>
                    </ul>
                  </div>
                ) : undefined
              }
            >
              <span className="text-base font-semibold text-foreground">{ntd(g.respite.cap)}</span>
              {t("perYear")} · {t("youPay")} {ntd(g.respite.youPay)} ({pct(g.respite.rate)})
            </Row>
          )}
          {atHome && plan.transport && (
            <Row
              icon={<Bus className="h-4 w-4" aria-hidden />}
              label={t("cardTransport")}
              highlight={plan.transport.highlight}
              notes={[rules.transport.medical_DA01, rules.quota_rules.carryover, rules.transport.community_BD03]}
              sources={[src.transport_page]}
            >
              <span className="text-base font-semibold text-foreground">{ntd(plan.transport.cap)}</span>
              {t("perMonth")} · {t("youPay")} {ntd(plan.transport.youPay)} ({pct(plan.transport.rate)}) · {t("sameAllLevels")}
            </Row>
          )}
          {atHome && plan.devices && (
            <Row
              icon={<Accessibility className="h-4 w-4" aria-hidden />}
              label={t("cardDevices")}
              highlight={plan.devices.highlight}
              notes={[
                dh.cycle,
                plan.devices.mode === "group1_only" ? prior("group1_before_20260701") : undefined,
                prior("remaining"),
                prior("used_up_early"),
                plan.devices.showDisabilityOverlap ? prior("min_service_life") : undefined,
                plan.devices.showDisabilityOverlap ? prior("disability_overlap") : undefined,
                dh.process,
              ]}
              sources={[src.devices_page, src.devices_qa_20260701]}
              details={
                plan.devices.mode === "group1_only" ? (
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {t("group1")} · {t("devicesRemaining", { left: ntd(plan.devices.group1.remaining), cap: ntd(plan.devices.group1.cap), end: plan.devices.periodEnd! })}
                    </p>
                    <p className="text-muted-foreground">
                      {t("devicesUsedLabel")} {ntd(plan.devices.used)} · {t("ifAllUsed")}: {t("youPay")} {ntd(plan.devices.group1.youPayIfAllUsed)}
                    </p>
                    <p className="rounded-lg bg-card p-2">{t("group2From", { cap: ntd(plan.devices.group2.cap), date: plan.devices.group2From! })}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">{t(plan.devices.mode === "choose" ? "devicesChoose" : "devicesCompare")}</p>
                    {(["group1", "group2"] as const).map((k) => {
                      const pot = plan.devices![k];
                      return (
                        <p key={k} className="rounded-lg bg-card p-2">
                          <span className="font-semibold">
                            {t(k)} · {ntd(pot.cap)}
                          </span>{" "}
                          — {k === "group1" ? t("group1Desc") : t("group2Desc", { max: ntd(plan.devices!.group2.homeModMax) })}
                          {plan.devices!.mode === "compare" && ` · ${t("remaining")} ${ntd(pot.remaining)}`}
                          {` · ${t("ifAllUsed")}: ${t("youPay")} ${ntd(pot.youPayIfAllUsed)}`}
                        </p>
                      );
                    })}
                  </div>
                )
              }
            >
              {t("youPayOfUse", { pct: pct(plan.devices.rate) })} · {t("cardDevicesSub")} · {t("sameAllLevels")}
            </Row>
          )}
          {(g || !atHome) && (
            <Row
              icon={<Home className="h-4 w-4" aria-hidden />}
              label={t("cardResidential")}
              notes={[sub.eligible, sub.month_counting, sub.how_to_apply, sub.not_eligible_facilities]}
              sources={[src.residential_subsidy_page, src.residential_subsidy_qa]}
              details={
                mine && plan.residential?.cannotCombine ? (
                  <p className="rounded-lg bg-accent/15 p-2 text-foreground">
                    <span className="font-semibold">{t("cannotCombine")}: </span>
                    {tx(sub.no_double)}
                  </p>
                ) : undefined
              }
            >
              <ResidentialStatus status={(mine || !g) && plan.residential ? plan.residential.status : g?.residentialEligible ? "eligible_15000" : "needs_level4"} />
            </Row>
          )}
        </ul>
      )}
    </div>
  );
}

function ResidentialStatus({ status }: { status: "eligible_15000" | "eligible_5000" | "needs_level4" | "not_eligible" }) {
  const { t } = useLang();
  const ok = status === "eligible_15000" || status === "eligible_5000";
  const text = { eligible_15000: t("residentialYes"), eligible_5000: t("resEligible5000"), needs_level4: t("residentialNo"), not_eligible: t("resNotEligible") }[status];
  return (
    <span className={cn("inline-flex items-start gap-1", ok && "text-success")}>
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      {text}
    </span>
  );
}

function CompareTable({ answers, rules, viewLevel, own, onChoose }: { answers: Answers; rules: Rules; viewLevel?: Level; own?: Level; onChoose: (l?: Level) => void }) {
  const { t, tx } = useLang();
  const rows = ([2, 3, 4, 5, 6, 7, 8] as Level[]).map((lv) => levelGuide(rules, lv, answers.household));
  return (
    <details className="mt-3 rounded-xl border px-3 py-2">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold">
        <Info className="h-4 w-4 text-primary" aria-hidden />
        {t("compareTableTitle")}
      </summary>
      <div className="-mx-3 overflow-x-auto px-3 pb-2">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="py-2 pr-2 font-semibold">
                {t("colLevel")}
              </th>
              <th scope="col" className="py-2 pr-2 font-semibold">
                {t("colCare")}
              </th>
              <th scope="col" className="py-2 pr-2 font-semibold">
                {t("colYouPay")}
              </th>
              {answers.living === "home_family" && (
                <th scope="col" className="py-2 pr-2 font-semibold">
                  {t("colRespite")}
                </th>
              )}
              <th scope="col" className="py-2 font-semibold">
                {t("colResidential")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.level}
                onClick={() => onChoose(r.level)}
                className={cn("cursor-pointer border-b last:border-0 hover:bg-muted/60", viewLevel === r.level && "bg-secondary font-semibold text-primary")}
              >
                <th scope="row" className="py-2 pr-2 font-semibold">
                  {r.level}
                  {own === r.level && <span className="ml-1 text-xs font-normal">({t("yourLevel")})</span>}
                </th>
                <td className="py-2 pr-2">{ntd(r.care!.cap)}</td>
                <td className="py-2 pr-2">{ntd(r.care!.youPay)}</td>
                {answers.living === "home_family" && <td className="py-2 pr-2">{ntd(r.respite!.cap)}</td>}
                <td className="py-2">{r.residentialEligible ? <Check className="h-4 w-4 text-success" aria-label="yes" /> : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">{tx(rules._wording_rules.amounts_without_level)}</p>
      </div>
    </details>
  );
}
