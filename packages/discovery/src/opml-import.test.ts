import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOpmlFeeds } from "./opml-import.js";

const SAMPLE_OPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Test feeds</title></head>
  <body>
    <outline text="深圳人社" title="深圳人社">
      <outline type="rss" text="招聘公告" title="招聘公告"
        xmlUrl="https://hrss.sz.gov.cn/rss/tzgg.xml"
        htmlUrl="https://hrss.sz.gov.cn/tzgg/" />
    </outline>
    <outline type="rss" title="工厂招聘号"
      xmlUrl="https://example.com/feeds/factory.xml" />
  </body>
</opml>`;

describe("opml-import", () => {
  it("extracts xmlUrl feeds from nested OPML", () => {
    const feeds = parseOpmlFeeds(SAMPLE_OPML);
    assert.equal(feeds.length, 2);
    assert.equal(feeds[0]?.feedUrl, "https://hrss.sz.gov.cn/rss/tzgg.xml");
    assert.equal(feeds[0]?.title, "招聘公告");
    assert.equal(feeds[1]?.title, "工厂招聘号");
  });

  it("dedupes duplicate feed URLs", () => {
    const opml = `<opml><body>
      <outline xmlUrl="https://example.com/a.xml" title="A" />
      <outline xmlUrl="https://example.com/a.xml" title="A duplicate" />
    </body></opml>`;
    assert.equal(parseOpmlFeeds(opml).length, 1);
  });
});
