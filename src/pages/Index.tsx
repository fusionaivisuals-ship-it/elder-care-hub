import { Link } from "react-router-dom";
import { ArrowRight, BellRing, Calculator, HeartPulse, Hospital, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { Page, Section, StatCard } from "@/components/Shell";
import { usePlan } from "@/context/PlanContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DATA_UPDATED } from "@/lib/i18n";

const Index = () => {
  const { t } = useLang();
  const { setDraft, setAnswers, setSelectedLevel, setDemo, setWizardStep } = usePlan();
  useDocumentTitle("");

  const fresh = () => {
    setDraft({ needs: [] });
    setAnswers(null);
    setSelectedLevel(undefined);
    setDemo(null);
    setWizardStep(0);
  };

  const demos = [
    { n: 1, title: t("demo1"), sub: t("demo1Sub"), icon: Hospital },
    { n: 2, title: t("demo2"), sub: t("demo2Sub"), icon: BellRing },
  ];
  const how = [
    { icon: Calculator, text: t("how1") },
    { icon: BellRing, text: t("how2") },
    { icon: PhoneCall, text: t("how3") },
  ];

  return (
    <Page>
      <section className="pt-4">
        <HeartPulse className="mb-4 h-10 w-10 text-accent" aria-hidden />
        <h1 className="text-3xl leading-tight text-foreground sm:text-4xl">{t("heroTitle")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("heroSub")}</p>
        <p className="mt-1 text-muted-foreground">{t("heroPromise")}</p>
        <Button asChild size="lg" className="mt-6 min-h-14 w-full rounded-2xl text-lg sm:w-auto sm:px-10" onClick={fresh}>
          <Link to="/start">
            {t("start")}
            <ArrowRight className="ml-1 h-5 w-5" aria-hidden />
          </Link>
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">{t("startHint")}</p>
      </section>

      <Section title={t("demoTitle")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {demos.map((d) => (
            <Link
              key={d.n}
              to={`/plan?demo=${d.n}`}
              className="group flex min-h-24 items-start gap-3 rounded-2xl border border-transparent bg-card p-4 shadow-soft transition-colors duration-150 hover:border-primary/30"
            >
              <d.icon className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold text-foreground">{d.title}</span>
                <span className="block text-sm text-muted-foreground">{d.sub}</span>
              </span>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </Section>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="stats">
        <StatCard value="20.7%" label={t("stat1")} />
        <StatCard value="2,666" label={t("stat2")} />
        <StatCard value={DATA_UPDATED} label={t("stat3")} />
      </section>

      <Section title={t("howTitle")}>
        <ul className="space-y-3">
          {how.map((h, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <h.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="pt-1.5">{h.text}</span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
};

export default Index;
