import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/components/LanguageProvider";
import { LoadState, Page } from "@/components/Shell";
import { usePlan } from "@/context/PlanContext";
import { useData } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CITIES, getDistricts, loadDistricts } from "@/lib/data";
import { NEED_LABELS, type DictKey } from "@/lib/i18n";
import type { Answers, Level, Need, OtherResidentialSubsidy } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepId = "location" | "who" | "status" | "used" | "needs" | "living" | "household";
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const NEEDS = Object.keys(NEED_LABELS) as Need[];
const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface ChoiceProps<T extends string | number> {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  multi?: boolean;
  label: string;
  columns?: 1 | 2 | 4;
}

function Choice<T extends string | number>({ options, selected, onToggle, multi, label, columns = 1 }: ChoiceProps<T>) {
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={label} className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 4 && "grid-cols-4")}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              "flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 bg-card px-4 py-2.5 text-left transition-colors duration-150",
              on ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
            )}
          >
            <span>{o.label}</span>
            {on && <Check className="h-5 w-5 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, help, htmlFor, children, error }: { label: string; help?: string; htmlFor?: string; children: ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-base font-semibold">
        {label}
      </Label>
      {help && <p className="text-sm text-muted-foreground">{help}</p>}
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2">
      <Label htmlFor={id} className="flex-1 cursor-pointer text-base font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const Start = () => {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { draft: d, setDraft, setAnswers, setSelectedLevel, setDemo } = usePlan();
  const districts = useData(loadDistricts, []);
  const [i, setI] = useState(0);
  useDocumentTitle(t("start"));

  const set = (patch: Partial<Answers>) => setDraft({ ...d, ...patch });
  const steps: StepId[] = useMemo(
    () => ["location", "who", "status", ...(d.status === "assessed" ? (["used"] as StepId[]) : []), "needs", "living", "household"],
    [d.status],
  );
  const step = steps[Math.min(i, steps.length - 1)];
  const isLast = i >= steps.length - 1;

  const deviceMonthMissing = (d.devicesUsed ?? 0) > 0 && !MONTH_RE.test(d.deviceApprovedMonth ?? "");
  const valid: Record<StepId, boolean> = {
    location: !!d.city && !!d.district,
    who: !!d.age && (!d.disabilityCert || !!d.disabilityLevel),
    status: !!d.status && (d.status !== "assessed" || (!!d.level && (!d.planApprovedMonth || MONTH_RE.test(d.planApprovedMonth)))),
    used: !deviceMonthMissing,
    needs: true,
    living: !!d.living && (d.living !== "residential" || d.residentBefore2023 !== undefined),
    household: !!d.household,
  };

  const finish = () => {
    const assessed = d.status === "assessed";
    const residential = d.living === "residential";
    const a: Answers = {
      city: d.city!,
      district: d.district!,
      age: d.age!,
      indigenous: !!d.indigenous,
      disabilityCert: !!d.disabilityCert,
      disabilityLevel: d.disabilityCert ? d.disabilityLevel : undefined,
      dementia: !!d.dementia,
      pac: !!d.pac,
      status: d.status!,
      level: assessed ? d.level : undefined,
      planApprovedMonth: assessed && d.planApprovedMonth ? d.planApprovedMonth : undefined,
      devicesUsed: assessed ? d.devicesUsed ?? 0 : undefined,
      deviceApprovedMonth: assessed && (d.devicesUsed ?? 0) > 0 ? d.deviceApprovedMonth : undefined,
      respiteUsed: assessed ? d.respiteUsed ?? 0 : undefined,
      disabilityDevice: assessed ? !!d.disabilityDevice : undefined,
      needs: d.needs ?? [],
      living: d.living!,
      residentBefore2023: residential ? d.residentBefore2023 : undefined,
      otherResidentialSubsidies: residential ? d.otherResidentialSubsidies ?? [] : undefined,
      household: d.household!,
    };
    setAnswers(a);
    setSelectedLevel(undefined);
    setDemo(null);
    navigate("/plan");
  };

  const next = () => (isLast ? finish() : setI(i + 1));
  const back = () => (i === 0 ? navigate("/") : setI(i - 1));
  const titleKey: Record<StepId, DictKey> = { location: "qCity", who: "qWho", status: "qStatus", used: "qUsed", needs: "qNeeds", living: "qLiving", household: "qHousehold" };
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Math.round(Number(v))));

  let body: ReactNode = null;
  if (step === "location") {
    if (!districts.data) body = <LoadState error={districts.error} onRetry={districts.retry} />;
    else
      body = (
        <div className="space-y-6">
          <Field label={t("city")} help={t("qCityHelp")}>
            <Choice label={t("city")} columns={2} options={CITIES.map((c) => ({ value: c, label: c }))} selected={d.city ? [d.city] : []} onToggle={(c) => set({ city: c, district: c === d.city ? d.district : undefined })} />
          </Field>
          {d.city && (
            <Field label={t("district")}>
              <Choice
                label={t("district")}
                columns={2}
                options={getDistricts(districts.data, d.city).map((x) => ({ value: x.district, label: x.district }))}
                selected={d.district ? [d.district] : []}
                onToggle={(v) => set({ district: v })}
              />
            </Field>
          )}
        </div>
      );
  } else if (step === "who") {
    body = (
      <div className="space-y-6">
        <Field label={t("age")}>
          <Choice
            label={t("age")}
            columns={2}
            options={[
              { value: "u50" as const, label: t("ageU50") },
              { value: "50_54" as const, label: t("age50") },
              { value: "55_64" as const, label: t("age55") },
              { value: "65plus" as const, label: t("age65") },
            ]}
            selected={d.age ? [d.age] : []}
            onToggle={(v) => set({ age: v })}
          />
        </Field>
        <Field label={t("conditionsLabel")}>
          <div className="space-y-2">
            <ToggleRow id="indigenous" label={t("indigenous")} checked={!!d.indigenous} onChange={(v) => set({ indigenous: v })} />
            <ToggleRow id="disability" label={t("disabilityCert")} checked={!!d.disabilityCert} onChange={(v) => set({ disabilityCert: v })} />
            {d.disabilityCert && (
              <div className="pl-4">
                <Choice
                  label={t("disabilityLevel")}
                  columns={4}
                  options={(["mild", "moderate", "severe", "profound"] as const).map((v) => ({ value: v, label: t(v) }))}
                  selected={d.disabilityLevel ? [d.disabilityLevel] : []}
                  onToggle={(v) => set({ disabilityLevel: v })}
                />
              </div>
            )}
            <ToggleRow id="dementia" label={t("dementia")} checked={!!d.dementia} onChange={(v) => set({ dementia: v })} />
            <ToggleRow id="pac" label={t("pac")} checked={!!d.pac} onChange={(v) => set({ pac: v })} />
          </div>
        </Field>
      </div>
    );
  } else if (step === "status") {
    body = (
      <div className="space-y-6">
        <Choice
          label={t("qStatus")}
          options={[
            { value: "never" as const, label: t("statusNever") },
            { value: "waiting" as const, label: t("statusWaiting") },
            { value: "assessed" as const, label: t("statusAssessed") },
            { value: "in_hospital" as const, label: t("statusHospital") },
          ]}
          selected={d.status ? [d.status] : []}
          onToggle={(v) => set({ status: v })}
        />
        {d.status === "assessed" && (
          <>
            <Field label={t("level")} help={t("levelHelp")}>
              <Choice label={t("level")} columns={4} options={LEVELS.map((l) => ({ value: l, label: String(l) }))} selected={d.level ? [d.level] : []} onToggle={(v) => set({ level: v })} />
            </Field>
            <Field label={t("planMonth")} help={t("planMonthHelp")} htmlFor="planMonth">
              <Input id="planMonth" type="month" placeholder="YYYY-MM" className="min-h-12 text-base" value={d.planApprovedMonth ?? ""} onChange={(e) => set({ planApprovedMonth: e.target.value || undefined })} />
            </Field>
          </>
        )}
      </div>
    );
  } else if (step === "used") {
    body = (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t("qUsedHelp")}</p>
        <Field label={t("devicesUsed")} htmlFor="devicesUsed">
          <Input id="devicesUsed" type="number" inputMode="numeric" min={0} step={100} className="min-h-12 text-base" value={d.devicesUsed ?? ""} onChange={(e) => set({ devicesUsed: num(e.target.value) })} />
        </Field>
        {(d.devicesUsed ?? 0) > 0 && (
          <Field label={t("deviceMonth")} htmlFor="deviceMonth" error={deviceMonthMissing ? t("deviceMonthRequired") : undefined}>
            <Input id="deviceMonth" type="month" placeholder="YYYY-MM" className="min-h-12 text-base" value={d.deviceApprovedMonth ?? ""} onChange={(e) => set({ deviceApprovedMonth: e.target.value || undefined })} />
          </Field>
        )}
        <Field label={t("respiteUsed")} htmlFor="respiteUsed">
          <Input id="respiteUsed" type="number" inputMode="numeric" min={0} step={100} className="min-h-12 text-base" value={d.respiteUsed ?? ""} onChange={(e) => set({ respiteUsed: num(e.target.value) })} />
        </Field>
        <Field label={t("disabilityDevice")}>
          <Choice
            label={t("disabilityDevice")}
            columns={2}
            options={[
              { value: "yes", label: t("yes") },
              { value: "no", label: t("no") },
            ]}
            selected={d.disabilityDevice === undefined ? [] : [d.disabilityDevice ? "yes" : "no"]}
            onToggle={(v) => set({ disabilityDevice: v === "yes" })}
          />
        </Field>
      </div>
    );
  } else if (step === "needs") {
    body = (
      <div className="space-y-3">
        <p className="text-muted-foreground">{t("qNeedsHelp")}</p>
        <Choice
          label={t("qNeeds")}
          multi
          columns={2}
          options={NEEDS.map((n) => ({ value: n, label: NEED_LABELS[n][lang] }))}
          selected={d.needs ?? []}
          onToggle={(n) => {
            const cur = d.needs ?? [];
            set({ needs: cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n] });
          }}
        />
      </div>
    );
  } else if (step === "living") {
    const subs: { value: OtherResidentialSubsidy | "none"; label: string }[] = [
      { value: "disability_residential", label: t("subDisability") },
      { value: "public_placement", label: t("subPlacement") },
      { value: "veterans_public_bed", label: t("subVeterans") },
      { value: "none", label: t("subNone") },
    ];
    const cur = d.otherResidentialSubsidies;
    body = (
      <div className="space-y-6">
        <Choice
          label={t("qLiving")}
          options={[
            { value: "home_family" as const, label: t("livingFamily") },
            { value: "home_none" as const, label: t("livingNone") },
            { value: "residential" as const, label: t("livingResidential") },
          ]}
          selected={d.living ? [d.living] : []}
          onToggle={(v) => set({ living: v })}
        />
        {d.living === "residential" && (
          <>
            <Field label={t("before2023")}>
              <Choice
                label={t("before2023")}
                columns={2}
                options={[
                  { value: "yes", label: t("yes") },
                  { value: "no", label: t("no") },
                ]}
                selected={d.residentBefore2023 === undefined ? [] : [d.residentBefore2023 ? "yes" : "no"]}
                onToggle={(v) => set({ residentBefore2023: v === "yes" })}
              />
            </Field>
            <Field label={t("otherSubs")}>
              <Choice
                label={t("otherSubs")}
                multi
                options={subs}
                selected={cur === undefined ? [] : cur.length === 0 ? ["none"] : cur}
                onToggle={(v) => {
                  if (v === "none") return set({ otherResidentialSubsidies: [] });
                  const list = cur ?? [];
                  set({ otherResidentialSubsidies: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
                }}
              />
            </Field>
          </>
        )}
      </div>
    );
  } else if (step === "household") {
    body = (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("qHouseholdHelp")}</p>
        <Choice
          label={t("qHousehold")}
          options={[
            { value: "type1" as const, label: t("hhType1") },
            { value: "type2" as const, label: t("hhType2") },
            { value: "type3" as const, label: t("hhType3") },
            { value: "unknown" as const, label: t("hhUnknown") },
          ]}
          selected={d.household ? [d.household] : []}
          onToggle={(v) => set({ household: v })}
        />
        {d.household === "unknown" && <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">{t("hhUnknownTip")}</p>}
      </div>
    );
  }

  return (
    <Page>
      <div className="mb-6 space-y-2">
        <p className="text-sm text-muted-foreground">{t("stepOf", { n: i + 1, total: steps.length })}</p>
        <Progress value={((i + 1) / steps.length) * 100} aria-label={t("stepOf", { n: i + 1, total: steps.length })} className="h-2" />
      </div>
      <h1 className="mb-6 text-2xl">{t(titleKey[step])}</h1>
      <div key={step} className="animate-fade-in">
        {body}
      </div>
      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="min-h-12 px-5" onClick={back}>
          <ArrowLeft className="mr-1 h-5 w-5" aria-hidden />
          {t("back")}
        </Button>
        <Button className="min-h-12 flex-1 text-base" onClick={next} disabled={!valid[step]}>
          {isLast ? t("seePlan") : t("next")}
          <ArrowRight className="ml-1 h-5 w-5" aria-hidden />
        </Button>
      </div>
    </Page>
  );
};

export default Start;
