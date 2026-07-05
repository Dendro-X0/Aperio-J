import { isJsHeavyCnAggregatorUrl } from "./cn-sources.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IDLE_CLOSE_MS = 45_000;

type PlaywrightBrowser = import("playwright").Browser;

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

/** True when plain HTTP HTML looks like an empty SPA shell for a CN board. */
export function needsPlaywrightRender(
  html: string,
  url: string,
  parsedItemCount = 0,
): boolean {
  if (!isJsHeavyCnAggregatorUrl(url)) return false;
  if (parsedItemCount >= 2) return false;
  if (/job_detail|\/geek\/job|\/jobs\//i.test(html)) return false;
  if (html.length < 2500) return true;
  if (/__NEXT_DATA__|__INITIAL_STATE__|id="app"|id="root"/i.test(html)) return true;
  return parsedItemCount === 0;
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

const ZHIPIN_JOB_SELECTORS = [
  'a[href*="job_detail"]',
  'a[href*="/geek/job"]',
  ".job-list-box",
  ".job-card-wrapper",
];

export async function fetchHtmlWithPlaywright(url: string): Promise<string | null> {
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
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      for (const selector of ZHIPIN_JOB_SELECTORS) {
        await page.waitForSelector(selector, { timeout: 8_000 }).catch(() => undefined);
      }

      await page.waitForTimeout(1_500);
      return await page.content();
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}
