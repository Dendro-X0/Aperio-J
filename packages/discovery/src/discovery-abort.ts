export class DiscoveryAbortedError extends Error {
  constructor(message = "Discovery was cancelled") {
    super(message);
    this.name = "DiscoveryAbortedError";
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DiscoveryAbortedError();
  }
}

export function isDiscoveryAborted(error: unknown): boolean {
  return (
    error instanceof DiscoveryAbortedError ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
