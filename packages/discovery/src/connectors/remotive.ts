import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { stripEmptySalaryLines } from "../salary-format.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const REMOTIVE_API = "https://remotive.com/api/remote-jobs";

interface RemotiveJob {
  id?: number;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  job_type?: string;
  salary?: string;
  description?: string;
  publication_date?: string;
  url?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

function normalizeRemotiveSalary(salary?: string): string | null {
  const trimmed = salary?.trim();
  if (!trimmed) return null;
  const line = `Salary: ${trimmed}`;
  const cleaned = stripEmptySalaryLines(line);
  return cleaned || null;
}

function normalizeRemotiveJob(job: RemotiveJob, streamId: string, fetchedAt: string): RawFeedItem | null {
  const title = job.title?.trim();
  const url = job.url?.trim();
  if (!title || !url) return null;

  return {
    title,
    body: joinBodyParts([
      job.company_name ? `Company: ${job.company_name}` : null,
      job.candidate_required_location ? `Location: ${job.candidate_required_location}` : null,
      job.job_type ? `Type: ${job.job_type}` : null,
      normalizeRemotiveSalary(job.salary),
      job.description,
    ]),
    url,
    sourceId: streamId,
    fetchedAt,
  };
}

export function normalizeRemotiveResponse(
  payload: RemotiveResponse,
  streamId: string,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.jobs ?? []) {
    const row = normalizeRemotiveJob(job, streamId, fetchedAt);
    if (row) items.push(row);
  }

  return capItems(items, connectorMaxItems());
}

async function fetchRemotiveLive(query: ConnectorQuery): Promise<RemotiveResponse> {
  const url = new URL(REMOTIVE_API);
  if (query.search) url.searchParams.set("search", query.search);
  url.searchParams.set("limit", String(connectorMaxItems()));

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": "aperio-j/0.3 (+connector; https://github.com/aperio-j)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Remotive API HTTP ${response.status}`);
  }

  return (await response.json()) as RemotiveResponse;
}

async function fetchRemotive(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("remotive")) as RemotiveResponse)
    : await fetchRemotiveLive(query);

  return normalizeRemotiveResponse(payload, streamId);
}

export const remotiveConnector: ConnectorDefinition = {
  id: "remotive",
  label: "Remotive API",

  supports(profile) {
    return profile.constraints.remotePreference !== "onsite-only";
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "developer";
    return {
      id: "remotive",
      search,
      city: profile.constraints.primaryCity.trim(),
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchRemotive,
};
