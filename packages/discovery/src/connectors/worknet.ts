import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isKoreanCity } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const WORKNET_API = "https://openapi.work.go.kr/opi/opi/opia/wantedApi.do";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

export interface WorknetJob {
  wantedAuthNo?: string;
  company?: string;
  title?: string;
  salTpNm?: string;
  sal?: string;
  minSal?: string;
  maxSal?: string;
  region?: string;
  basicAddr?: string;
  closeDt?: string;
  wantedInfoUrl?: string;
}

function worknetAuthKey(): string | null {
  const authKey = process.env.APERO_J_WORKNET_AUTH_KEY?.trim();
  return authKey || null;
}

function pickXmlTag(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return match?.[1]?.trim() || null;
}

export function parseWorknetXml(xml: string): WorknetJob[] {
  const jobs: WorknetJob[] = [];
  const blocks = xml.match(/<wanted>[\s\S]*?<\/wanted>/gi) ?? [];

  for (const block of blocks) {
    const title = pickXmlTag(block, "title");
    const url = pickXmlTag(block, "wantedInfoUrl");
    if (!title || !url) continue;

    jobs.push({
      wantedAuthNo: pickXmlTag(block, "wantedAuthNo") ?? undefined,
      company: pickXmlTag(block, "company") ?? undefined,
      title,
      salTpNm: pickXmlTag(block, "salTpNm") ?? undefined,
      sal: pickXmlTag(block, "sal") ?? undefined,
      minSal: pickXmlTag(block, "minSal") ?? undefined,
      maxSal: pickXmlTag(block, "maxSal") ?? undefined,
      region: pickXmlTag(block, "region") ?? undefined,
      basicAddr: pickXmlTag(block, "basicAddr") ?? undefined,
      closeDt: pickXmlTag(block, "closeDt") ?? undefined,
      wantedInfoUrl: url,
    });
  }

  return jobs;
}

function formatWorknetSalary(job: WorknetJob): string | null {
  const min = job.minSal ? Number(job.minSal) : NaN;
  const max = job.maxSal ? Number(job.maxSal) : NaN;
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `Salary: ${min.toLocaleString()} – ${max.toLocaleString()}${job.salTpNm ? ` (${job.salTpNm})` : ""}`;
  }
  if (job.sal) return `Salary: ${job.sal}${job.salTpNm ? ` (${job.salTpNm})` : ""}`;
  return null;
}

export function normalizeWorknetJobs(jobs: WorknetJob[], streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of jobs) {
    const title = job.title?.trim();
    const url = job.wantedInfoUrl?.trim();
    if (!title || !url) continue;

    items.push({
      title,
      body: joinBodyParts([
        job.company ? `Company: ${job.company}` : null,
        job.region || job.basicAddr ? `Location: ${[job.region, job.basicAddr].filter(Boolean).join(", ")}` : null,
        formatWorknetSalary(job),
        job.closeDt ? `Closing: ${job.closeDt}` : null,
        job.wantedAuthNo ? `Ref: ${job.wantedAuthNo}` : null,
      ]),
      url,
      sourceId: streamId,
      fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchWorknetLive(query: ConnectorQuery): Promise<WorknetJob[]> {
  const authKey = worknetAuthKey();
  if (!authKey) {
    throw new Error("Worknet API credentials missing (APERO_J_WORKNET_AUTH_KEY)");
  }

  const url = new URL(WORKNET_API);
  url.searchParams.set("authKey", authKey);
  url.searchParams.set("callTp", "L");
  url.searchParams.set("returnType", "XML");
  url.searchParams.set("startPage", "1");
  url.searchParams.set("display", String(Math.min(100, connectorMaxItems())));
  url.searchParams.set("keyword", query.search.trim() || "개발");

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/xml, text/xml",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Worknet API HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseWorknetXml(xml);
}

async function fetchWorknet(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const jobs = useConnectorFixtures()
    ? (((await loadConnectorFixture("worknet-kr")) as { jobs?: WorknetJob[] }).jobs ?? [])
    : await fetchWorknetLive(query);

  return normalizeWorknetJobs(jobs, streamId);
}

export const worknetConnector: ConnectorDefinition = {
  id: "worknet",
  label: "Worknet (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city || !isKoreanCity(city)) return false;
    return Boolean(worknetAuthKey()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "개발";
    return {
      id: "worknet",
      search,
      city: profile.constraints.primaryCity.trim(),
      country: "kr",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchWorknet,
};
