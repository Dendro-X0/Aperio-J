import type { RawFeedItem } from "@aperio-j/core";

const JSON_LD_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

interface JsonLdNode {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: { address?: { addressLocality?: string } };
  url?: string;
}

function nodeTypes(node: JsonLdNode): string[] {
  const raw = node["@type"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function isJobPosting(node: JsonLdNode): boolean {
  return nodeTypes(node).some((type) => type.toLowerCase() === "jobposting");
}

function flattenJsonLd(value: unknown): JsonLdNode[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenJsonLd(entry));
  }

  const node = value as JsonLdNode & { "@graph"?: unknown };
  const nodes: JsonLdNode[] = [node];
  if (node["@graph"]) {
    nodes.push(...flattenJsonLd(node["@graph"]));
  }
  return nodes;
}

function locationFromNode(node: JsonLdNode): string {
  return node.jobLocation?.address?.addressLocality?.trim() ?? "";
}

function employerFromNode(node: JsonLdNode): string {
  return node.hiringOrganization?.name?.trim() ?? "";
}

/** Extract JobPosting rows from JSON-LD script blocks in HTML. */
export function extractJobPostingsFromJsonLd(
  html: string,
  pageUrl: string,
  sourceId: string,
): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = JSON_LD_RE.exec(html))) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    for (const node of flattenJsonLd(parsed)) {
      if (!isJobPosting(node)) continue;

      const title = node.title?.trim();
      if (!title) continue;

      const url = node.url?.trim() || pageUrl;
      if (seen.has(url)) continue;
      seen.add(url);

      const employer = employerFromNode(node);
      const location = locationFromNode(node);
      const description = node.description?.trim() ?? "";
      const body = [employer, location, description].filter(Boolean).join("\n");

      items.push({
        title,
        body,
        url,
        sourceId,
        fetchedAt: node.datePosted ?? new Date().toISOString(),
      });
    }
  }

  return items;
}
