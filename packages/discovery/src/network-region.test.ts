import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySourceNetworkReach,
  isIntlRemoteBoardUrl,
  isLikelyRegionalNetworkFailure,
  sortByNetworkReach,
} from "./network-region.js";

describe("network-region", () => {
  it("detects international remote board hosts", () => {
    assert.equal(isIntlRemoteBoardUrl("https://weworkremotely.com/remote-jobs.rss"), true);
    assert.equal(isIntlRemoteBoardUrl("https://www.zhipin.com/guangzhou/"), false);
  });

  it("classifies source network reach", () => {
    assert.equal(classifySourceNetworkReach("https://eleduck.com/jobs"), "cn");
    assert.equal(classifySourceNetworkReach("https://weworkremotely.com/remote-jobs.rss"), "intl");
  });

  it("treats intl 403 and timeouts as regional network failures", () => {
    assert.equal(
      isLikelyRegionalNetworkFailure("HTTP 403 Forbidden", "https://dynamitejobs.com/feed"),
      true,
    );
    assert.equal(isLikelyRegionalNetworkFailure("fetch failed: ETIMEDOUT"), true);
    assert.equal(
      isLikelyRegionalNetworkFailure("HTTP 401 Unauthorized", "https://dynamitejobs.com/feed"),
      false,
    );
  });

  it("sorts CN-friendly sources first when preferCn", () => {
    const rows = sortByNetworkReach(
      [
        { seedUrl: "https://weworkremotely.com/remote-jobs.rss" },
        { seedUrl: "https://eleduck.com/posts/index.xml" },
        { seedUrl: "https://zhubajie.com/" },
      ],
      { preferCn: true },
    );
    assert.match(rows[0]!.seedUrl, /eleduck|zhubajie/);
  });
});
