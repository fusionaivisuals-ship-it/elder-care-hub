import { useState } from "react";
import { Check, Copy, ExternalLink, MapPin, Phone, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import type { CallScript } from "@/lib/callScript";
import { mapsSearchUrl, phoneDisplay, phoneHref } from "@/lib/data";
import type { PlanResult } from "@/lib/planEngine";
import { cityName } from "@/lib/places";
import type { Answers, Provider, Rules } from "@/lib/types";

export function CallButton({ phone, label, variant = "default" }: { phone: string; label?: string; variant?: "default" | "outline" }) {
  const { t } = useLang();
  return (
    <Button asChild variant={variant} className="min-h-12 text-base">
      <a href={phoneHref(phone)}>
        <Phone className="mr-1.5 h-5 w-5" aria-hidden />
        {label ?? `${t("call")} ${phoneDisplay(phone)}`}
      </a>
    </Button>
  );
}

export function CallFirst({ answers, plan, rules, tierA, script }: { answers: Answers; plan: PlanResult; rules: Rules; tierA?: Provider; script: CallScript }) {
  const { t, tx, lang } = useLang();
  const center = rules.online_application[answers.city];
  const centerName = lang === "en" ? `${cityName(answers.city, lang)} Long-Term Care Management Center` : `${answers.city}長期照顧管理中心`;

  const centerBlock = (
    <div className="space-y-2">
      <p className="font-semibold">{centerName}</p>
      <div className="flex flex-wrap gap-2">
        <CallButton phone={center.center_phone} />
        <Button asChild variant="outline" className="min-h-12 text-base">
          <a href={center.apply_url} target="_blank" rel="noreferrer">
            {t("orOnline")}
            <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden />
          </a>
        </Button>
      </div>
      {center.hotline_hours && <p className="text-sm text-muted-foreground">{center.hotline_hours}</p>}
    </div>
  );

  return (
    <div id="callfirst-h" className="print-card rounded-2xl border-2 border-primary bg-card p-4 shadow-soft sm:p-5">

      {plan.callFirst === "ward_nurse" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Stethoscope className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-lg font-semibold">{t("wardNurse")}</p>
              <p className="text-muted-foreground">{t("wardNurseSub")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tx(rules.discharge_planning)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">{t("backup")}</p>
            {centerBlock}
          </div>
        </div>
      )}

      {plan.callFirst === "city_center" && centerBlock}

      {plan.callFirst === "tier_a" &&
        (tierA ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("nearestA")}</p>
            <p className="text-lg font-semibold">{tierA.name}</p>
            <a href={mapsSearchUrl(tierA.address)} target="_blank" rel="noreferrer" className="flex min-h-10 items-start gap-1.5 text-muted-foreground underline-offset-2 hover:underline">
              <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden />
              {tierA.address}
            </a>
            <CallButton phone={tierA.phone} />
            <p className="text-sm text-muted-foreground">{t("nearestASub")}</p>
          </div>
        ) : (
          centerBlock
        ))}

      {plan.callFirst === "hotline_1966" && <CallButton phone="1966" label={`${t("call")} 1966`} />}

      {plan.callFirst !== "hotline_1966" && (
        <div className="mt-3">
          <Button asChild variant="link" className="h-auto min-h-12 whitespace-normal px-0 text-left text-base">
            <a href="tel:1966">
              <Phone className="mr-1.5 h-4 w-4" aria-hidden />
              {t("call")} 1966 · {t("hotline1966")}
            </a>
          </Button>
        </div>
      )}

      <ScriptBlock script={script} />
    </div>
  );
}

function ScriptBlock({ script }: { script: CallScript }) {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState(false);
  const lines = script.say[lang];
  const docs = script.docs[lang];

  const copy = async () => {
    const text = [script.who[lang] + (script.phone ? ` ${script.phone}` : ""), "", ...lines, "", `${t("scriptDocs")}:`, ...docs.map((d) => `- ${d}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg">{t("scriptTitle")}</h3>
        <Button variant="outline" size="sm" onClick={copy} className="no-print min-h-10" aria-live="polite">
          {copied ? <Check className="mr-1 h-4 w-4" aria-hidden /> : <Copy className="mr-1 h-4 w-4" aria-hidden />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        {script.who[lang]}
        {script.phone && (
          <>
            {" · "}
            <a href={phoneHref(script.phone)} className="inline-flex min-h-12 items-center px-1 text-primary underline underline-offset-2">
              {script.phone}
            </a>
          </>
        )}
      </p>
      <blockquote className="space-y-1.5 rounded-xl border-l-4 border-accent bg-accent/10 p-3">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </blockquote>
    </div>
  );
}
