const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

export function isFirecrawlEnabled(): boolean {
  return Boolean(process.env.APERO_J_FIRECRAWL_API_KEY?.trim());
}

export function firecrawlApiKey(): string | null {
  const key = process.env.APERO_J_FIRECRAWL_API_KEY?.trim();
  return key || null;
}

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    html?: string;
    markdown?: string;
  };
}

/** Optional paid fallback — scrape a URL via Firecrawl when local fetch/WAF blocks. */
export async function fetchHtmlViaFirecrawl(url: string): Promise<string | null> {
  const apiKey = firecrawlApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html"],
        onlyMainContent: false,
        timeout: 25_000,
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as FirecrawlScrapeResponse;
    const html = payload.data?.html?.trim();
    return html && html.length > 0 ? html : null;
  } catch {
    return null;
  }
}
