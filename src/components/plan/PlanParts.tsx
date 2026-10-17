import type { ReactNode } from "react";
import { ExternalLink, Info } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { ntd, pct } from "@/lib/i18n";
import type { LText } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MoneySplit({ govPays, youPay, rate, unit }: { govPays: number; youPay: number; rate: number; unit?: string }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-secondary p-3">
        <div className="text-sm text-secondary-foreground">{t("govPays")}</div>
        <div className="text-lg font-semibold text-primary sm:text-xl">
          {ntd(govPays)}
          {unit && <span className="whitespace-nowrap text-sm font-normal text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className="rounded-xl bg-accent/15 p-3">
        <div className="text-sm text-foreground">
          {t("youPay")} · {pct(rate)}
        </div>
        <div className="text-lg font-semibold text-foreground sm:text-xl">
          {ntd(youPay)}
          {unit && <span className="whitespace-nowrap text-sm font-normal text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function Notes({ items }: { items: (LText | undefined)[] }) {
  const { tx, t } = useLang();
  const list = items.filter(Boolean) as LText[];
  if (!list.length) return null;
  return (
    <details className="group mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 font-semibold text-muted-foreground">
        <Info className="h-4 w-4" aria-hidden />
        {t("notesTitle")}
      </summary>
      <ul className="mt-1 list-disc space-y-1 pb-1 pl-5 text-muted-foreground">
        {list.map((n, i) => (
          <li key={i}>{tx(n)}</li>
        ))}
      </ul>
    </details>
  );
}

export function SourceLinks({ urls }: { urls: (string | undefined)[] }) {
  const { t } = useLang();
  const list = urls.filter(Boolean) as string[];
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {list.map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-primary underline underline-offset-2">
          {t("source")}
          {list.length > 1 ? ` ${i + 1}` : ""}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ))}
    </div>
  );
}

export function BenefitCard({
  icon,
  title,
  subtitle,
  highlight,
  children,
  notes,
  sources,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  highlight?: boolean;
  children: ReactNode;
  notes?: (LText | undefined)[];
  sources: (string | undefined)[];
}) {
  return (
    <article className={cn("print-card rounded-2xl bg-card p-4 shadow-soft sm:p-5", highlight && "ring-2 ring-accent/60")}>
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span>
        <div>
          <h3 className="text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
      {notes && <Notes items={notes} />}
      <SourceLinks urls={sources} />
    </article>
  );
}

export function Callout({ tone, icon, title, children }: { tone: "info" | "warning" | "success" | "error"; icon: ReactNode; title: string; children?: ReactNode }) {
  const styles = {
    info: "border-primary/30 bg-secondary text-secondary-foreground",
    warning: "border-warning/40 bg-accent/10 text-foreground",
    success: "border-success/40 bg-success/10 text-foreground",
    error: "border-destructive/40 bg-destructive/5 text-foreground",
  }[tone];
  const iconColor = { info: "text-primary", warning: "text-warning", success: "text-success", error: "text-destructive" }[tone];
  return (
    <div className={cn("print-card flex gap-3 rounded-2xl border p-4", styles)}>
      <span className={cn("mt-0.5 shrink-0", iconColor)}>{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm">{children}</div>}
      </div>
    </div>
  );
}
