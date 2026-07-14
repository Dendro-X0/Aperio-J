import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGarbledText,
  sanitizeListingBody,
  sanitizeRawFeedItem,
} from "./feed-text-quality.js";

describe("feed-text-quality", () => {
  it("detects Arabic mojibake runs", () => {
    assert.equal(isGarbledText("Virtual Assistant ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ¯"), true);
    assert.equal(isGarbledText("Remote Customer Support Specialist"), false);
  });

  it("drops garbled bodies but keeps clean title", () => {
    const item = sanitizeRawFeedItem({
      title: "Virtual Executive Assistant",
      body: "ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ¯ Ù…Ù† Ø§Ù„Ù…Ù†Ø²Ù„",
      url: "https://example.com/job/1",
      sourceId: "test",
      fetchedAt: new Date().toISOString(),
    });
    assert.ok(item);
    assert.equal(item!.body, "");
  });

  it("removes empty salary noise from bodies", () => {
    const body = sanitizeListingBody(
      "Company: Foo\nSalary: $0 - $0\nHelp customers remotely.",
      "Customer Support",
    );
    assert.match(body, /Help customers remotely/);
    assert.doesNotMatch(body, /\$0/);
  });
});
