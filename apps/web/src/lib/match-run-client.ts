import type { InboxItem } from "@/lib/match-service";
import type { MatchPipelinePhase } from "@/lib/engine-phases";
import { readEngineStream } from "@/lib/engine-phases";

export interface MatchRunInboxPayload {
  items: InboxItem[];
  excludedItems?: InboxItem[];
  ranAt: string;
  opportunityCount: number;
  matchedCount: number;
  excludedCount?: number;
  fetchErrors: string[];
  sourceDiscoveryErrors?: string[];
  streamCount?: number;
  usedFixtureFallback?: boolean;
  cnCaptureFirst?: boolean;
  cnRemoteFirst?: boolean;
  remoteFirst?: boolean;
}

export type MatchRunStatus = "idle" | "running" | "completed" | "error" | "cancelled";

export interface MatchRunState {
  status: MatchRunStatus;
  phase: MatchPipelinePhase;
  phaseDetail?: string;
  error?: string;
  result?: MatchRunInboxPayload;
  startedAt?: string;
  completedAt?: string;
}

type MatchRunListener = (state: MatchRunState) => void;

const IDLE_STATE: MatchRunState = {
  status: "idle",
  phase: "preparing",
};

let state: MatchRunState = { ...IDLE_STATE };
let abortController: AbortController | null = null;
let inflight: Promise<MatchRunInboxPayload> | null = null;
const listeners = new Set<MatchRunListener>();

function emit(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function setState(patch: Partial<MatchRunState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getMatchRunState(): MatchRunState {
  return state;
}

export function subscribeMatchRun(listener: MatchRunListener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function cancelMatchRun(): void {
  abortController?.abort();
}

export function clearMatchRunCompletion(): void {
  if (state.status === "completed" || state.status === "error" || state.status === "cancelled") {
    state = { ...IDLE_STATE };
    emit();
  }
}

/** Start (or join) a match pipeline run — survives page navigation until cancel or completion. */
export function startMatchRun(): Promise<MatchRunInboxPayload> {
  if (inflight) return inflight;

  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;

  setState({
    status: "running",
    phase: "preparing",
    phaseDetail: undefined,
    error: undefined,
    result: undefined,
    startedAt: new Date().toISOString(),
    completedAt: undefined,
  });

  inflight = (async () => {
    try {
      const payload = await readEngineStream<MatchRunInboxPayload>(
        await fetch("/api/match/run?stream=1", {
          method: "POST",
          signal: controller.signal,
        }),
        (phase, detail) => {
          setState({
            phase: phase as MatchPipelinePhase,
            phaseDetail: detail,
          });
        },
        { signal: controller.signal },
      );

      setState({
        status: "completed",
        phase: "saving",
        result: payload,
        completedAt: new Date().toISOString(),
        error: undefined,
      });
      return payload;
    } catch (error) {
      if (controller.signal.aborted) {
        setState({
          status: "cancelled",
          error: undefined,
          completedAt: new Date().toISOString(),
        });
        throw error;
      }

      const message = error instanceof Error ? error.message : "Match refresh failed";
      setState({
        status: "error",
        error: message,
        completedAt: new Date().toISOString(),
      });
      throw error;
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
      inflight = null;
    }
  })();

  return inflight;
}
