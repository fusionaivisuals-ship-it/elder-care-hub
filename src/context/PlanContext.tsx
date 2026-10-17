import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Answers, Level } from "@/lib/types";

// Answers live only in memory (React state). Nothing is stored or sent anywhere.
interface PlanCtx {
  answers: Answers | null;
  setAnswers: (a: Answers | null) => void;
  draft: Partial<Answers>;
  setDraft: (d: Partial<Answers>) => void;
  /** Level tapped in the selector when the parent isn't assessed yet. Never pre-selected. */
  selectedLevel?: Level;
  setSelectedLevel: (l?: Level) => void;
  demo: 1 | 2 | null;
  setDemo: (d: 1 | 2 | null) => void;
}

const Ctx = createContext<PlanCtx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [draft, setDraft] = useState<Partial<Answers>>({ needs: [] });
  const [selectedLevel, setSelectedLevel] = useState<Level | undefined>();
  const [demo, setDemo] = useState<1 | 2 | null>(null);
  const value = useMemo(
    () => ({ answers, setAnswers, draft, setDraft, selectedLevel, setSelectedLevel, demo, setDemo }),
    [answers, draft, selectedLevel, demo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlan must be used inside PlanProvider");
  return c;
}
