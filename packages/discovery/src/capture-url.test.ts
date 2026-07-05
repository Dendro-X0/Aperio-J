import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCaptureUrl } from "./capture-url.js";

describe("isCaptureUrl", () => {
  it("accepts http(s) URLs", () => {
    assert.equal(isCaptureUrl("https://example.com/jobs/1"), true);
  });

  it("rejects invalid schemes", () => {
    assert.equal(isCaptureUrl("ftp://example.com/job"), false);
    assert.equal(isCaptureUrl("not-a-url"), false);
  });
});
