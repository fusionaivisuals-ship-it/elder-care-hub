import { Accessibility, Bus, Check, Coffee, ExternalLink, HandHeart, Home, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import { useLang } from "@/components/LanguageProvider";
import { ntd } from "@/lib/i18n";
import { careCap, levelGuide, type PlanResult } from "@/lib/planEngine";
import type { Answers, Level, Rules } from "@/lib/types";
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
        {t("pickLevelTitle")}
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
        {viewLevel ? <Guide answers={answers} plan={plan} rules={rules} level={viewLevel} own={own} /> : <p className="rounded-xl bg-muted/60 p-4 text-center text-muted-foreground">{t("guideEmpty")}</p>}
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

function Row({ icon, label, children, muted }: { icon: ReactNode; label: string; children: ReactNode; muted?: boolean }) {
  return (
    <li className={cn("flex items-start gap-3 py-3", muted && "opacity-70")}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{label}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function Guide({ answers, plan, rules, level, own }: { answers: Answers; plan: PlanResult; rules: Rules; level: Level; own?: Level }) {
  const { t } = useLang();
  const g = levelGuide(rules, level, answers.household);
  const atHome = answers.living !== "residential";
  const context = own ? (own === level ? t("guideYours") : t("guideCompare", { own, n: level })) : t("guideExample", { n: level });

  return (
    <div className="animate-fade-in rounded-xl border-2 border-primary/20 bg-secondary/40 p-3 sm:p-4">
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

      {!g.hasBenefits ? (
        <p className="mt-3 rounded-lg bg-card p-3">{t("guideLevel1")}</p>
      ) : (
        <ul className="mt-2 divide-y">
          {atHome && g.care && (
            <Row icon={<HandHeart className="h-4 w-4" aria-hidden />} label={t("cardCare")}>
              <span className="text-base font-semibold text-foreground">{ntd(g.care.cap)}</span>
              {t("perMonth")} · {t("youPay")} <span className="font-semibold text-foreground">{ntd(g.care.youPay)}</span>
            </Row>
          )}
          {atHome && g.respite && (
            <Row icon={<Coffee className="h-4 w-4" aria-hidden />} label={t("cardRespite")} muted={answers.living !== "home_family"}>
              <span className="text-base font-semibold text-foreground">{ntd(g.respite.cap)}</span>
              {t("perYear")} · {t("youPay")} {ntd(g.respite.youPay)}
              {answers.living !== "home_family" && <span className="block">{t("respiteNeedsCaregiver")}</span>}
            </Row>
          )}
          {atHome && plan.transport && (
            <Row icon={<Bus className="h-4 w-4" aria-hidden />} label={t("cardTransport")}>
              {ntd(plan.transport.cap)}
              {t("perMonth")} · {t("sameAllLevels")}
            </Row>
          )}
          {atHome && plan.devices && (
            <Row icon={<Accessibility className="h-4 w-4" aria-hidden />} label={t("cardDevices")}>
              {ntd(plan.devices.group1.cap)} / {ntd(plan.devices.group2.cap)} · {t("cardDevicesSub")} · {t("sameAllLevels")}
            </Row>
          )}
          <Row icon={<Home className="h-4 w-4" aria-hidden />} label={t("cardResidential")}>
            <span className={cn("inline-flex items-center gap-1", g.residentialEligible ? "text-success" : "")}>
              {g.residentialEligible ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
              {g.residentialEligible ? t("residentialYes") : t("residentialNo")}
            </span>
          </Row>
        </ul>
      )}
    </div>
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
