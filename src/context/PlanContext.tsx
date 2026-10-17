import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearSession, KEYS, load, save } from "@/lib/storage";
import type { Answers, Level } from "@/lib/types";

// Answers live in React state and are mirrored to sessionStorage so a refresh keeps the family's place.
// sessionStorage stays on this device and is cleared when the tab closes; nothing is sent anywhere.
interface Saved {
  answers: Answers | null;
  draft: Partial<Answers>;
  wizardStep: number;
  selectedLevel?: Level;
  demo: 1 | 2 | null;
}

interface PlanCtx extends Saved {
  setAnswers: (a: Answers | null) => void;
  setDraft: (d: Partial<Answers>) => void;
  setWizardStep: (n: number) => void;
  /** Level tapped in the selector when the parent isn't assessed yet. Never pre-selected. */
  setSelectedLevel: (l?: Level) => void;
  setDemo: (d: 1 | 2 | null) => void;
  /** Forget everything saved for this session. */
  reset: () => void;
}

const EMPTY: Saved = { answers: null, draft: { needs: [] }, wizardStep: 0, selectedLevel: undefined, demo: null };
const Ctx = createContext<PlanCtx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(() => ({ ...EMPTY, ...load<Partial<Saved>>("session", KEYS.plan, {}) }));

  useEffect(() => {
    save("session", KEYS.plan, state);
  }, [state]);

  const patch = useCallback((p: Partial<Saved>) => setState((s) => ({ ...s, ...p })), []);
  const reset = useCallback(() => {
    clearSession();
    setState(EMPTY);
  }, []);

  const value = useMemo<PlanCtx>(
    () => ({
      ...state,
      setAnswers: (answers) => patch({ answers }),
      setDraft: (draft) => patch({ draft }),
      setWizardStep: (wizardStep) => patch({ wizardStep }),
      setSelectedLevel: (selectedLevel) => patch({ selectedLevel }),
      setDemo: (demo) => patch({ demo }),
      reset,
    }),
    [state, patch, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlan must be used inside PlanProvider");
  return c;
}
