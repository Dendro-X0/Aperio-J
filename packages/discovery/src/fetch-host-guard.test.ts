import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHostFetchBlocked,
  recordHostFetchBlocked,
  resetFetchHostGuardForTests,
} from "./fetch-host-guard.js";

describe("fetch-host-guard", () => {
  it("blocks a host after recording a WAF cooldown", () => {
    resetFetchHostGuardForTests();
    const url = "https://www.zhipin.com/shenzhen/";
    assert.equal(isHostFetchBlocked(url), false);
    recordHostFetchBlocked(url, Date.now());
    assert.equal(isHostFetchBlocked(url), true);
    resetFetchHostGuardForTests();
  });
});
