import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyStreamWorkCategory,
  isRemoteBoardUrl,
} from "./stream-category.js";

describe("stream-category", () => {
  it("detects remote boards by URL", () => {
    assert.equal(isRemoteBoardUrl("https://remoteok.com/remote-jobs.rss"), true);
    assert.equal(isRemoteBoardUrl("https://careers.sf.gov/"), false);
  });

  it("classifies region hint and URL", () => {
    assert.equal(
      classifyStreamWorkCategory({
        regionHint: "remote",
        seedUrl: "https://example.com/jobs",
      }),
      "remote",
    );
    assert.equal(
      classifyStreamWorkCategory({
        regionHint: "San Francisco",
        seedUrl: "https://careers.sf.gov/",
      }),
      "onsite",
    );
    assert.equal(
      classifyStreamWorkCategory({
        regionHint: "San Francisco",
        seedUrl: "https://weworkremotely.com/remote-jobs.rss",
      }),
      "remote",
    );
  });
});
