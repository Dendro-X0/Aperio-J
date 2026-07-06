import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJobPostingsFromJsonLd } from "./json-ld-job-posting.js";

const HTML = `<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "电子厂普工",
  "description": "长白班，包吃住",
  "datePosted": "2026-07-01",
  "hiringOrganization": { "name": "深圳某电子厂" },
  "jobLocation": { "address": { "addressLocality": "深圳" } },
  "url": "https://example.com/jobs/123"
}
</script>
</head></html>`;

describe("json-ld-job-posting", () => {
  it("extracts JobPosting from JSON-LD script tags", () => {
    const items = extractJobPostingsFromJsonLd(HTML, "https://example.com/jobs", "test");
    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "电子厂普工");
    assert.equal(items[0]?.url, "https://example.com/jobs/123");
    assert.ok(items[0]?.body.includes("深圳某电子厂"));
    assert.ok(items[0]?.body.includes("深圳"));
  });
});
