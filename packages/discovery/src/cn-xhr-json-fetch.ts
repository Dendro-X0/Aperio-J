import type { RawFeedItem } from "@aperio-j/core";
import { isJsHeavyCnAggregatorUrl } from "./cn-sources.js";
import { isCnPlaywrightEnabled, withCnPlaywrightPage } from "./cn-playwright-fetch.js";
import { isCnXhrApiUrl, parseCnXhrJsonBodies } from "./cn-xhr-json-parse.js";
import type { StreamSessionAuth } from "./stream-auth.js";

export function isCnXhrJsonFetchEnabled(): boolean {
  if (process.env.APERO_J_CN_XHR_JSON === "false") return false;
  return isCnPlaywrightEnabled();
}

export function supportsCnXhrJsonFetch(url: string): boolean {
  if (!isJsHeavyCnAggregatorUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("zhipin.com") || host.includes("zhaopin.com");
  } catch {
    return false;
  }
}

function cookieHeaderFromAuth(auth?: StreamSessionAuth): string | undefined {
  if (!auth || auth.mode !== "cookie" || !auth.secret?.trim()) return undefined;
  return auth.secret.trim();
}

/**
 * Load a CN board list page in Playwright and capture job-list XHR JSON responses.
 * Avoids parsing empty SPA HTML shells when the board exposes list APIs.
 */
export async function fetchCnJobListViaXhrIntercept(
  url: string,
  sourceId: string,
  sessionAuth?: StreamSessionAuth,
  profileCities?: string[],
): Promise<RawFeedItem[]> {
  if (!isCnXhrJsonFetchEnabled() || !supportsCnXhrJsonFetch(url)) {
    return [];
  }

  const capturedBodies: string[] = [];
  const pendingCaptures: Promise<void>[] = [];
  const cookieHeader = cookieHeaderFromAuth(sessionAuth);

  const result = await withCnPlaywrightPage(
    url,
    async (page) => {
      page.on("response", (response) => {
        pendingCaptures.push(
          (async () => {
            const responseUrl = response.url();
            if (!isCnXhrApiUrl(responseUrl)) return;
            if (!response.ok()) return;

            const contentType = response.headers()["content-type"] ?? "";
            if (!contentType.includes("json") && !responseUrl.includes(".json")) return;

            try {
              const body = await response.text();
              if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                capturedBodies.push(body);
              }
            } catch {
              // ignore read errors
            }
          })(),
        );
      });

      await page
        .goto(url, { waitUntil: "networkidle", timeout: 12_000 })
        .catch(async () => {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 18_000 });
        });

      await page.waitForTimeout(1_500);
      await Promise.allSettled(pendingCaptures);

      return capturedBodies.length;
    },
    { cookieHeader },
  );

  if (!result || capturedBodies.length === 0) {
    return [];
  }

  const { filterCnListPageItems } = await import("./cn-sources.js");
  const items = parseCnXhrJsonBodies(capturedBodies, url, sourceId, 30);
  return filterCnListPageItems(items, { profileCities });
}
