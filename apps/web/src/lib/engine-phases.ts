export type MatchPipelinePhase =
  | "preparing"
  | "discovering_sources"
  | "scanning_feeds"
  | "parsing_listings"
  | "matching"
  | "saving";

export type SourceDiscoveryPhase = "preparing" | "searching" | "validating" | "saving";

export interface EnginePhaseEvent {
  type: "phase";
  phase: MatchPipelinePhase | SourceDiscoveryPhase;
  detail?: string;
}

export interface EngineResultEvent<T> {
  type: "result";
  payload: T;
}

export interface EngineErrorEvent {
  type: "error";
  message: string;
}

export type EngineStreamEvent<T> = EnginePhaseEvent | EngineResultEvent<T> | EngineErrorEvent;

export interface MatchPipelineProgressOptions {
  onPhase?: (phase: MatchPipelinePhase, detail?: string) => void;
  signal?: AbortSignal;
}

export interface SourceDiscoveryProgressOptions {
  onPhase?: (phase: SourceDiscoveryPhase, detail?: string) => void;
  signal?: AbortSignal;
}

export interface ReadEngineStreamOptions {
  signal?: AbortSignal;
}

/** Read NDJSON progress events from a streaming engine API response. */
export async function readEngineStream<T>(
  response: Response,
  onPhase?: (phase: string, detail?: string) => void,
  options?: ReadEngineStreamOptions,
): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  if (!response.body) {
    return (await response.json()) as T;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: T | null = null;
  const signal = options?.signal;

  const abortReader = () => {
    void reader.cancel();
  };

  if (signal?.aborted) {
    abortReader();
    throw new DOMException("Aborted", "AbortError");
  }

  signal?.addEventListener("abort", abortReader, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const event = JSON.parse(trimmed) as EngineStreamEvent<T>;
        if (event.type === "phase") {
          onPhase?.(event.phase, event.detail);
        } else if (event.type === "result") {
          result = event.payload;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }

    if (buffer.trim()) {
      const event = JSON.parse(buffer.trim()) as EngineStreamEvent<T>;
      if (event.type === "result") result = event.payload;
      if (event.type === "error") throw new Error(event.message);
    }
  } finally {
    signal?.removeEventListener("abort", abortReader);
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  if (!result) {
    throw new Error("Engine finished without a result payload");
  }

  return result;
}
