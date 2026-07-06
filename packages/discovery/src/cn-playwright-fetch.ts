import { isJsHeavyCnAggregatorUrl } from "./cn-sources.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IDLE_CLOSE_MS = 45_000;

type PlaywrightBrowser = import("playwright").Browser;
type PlaywrightPage = import("playwright").Page;

let sharedBrowser: PlaywrightBrowser | null = null;
let sharedBrowserUsedAt = 0;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;

export function isCnPlaywrightEnabled(): boolean {
  if (process.env.APERO_J_CN_PLAYWRIGHT === "false") return false;
  if (process.env.APERO_J_CN_PLAYWRIGHT === "true") return true;
  if (isAutomatedTestRun()) return false;
  return true;
}

function isAutomatedTestRun(): boolean {
  const mainArg = process.argv[1] ?? "";
  return (
    process.env.NODE_ENV === "test" ||
    process.argv.includes("--test") ||
    /\.test\.(?:js|cjs|mjs)(?:$|\?)/.test(mainArg)
  );
}

/** True when plain HTTP HTML looks like an empty SPA shell for a CN board or gov portal. */
export function needsPlaywrightRender(
  html: string,
  url: string,
  parsedItemCount = 0,
): boolean {
  if (isJsHeavyCnAggregatorUrl(url)) {
    if (parsedItemCount >= 2) return false;
    if (/job_detail|jobdetail|\/geek\/job|\/jobs\//i.test(html)) return false;
    if (html.length < 2500) return true;
    if (/__NEXT_DATA__|__INITIAL_STATE__|id="app"|id="root"/i.test(html)) return true;
    return parsedItemCount === 0;
  }

  return false;
}

function scheduleIdleBrowserClose(): void {
  if (idleCloseTimer) clearTimeout(idleCloseTimer);
  idleCloseTimer = setTimeout(() => {
    void closeSharedBrowser();
  }, IDLE_CLOSE_MS);
}

async function loadChromiumBrowser(): Promise<PlaywrightBrowser> {
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function borrowSharedBrowser(): Promise<PlaywrightBrowser> {
  if (sharedBrowser?.isConnected()) {
    sharedBrowserUsedAt = Date.now();
    scheduleIdleBrowserClose();
    return sharedBrowser;
  }

  sharedBrowser = await loadChromiumBrowser();
  sharedBrowserUsedAt = Date.now();
  scheduleIdleBrowserClose();
  return sharedBrowser;
}

export async function closeSharedBrowser(): Promise<void> {
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
  if (!sharedBrowser) return;
  await sharedBrowser.close().catch(() => undefined);
  sharedBrowser = null;
}

const CN_JOB_SELECTORS = [
  'a[href*="job_detail"]',
  'a[href*="jobdetail"]',
  'a[href*="/geek/job"]',
  'a[href*="51job.com"]',
  ".job-list-box",
  ".job-card-wrapper",
  ".positionlist",
  ".news-list a",
  ".list-text a",
  "ul.list li a",
];

function parseCookieHeader(cookieHeader: string, url: string): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
}> {
  let hostname = "localhost";
  try {
    hostname = new URL(url).hostname;
  } catch {
    // keep default
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq <= 0) return null;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!name || !value) return null;
      return { name, value, domain: hostname, path: "/" };
    })
    .filter((row): row is { name: string; value: string; domain: string; path: string } => row != null);
}

export async function withCnPlaywrightPage<T>(
  url: string,
  fn: (page: PlaywrightPage) => Promise<T>,
  options?: { cookieHeader?: string },
): Promise<T | null> {
  if (!isCnPlaywrightEnabled()) return null;

  try {
    const browser = await borrowSharedBrowser();
    const context = await browser.newContext({
      locale: "zh-CN",
      userAgent: BROWSER_USER_AGENT,
      extraHTTPHeaders: {
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    try {
      if (options?.cookieHeader?.trim()) {
        const cookies = parseCookieHeader(options.cookieHeader.trim(), url);
        if (cookies.length > 0) {
          await context.addCookies(cookies);
        }
      }

      const page = await context.newPage();
      return await fn(page);
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

export async function fetchHtmlWithPlaywright(url: string): Promise<string | null> {
  if (!isCnPlaywrightEnabled()) return null;

  return withCnPlaywrightPage(url, async (page) => {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    for (const selector of CN_JOB_SELECTORS) {
      const found = await page.waitForSelector(selector, { timeout: 2_500 }).catch(() => null);
      if (found) break;
    }

    await page.waitForTimeout(800);
    return page.content();
  });
}
