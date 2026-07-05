import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bodyExcerpt,
  displayLocationText,
  sanitizeDisplayText,
  stripHtml,
} from "./display-localize";

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    assert.equal(
      stripHtml("<strong>Remote</strong> &amp; hybrid &#039;ok&#039;"),
      "Remote & hybrid 'ok'",
    );
  });

  it("fixes common mojibake apostrophes", () => {
    assert.match(stripHtml("donâ\x80\x99t"), /don't/);
  });
});

describe("sanitizeDisplayText", () => {
  it("rejects html garbage locations", () => {
    assert.equal(
      sanitizeDisplayText("</strong> Option to Work Remote in United Kingdom <br />"),
      "",
    );
  });

  it("truncates long strings", () => {
    const result = sanitizeDisplayText("a".repeat(120), { maxLength: 40 });
    assert.equal(result.length, 41);
    assert.ok(result.endsWith("…"));
  });
});

describe("displayLocationText", () => {
  it("hides city labels in remote-only mode", () => {
    assert.equal(displayLocationText("San Francisco", "en", { remoteOnly: true }), null);
    assert.equal(displayLocationText("Remote", "en", { remoteOnly: true }), "Remote");
  });
});

describe("bodyExcerpt", () => {
  it("returns empty for title-only bodies", () => {
    assert.equal(bodyExcerpt("<p>Designer</p>", "Designer"), "");
  });

  it("strips scrape metadata prefixes", () => {
    const excerpt = bodyExcerpt(
      "Headquarters: Remote URL: https://automattic.com/ WordPress VIP, the enterprise division of Automattic.",
      "Automattic role",
    );
    assert.match(excerpt, /WordPress VIP/);
    assert.doesNotMatch(excerpt, /Headquarters:/i);
    assert.doesNotMatch(excerpt, /https?:\/\//);
  });
});
