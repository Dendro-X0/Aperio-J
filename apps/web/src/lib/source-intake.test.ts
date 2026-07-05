import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSourceIntakeType } from "./source-intake.js";
import { USER_CUSTOM_DISCOVERED_VIA } from "./source-registry.js";

describe("source-intake", () => {
  it("maps connector streams to API intake", () => {
    assert.equal(
      resolveSourceIntakeType({
        kind: "connector",
        origin: "auto",
        discoveredVia: "connector:remotive",
      }),
      "api",
    );
  });

  it("maps user custom streams to custom intake", () => {
    assert.equal(
      resolveSourceIntakeType({
        kind: "rss",
        origin: "user",
        discoveredVia: USER_CUSTOM_DISCOVERED_VIA,
      }),
      "custom",
    );
  });

  it("maps auto RSS to rss intake", () => {
    assert.equal(
      resolveSourceIntakeType({
        kind: "rss",
        origin: "auto",
        discoveredVia: "search-probe",
      }),
      "rss",
    );
  });

  it("maps auto list pages to scraped intake", () => {
    assert.equal(
      resolveSourceIntakeType({
        kind: "list_page",
        origin: "auto",
        discoveredVia: "search-probe",
      }),
      "scraped",
    );
  });
});
