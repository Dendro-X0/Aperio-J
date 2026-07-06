import type { RawFeedItem } from "@aperio-j/core";

const ZHIPIN_JOB_LIST_KEYS = new Set([
  "joblist",
  "jobList",
  "list",
  "positions",
  "positionList",
]);

const JOB_TITLE_KEYS = ["jobName", "jobTitle", "title", "name", "positionName", "positionTitle"];
const JOB_ID_KEYS = ["encryptJobId", "jobId", "positionId", "number", "positionNumber"];
const JOB_URL_KEYS = ["positionURL", "positionUrl", "jobUrl", "url", "link", "detailUrl"];
const EMPLOYER_KEYS = ["brandName", "companyName", "company", "orgName", "employerName"];
const CITY_KEYS = ["cityName", "city", "workCity", "locationName"];
const SALARY_KEYS = ["salaryDesc", "salary", "salaryString", "salaryRange"];

function readString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function buildZhipinJobUrl(item: Record<string, unknown>, baseUrl: string): string {
  const direct = readString(item, JOB_URL_KEYS);
  if (direct.startsWith("http")) return direct;

  const jobId = readString(item, JOB_ID_KEYS);
  if (!jobId) return "";

  const securityId = typeof item.securityId === "string" ? item.securityId : "";
  const origin = (() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return "https://www.zhipin.com";
    }
  })();

  const url = `${origin}/job_detail/${jobId}.html`;
  return securityId ? `${url}?securityId=${encodeURIComponent(securityId)}` : url;
}

function buildZhaopinJobUrl(item: Record<string, unknown>, baseUrl: string): string {
  const direct = readString(item, JOB_URL_KEYS);
  if (direct.startsWith("http")) return direct;
  if (direct.startsWith("/")) {
    try {
      return new URL(direct, baseUrl).href;
    } catch {
      return "";
    }
  }

  const number = readString(item, ["number", "positionNumber", "id"]);
  if (!number) return "";

  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    const cityHost = host.endsWith("zhaopin.com") ? host : "www.zhaopin.com";
    return `https://${cityHost}/jobdetail/${number}.htm`;
  } catch {
    return `https://www.zhaopin.com/jobdetail/${number}.htm`;
  }
}

function looksLikeJobRow(item: Record<string, unknown>): boolean {
  const title = readString(item, JOB_TITLE_KEYS);
  if (title.length < 2) return false;
  if (readString(item, JOB_ID_KEYS) || readString(item, JOB_URL_KEYS)) return true;
  if (readString(item, EMPLOYER_KEYS) && readString(item, CITY_KEYS)) return true;
  return JOB_TITLE_KEYS.some((key) => typeof item[key] === "string");
}

function rowToFeedItem(
  item: Record<string, unknown>,
  pageUrl: string,
  sourceId: string,
  fetchedAt: string,
): RawFeedItem | null {
  const title = readString(item, JOB_TITLE_KEYS);
  if (!title) return null;

  const host = (() => {
    try {
      return new URL(pageUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  const url = host.includes("zhipin.com")
    ? buildZhipinJobUrl(item, pageUrl)
    : host.includes("zhaopin.com")
      ? buildZhaopinJobUrl(item, pageUrl)
      : readString(item, JOB_URL_KEYS);

  if (!url || !url.startsWith("http")) return null;

  const employer = readString(item, EMPLOYER_KEYS);
  const city = readString(item, CITY_KEYS);
  const salary = readString(item, SALARY_KEYS);
  const body = [employer, city, salary].filter(Boolean).join(" · ") || title;

  return { title, body, url, sourceId, fetchedAt };
}

function collectJobRows(value: unknown, rows: Record<string, unknown>[]): void {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const row = entry as Record<string, unknown>;
        if (looksLikeJobRow(row)) rows.push(row);
      }
      collectJobRows(entry, rows);
    }
    return;
  }

  if (typeof value !== "object") return;

  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (ZHIPIN_JOB_LIST_KEYS.has(key) && Array.isArray(obj[key])) {
      for (const entry of obj[key] as unknown[]) {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const row = entry as Record<string, unknown>;
          if (looksLikeJobRow(row)) rows.push(row);
        }
      }
    }
  }

  for (const nested of Object.values(obj)) {
    if (nested && typeof nested === "object") {
      collectJobRows(nested, rows);
    }
  }
}

/** Parse one or more XHR JSON bodies captured from a CN job board page. */
export function parseCnXhrJsonBodies(
  bodies: string[],
  pageUrl: string,
  sourceId: string,
  limit = 30,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];

  for (const body of bodies) {
    try {
      collectJobRows(JSON.parse(body), rows);
    } catch {
      // skip invalid JSON
    }
  }

  const seen = new Set<string>();
  const items: RawFeedItem[] = [];

  for (const row of rows) {
    const item = rowToFeedItem(row, pageUrl, sourceId, fetchedAt);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
    if (items.length >= limit) break;
  }

  return items;
}

export function isCnXhrApiUrl(url: string): boolean {
  return /\/wapi\/|joblist\.json|\/api\/.*(?:job|search|position)|positions\/search|search\/positions/i.test(
    url,
  );
}
