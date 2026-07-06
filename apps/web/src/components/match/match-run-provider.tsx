"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cancelMatchRun,
  clearMatchRunCompletion,
  getMatchRunState,
  startMatchRun,
  subscribeMatchRun,
  type MatchRunInboxPayload,
  type MatchRunState,
} from "@/lib/match-run-client";

interface MatchRunContextValue extends MatchRunState {
  start: () => Promise<MatchRunInboxPayload>;
  cancel: () => void;
  dismiss: () => void;
  isRunning: boolean;
}

const MatchRunContext = createContext<MatchRunContextValue | null>(null);

export function MatchRunProvider({ children }: { children: ReactNode }) {
  const [runState, setRunState] = useState<MatchRunState>(getMatchRunState);

  useEffect(() => subscribeMatchRun(setRunState), []);

  const start = useCallback(() => startMatchRun(), []);
  const cancel = useCallback(() => cancelMatchRun(), []);
  const dismiss = useCallback(() => clearMatchRunCompletion(), []);

  const value = useMemo<MatchRunContextValue>(
    () => ({
      ...runState,
      start,
      cancel,
      dismiss,
      isRunning: runState.status === "running",
    }),
    [runState, start, cancel, dismiss],
  );

  return (
    <MatchRunContext.Provider value={value}>{children}</MatchRunContext.Provider>
  );
}

export function useMatchRun(): MatchRunContextValue {
  const context = useContext(MatchRunContext);
  if (!context) {
    throw new Error("useMatchRun must be used within MatchRunProvider");
  }
  return context;
}
