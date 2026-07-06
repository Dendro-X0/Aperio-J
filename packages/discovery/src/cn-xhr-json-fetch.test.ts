import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCnXhrJsonFetchEnabled, supportsCnXhrJsonFetch } from "./cn-xhr-json-fetch.js";

describe("cn-xhr-json-fetch", () => {
  it("supports zhipin and zhaopin list URLs", () => {
    assert.equal(supportsCnXhrJsonFetch("https://www.zhipin.com/shenzhen/"), true);
    assert.equal(supportsCnXhrJsonFetch("https://shenzhen.zhaopin.com/"), true);
    assert.equal(supportsCnXhrJsonFetch("https://www.51job.com/"), false);
  });

  it("can be disabled via APERO_J_CN_XHR_JSON=false", () => {
    const xhrPrev = process.env.APERO_J_CN_XHR_JSON;
    const pwPrev = process.env.APERO_J_CN_PLAYWRIGHT;
    process.env.APERO_J_CN_XHR_JSON = "false";
    process.env.APERO_J_CN_PLAYWRIGHT = "true";
    try {
      assert.equal(isCnXhrJsonFetchEnabled(), false);
    } finally {
      if (xhrPrev === undefined) delete process.env.APERO_J_CN_XHR_JSON;
      else process.env.APERO_J_CN_XHR_JSON = xhrPrev;
      if (pwPrev === undefined) delete process.env.APERO_J_CN_PLAYWRIGHT;
      else process.env.APERO_J_CN_PLAYWRIGHT = pwPrev;
    }
  });
});
