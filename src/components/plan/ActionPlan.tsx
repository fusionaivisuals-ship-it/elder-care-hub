import { useState, type ReactNode } from "react";
import { ArrowRight, Check, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/components/LanguageProvider";
import { CallFirst } from "@/components/plan/CallFirst";
import { Callout } from "@/components/plan/PlanParts";
import type { CallScript } from "@/lib/callScript";
import { NEED_LABELS, ntd } from "@/lib/i18n";
import { currentProcessStep, type PlanResult } from "@/lib/planEngine";
import type { Answers, Provider, Rules } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One numbered step with a connector line to the next. */
function Step({ n, title, last, children }: { n: number; title: string; last?: boolean; children: ReactNode }) {
  return (
    <li className="relative flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">{n}</span>
        {!last && <span className="mt-1 w-0.5 flex-1 bg-primary/20" aria-hidden />}
      </div>
      <div className={cn("min-w-0 flex-1", !last && "pb-8")}>
        <h3 className="mb-3 pt-1 text-xl">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** Part 1: who to call, what to have ready, what happens next — in that order. */
export function ActionPlan({
  answers,
  plan,
  rules,
  tierA,
  script,
  onOpenCommunity,
}: {
  answers: Answers;
  plan: PlanResult;
  rules: Rules;
  tierA?: Provider;
  script: CallScript;
  onOpenCommunity: () => void;
}) {
  const { t, tx, lang } = useLang();
  const docs = script.docs[lang];
  const [ready, setReady] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setReady((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set([...s, i])));
  const assessedWithBenefits = plan.assessed && plan.showBenefits;
  const reset = plan.alerts.find((a) => a.id === "carryover_reset");
  const current = currentProcessStep(answers.status);

  return (
    <div>
      <p className="mb-5 text-muted-foreground">{t("part1Intro")}</p>
      <ol>
        <Step n={1} title={t("callFirst")}>
          <CallFirst answers={answers} plan={plan} rules={rules} tierA={tierA} script={script} />
        </Step>

        <Step n={2} title={plan.assessed && plan.showBenefits ? t("step2TitleAssessed") : t("step2Title")}>
          <div className="space-y-4">
            <div className="print-card rounded-2xl bg-card p-4 shadow-soft">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="font-semibold">{t("step2Docs")}</p>
                <span className="no-print text-sm text-muted-foreground">{t("step2Ready", { n: ready.size, total: docs.length })}</span>
              </div>
              <ul className="space-y-1">
                {docs.map((d, i) => (
                  <li key={d}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-muted/60">
                      <Checkbox checked={ready.has(i)} onCheckedChange={() => toggle(i)} className="h-5 w-5" />
                      <span className={cn(ready.has(i) && "text-muted-foreground line-through")}>{d}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="print-card rounded-2xl bg-card p-4 shadow-soft">
              <p className="font-semibold">{assessedWithBenefits ? t("step2TellAssessed") : t("step2Tell")}</p>
              {!assessedWithBenefits && <p className="mt-1 text-sm text-muted-foreground">{t("step2TellHint")}</p>}
              <ul className="mt-2 space-y-1.5">
                {reset && <li className="font-semibold text-destructive">· {t("alertReset", { date: reset.date!, n: reset.daysLeft! })}</li>}
                {plan.respite && plan.respite.used === 0 && (
                  <li className="font-semibold text-warning">
                    · {t("alertRespite")} · {ntd(plan.respite.remaining)}
                  </li>
                )}
              </ul>
              {answers.needs.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {answers.needs.map((n) => (
                    <span key={n} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                      {NEED_LABELS[n][lang]}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm">{t("step2TellNone")}</p>
              )}
            </div>
          </div>
        </Step>

        <Step n={3} title={t("step3Title")} last>
          {plan.showBenefits || (plan.identityOk && !plan.assessed) ? (
            <ol className="print-card space-y-2 rounded-2xl bg-card p-4 shadow-soft">
              {rules.application_process.map((s, i) => {
                const done = i < current;
                const here = i === current;
                return (
                  <li key={s.step} className={cn("flex gap-3 rounded-xl p-2", here && "bg-secondary")}>
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        done ? "bg-success text-white" : here ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" aria-label={t("stepDone")} /> : s.step}
                    </span>
                    <div className="min-w-0">
                      {here && <span className="mb-0.5 inline-block rounded-full bg-primary px-2 text-xs font-semibold leading-5 text-primary-foreground">{t("youAreHere")}</span>}
                      <p className={cn("text-sm", done && "text-muted-foreground", here && "text-foreground")}>{tx(s)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Callout tone="success" icon={<HandHeart className="h-6 w-6" />} title={t("communityFirstCard")}>
              <p>{tx(rules.eligibility.if_not_eligible)}</p>
              <Button className="no-print mt-3 min-h-12" onClick={onOpenCommunity}>
                {t("tabCommunity")}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </Callout>
          )}
        </Step>
      </ol>
    </div>
  );
}
