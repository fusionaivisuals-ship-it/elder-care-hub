import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { usePlan } from "@/context/PlanContext";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { lang, setLang, t } = useLang();
  return (
    <header className="no-print sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-4">
        <Link to="/" className="flex min-h-12 items-center gap-2 rounded-lg font-semibold text-primary">
          <MapPin className="h-6 w-6" aria-hidden />
          <span className="text-lg">{t("brand")}</span>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="min-h-12 min-w-12 rounded-full px-4 text-base"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          aria-label={t("langToggleLabel")}
        >
          {t("langToggle")}
        </Button>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  const { answers, draft, reset } = usePlan();
  const navigate = useNavigate();
  const hasData = !!answers || Object.keys(draft).some((k) => k !== "needs") || (draft.needs?.length ?? 0) > 0;
  return (
    <footer className="mt-12 border-t bg-card">
      <div className="mx-auto max-w-[720px] space-y-2 px-4 py-6 text-sm text-muted-foreground">
        <p>{t("footer")}</p>
        <p>{t("footerPrivacy")}</p>
        {hasData && (
          <Button
            variant="outline"
            size="sm"
            className="no-print mt-1 min-h-12"
            onClick={() => {
              reset();
              navigate("/");
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
            {t("clearAnswers")}
          </Button>
        )}
      </div>
    </footer>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className={cn("mx-auto w-full max-w-[720px] flex-1 animate-fade-in px-4 py-6", className)}>{children}</main>
      <Footer />
    </div>
  );
}

export function Section({ title, icon, children, className, id }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cn("mt-8", className)} aria-labelledby={id ? `${id}-h` : undefined}>
      <h2 id={id ? `${id}-h` : undefined} className="mb-3 flex items-center gap-2 text-xl text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="text-2xl font-semibold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function TierBadge({ tier, label }: { tier: "A" | "B" | "C"; label: string }) {
  const color = { A: "bg-tier-a text-white", B: "bg-tier-b text-foreground", C: "bg-tier-c text-white" }[tier];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", color)}>
      {tier}
      <span className="font-normal">{label}</span>
    </span>
  );
}

export function LoadState({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  const { t } = useLang();
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-soft">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
        <p>{t("loadError")}</p>
        {onRetry && (
          <Button onClick={onRetry} className="min-h-12">
            {t("retry")}
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {t("loading")}
    </div>
  );
}
