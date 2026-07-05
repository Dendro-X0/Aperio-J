import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isSingaporeCity, normalizeCityForApi } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const MCF_API = "https://api.mycareersfuture.gov.sg/v2/jobs";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface McfCompany {
  name?: string;
  uen?: string;
}

interface McfSalary {
  minimum?: number;
  maximum?: number;
  type?: { salaryType?: string };
}

interface McfAddress {
  street?: string;
  postalCode?: string;
  districts?: Array<{ location?: string; region?: string }>;
}

interface McfMetadata {
  jobDetailsUrl?: string;
  newPostingDate?: string;
  originalPostingDate?: string;
}

interface McfJob {
  uuid?: string;
  title?: string;
  description?: string;
  postedCompany?: McfCompany;
  hiringCompany?: McfCompany | null;
  salary?: McfSalary;
  address?: McfAddress;
  metadata?: McfMetadata;
  categories?: Array<{ category?: string }>;
  employmentTypes?: Array<{ employmentType?: string }>;
}

interface McfResponse {
  results?: McfJob[];
}

function mcfJobUrl(job: McfJob): string | null {
  const direct = job.metadata?.jobDetailsUrl?.trim();
  if (direct) return direct;
  const uuid = job.uuid?.trim();
  if (uuid) return `https://www.mycareersfuture.gov.sg/job/${uuid}`;
  return null;
}

function formatMcfSalary(salary?: McfSalary): string | null {
  if (!salary || (salary.minimum == null && salary.maximum == null)) return null;
  const period = salary.type?.salaryType ?? "Monthly";
  if (salary.minimum != null && salary.maximum != null) {
    return `Salary: SGD ${salary.minimum.toLocaleString()} – ${salary.maximum.toLocaleString()} ${period}`;
  }
  if (salary.minimum != null) return `Salary: from SGD ${salary.minimum.toLocaleString()} ${period}`;
  return `Salary: up to SGD ${salary.maximum!.toLocaleString()} ${period}`;
}

function formatMcfLocation(address?: McfAddress): string | null {
  if (!address) return "Singapore";
  const district = address.districts?.[0]?.location ?? address.districts?.[0]?.region;
  const parts = [address.street, address.postalCode, district, "Singapore"].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Singapore";
}

function mcfCompanyName(job: McfJob): string | null {
  return job.hiringCompany?.name?.trim() || job.postedCompany?.name?.trim() || null;
}

function normalizeMcfJob(job: McfJob, streamId: string, fetchedAt: string): RawFeedItem | null {
  const title = job.title?.trim();
  const url = mcfJobUrl(job);
  if (!title || !url) return null;

  const company = mcfCompanyName(job);
  const posted =
    job.metadata?.newPostingDate?.trim() || job.metadata?.originalPostingDate?.trim() || null;

  return {
    title,
    body: joinBodyParts([
      company ? `Company: ${company}` : null,
      `Location: ${formatMcfLocation(job.address)}`,
      formatMcfSalary(job.salary),
      job.categories?.length
        ? `Category: ${job.categories.map((row) => row.category).filter(Boolean).join(", ")}`
        : null,
      job.employmentTypes?.length
        ? `Type: ${job.employmentTypes.map((row) => row.employmentType).filter(Boolean).join(", ")}`
        : null,
      posted ? `Posted: ${posted}` : null,
      job.description,
    ]),
    url,
    sourceId: streamId,
    fetchedAt: posted ? parseIsoDate(posted) : fetchedAt,
  };
}

export function normalizeMcfResponse(payload: McfResponse, streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.results ?? []) {
    const item = normalizeMcfJob(job, streamId, fetchedAt);
    if (item) items.push(item);
  }

  return capItems(items, connectorMaxItems());
}

async function fetchMcfLive(query: ConnectorQuery): Promise<McfResponse> {
  const url = new URL(MCF_API);
  url.searchParams.set("search", query.search.trim() || "software developer");
  url.searchParams.set("limit", String(Math.min(100, connectorMaxItems())));
  url.searchParams.set("page", "0");

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`MyCareersFuture API HTTP ${response.status}`);
  }

  return (await response.json()) as McfResponse;
}

async function fetchMcf(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("mycareersfuture-sg")) as McfResponse)
    : await fetchMcfLive(query);

  return normalizeMcfResponse(payload, streamId);
}

export const mycareersfutureConnector: ConnectorDefinition = {
  id: "mycareersfuture",
  label: "MyCareersFuture (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city) return false;
    return isSingaporeCity(city);
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "software developer";
    return {
      id: "mycareersfuture",
      search,
      city: normalizeCityForApi(profile.constraints.primaryCity.trim()),
      country: "sg",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchMcf,
};
