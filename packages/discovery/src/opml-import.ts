export interface OpmlFeedEntry {
  title: string;
  feedUrl: string;
}

function parseOutlineAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:-]+)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tag))) {
    attrs[match[1]!.toLowerCase()] = match[2] ?? "";
  }
  return attrs;
}

function normalizeFeedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function collectFeedsFromOutlineTag(tag: string, feeds: OpmlFeedEntry[]): void {
  const attrs = parseOutlineAttributes(tag);
  const xmlUrl = attrs.xmlurl?.trim();
  const htmlUrl = attrs.htmlurl?.trim();
  const type = attrs.type?.toLowerCase() ?? "";
  const title = attrs.title?.trim() || attrs.text?.trim() || "";

  if (xmlUrl) {
    const feedUrl = normalizeFeedUrl(xmlUrl);
    if (feedUrl) {
      feeds.push({ title: title || feedUrl, feedUrl });
    }
    return;
  }

  if (type === "rss" && htmlUrl) {
    const feedUrl = normalizeFeedUrl(htmlUrl);
    if (feedUrl) {
      feeds.push({ title: title || feedUrl, feedUrl });
    }
  }
}

/** Parse OPML XML and return RSS/Atom feed URLs (xmlUrl attributes). */
export function parseOpmlFeeds(xml: string, limit = 100): OpmlFeedEntry[] {
  const feeds: OpmlFeedEntry[] = [];
  const seen = new Set<string>();
  const outlineRe = /<outline\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = outlineRe.exec(xml))) {
    const before = feeds.length;
    collectFeedsFromOutlineTag(match[0]!, feeds);
    for (let index = before; index < feeds.length; index++) {
      const entry = feeds[index]!;
      if (seen.has(entry.feedUrl)) {
        feeds.pop();
        continue;
      }
      seen.add(entry.feedUrl);
    }
    if (feeds.length >= limit) break;
  }

  return feeds.slice(0, limit);
}
