import type { ConnectorId } from "./connectors/types.js";
import type { StreamConfig } from "./fetch-streams.js";

export type StreamFetchErrorKind = "auth" | "rate_limit" | "empty" | "other";

export interface ClassifiedStreamFetchError {
  label: string;
  kind: StreamFetchErrorKind;
  detail: string;
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

export function classifyStreamFetchFailure(
  label: string,
  message: string,
  config?: Pick<StreamConfig, "kind" | "connectorId">,
): ClassifiedStreamFetchError {
  const normalized = normalizeMessage(message);
  const connectorId = config?.connectorId;

  if (/^0 items$/.test(normalized) || normalized.endsWith(": 0 items")) {
    return { label, kind: "empty", detail: "No listings returned" };
  }

  if (
    /\b401\b/.test(normalized) ||
    /\b403\b/.test(normalized) ||
    /unauthorized|forbidden|invalid credentials|credentials missing|authentication|api key|app_key|app_id|client_secret|oauth/.test(
      normalized,
    ) ||
    (connectorId === "adzuna" && /\b(401|403)\b/.test(normalized)) ||
    (connectorId === "reed" && /\b(401|403)\b/.test(normalized)) ||
    (connectorId === "usajobs" && /\b(401|403)\b/.test(normalized)) ||
    (connectorId === "francetravail" && /\b(401|403)\b/.test(normalized)) ||
    (connectorId === "worknet" && /\b(401|403)\b/.test(normalized))
  ) {
    return {
      label,
      kind: "auth",
      detail:
        connectorAuthHint(connectorId) ??
        (connectorId === "adzuna"
          ? "Check Adzuna app id and key"
          : message),
    };
  }

  if (
    /\b429\b/.test(normalized) ||
    /rate limit|too many requests|quota exceeded|daily limit/.test(normalized)
  ) {
    return { label, kind: "rate_limit", detail: message };
  }

  return { label, kind: "other", detail: message };
}

export function formatClassifiedStreamFetchError(error: ClassifiedStreamFetchError): string {
  return `${error.label} [${error.kind}]: ${error.detail}`;
}

export function parseClassifiedStreamFetchError(raw: string): ClassifiedStreamFetchError | null {
  const match = /^(.*) \[(auth|rate_limit|empty|other)\]: (.*)$/.exec(raw);
  if (!match) return null;
  return {
    label: match[1]!,
    kind: match[2] as StreamFetchErrorKind,
    detail: match[3]!,
  };
}

export function connectorAuthHint(connectorId?: ConnectorId): string | null {
  if (connectorId === "adzuna") {
    return "Add Adzuna credentials in Settings → API connectors";
  }
  if (connectorId === "reed") {
    return "Add Reed API key in Settings → API connectors";
  }
  if (connectorId === "usajobs") {
    return "Add USAJobs API key and email in Settings → API connectors";
  }
  if (connectorId === "francetravail") {
    return "Add France Travail client id and secret in Settings → API connectors";
  }
  if (connectorId === "worknet") {
    return "Add Worknet auth key in Settings → API connectors";
  }
  return null;
}
