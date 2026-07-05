import { stripHtml } from "./display-localize";

export type BodyBlock =
  | { kind: "heading"; level: 1 | 2; text: string }
  | { kind: "paragraph"; text: string };

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

const ALLOWED_HTML_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
]);

export function looksLikeStructuredHtml(text: string): boolean {
  return /<(p|br|div|ul|ol|li|h[1-6]|strong|b|em|a)\b/i.test(text);
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function extractHref(attrs: string): string | null {
  const match = attrs.match(/href=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

/** Allowlist sanitizer for scraped HTML job descriptions. */
export function sanitizeJobHtml(html: string): string {
  let output = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  output = output.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tag)) return "";

    if (match.startsWith("</")) {
      return tag === "br" ? "" : `</${tag}>`;
    }

    if (tag === "br") return "<br />";

    if (tag === "a") {
      const href = extractHref(attrs);
      if (!href || !/^https?:\/\//i.test(href)) return "";
      return `<a href="${escapeHtmlAttr(href)}" target="_blank" rel="noreferrer">`;
    }

    return `<${tag}>`;
  });

  return output.trim();
}

function isMajorHeading(text: string): boolean {
  const words = text
    .replace(/:+\s*$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 2 || text.length > 80) return false;

  return words.every((word) => {
    if (word === "&") return true;
    return /^[A-Z0-9/&-]+$/.test(word) && /[A-Z]/.test(word);
  });
}

function isSubHeadingLabel(text: string): boolean {
  const core = text.replace(/:+\s*$/, "").trim();
  const words = core.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6 || core.length > 80) return false;
  if (words.every((word) => /^[A-Z0-9/&-]+$/.test(word))) return false;
  return words.every((word) => /^[A-Z][a-zA-Z/&-]*$/.test(word));
}

function findNextMajorHeaderIndex(text: string, from = 0): number {
  const re = /\s+[A-Z]{2,}(?:\s+[A-Z]{2,})+/g;
  re.lastIndex = from;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index + match[0].search(/\S/);
    const candidate = text.slice(start).match(/^([A-Z]{2,}(?:\s+[A-Z]{2,})+)/);
    if (candidate && isMajorHeading(candidate[1])) {
      return start;
    }
  }

  return -1;
}

function findNextSubHeaderIndex(text: string, from = 0): number {
  const re = /\s+[A-Z][a-z]+(?:\s+[A-Za-z/&-]+){1,5}:\s+/g;
  re.lastIndex = from;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index + match[0].search(/\S/);
    const labelMatch = text.slice(start).match(/^([A-Z][a-z]+(?:\s+[A-Za-z/&-]+){1,5}):/);
    if (labelMatch && isSubHeadingLabel(`${labelMatch[1]}:`)) {
      return start;
    }
  }

  return -1;
}

function segmentPlainJobBody(text: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let remaining = text.replace(/\r\n/g, "\n").trim();

  const leadingUrl = remaining.match(/^https?:\/\/[^\s]+/);
  if (leadingUrl) {
    blocks.push({ kind: "paragraph", text: leadingUrl[0] });
    remaining = remaining.slice(leadingUrl[0].length).trim();
  }

  if (remaining.includes("\n\n")) {
    const chunks = remaining
      .split(/\n{2,}/)
      .map((chunk) => chunk.replace(/\n/g, " ").trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      blocks.push(...segmentPlainJobBody(chunk));
    }
    return blocks;
  }

  while (remaining.length > 0) {
    const major = remaining.match(/^([A-Z]{2,}(?:\s+[A-Z]{2,})+)\s*:?\s*/);
    if (major && isMajorHeading(major[1])) {
      blocks.push({ kind: "heading", level: 1, text: major[1] });
      remaining = remaining.slice(major[0].length).trim();
      continue;
    }

    const sub = remaining.match(/^([A-Z][a-z]+(?:\s+[A-Za-z/&-]+){1,5}):\s*/);
    if (sub && isSubHeadingLabel(`${sub[1]}:`)) {
      blocks.push({ kind: "heading", level: 2, text: `${sub[1]}:` });
      remaining = remaining.slice(sub[0].length).trim();
      continue;
    }

    const nextMajor = findNextMajorHeaderIndex(remaining, 1);
    const nextSub = findNextSubHeaderIndex(remaining, 1);

    let cutAt = remaining.length;
    if (nextMajor > 0) cutAt = Math.min(cutAt, nextMajor);
    if (nextSub > 0) cutAt = Math.min(cutAt, nextSub);

    const paragraph = remaining.slice(0, cutAt).trim();
    if (paragraph) {
      blocks.push({ kind: "paragraph", text: paragraph });
    }

    remaining = remaining.slice(cutAt).trim();
  }

  return blocks;
}

export function parseJobDescriptionBody(raw: string): BodyBlock[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return segmentPlainJobBody(stripHtml(trimmed));
}

export function splitUrlSuffix(url: string): { href: string; suffix: string } {
  const trailing = url.match(/([.,;:!?)]+)$/);
  if (!trailing) return { href: url, suffix: "" };
  return {
    href: url.slice(0, -trailing[1].length),
    suffix: trailing[1],
  };
}

export function splitTextWithUrls(text: string): Array<{ type: "text" | "url"; value: string }> {
  const parts: Array<{ type: "text" | "url"; value: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "url", value: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
