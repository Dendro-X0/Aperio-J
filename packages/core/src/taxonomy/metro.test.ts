import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAdzunaRoute,
  resolveMetro,
  searchMetros,
} from "./metro.js";

describe("metro catalog", () => {
  it("resolves Munich across English and German aliases", () => {
    assert.equal(resolveMetro("Munich")?.id, "metro:munich");
    assert.equal(resolveMetro("München")?.id, "metro:munich");
    assert.equal(resolveMetro("Munchen")?.id, "metro:munich");
    assert.equal(resolveMetro("慕尼黑")?.id, "metro:munich");
    assert.equal(resolveMetro("Munich, Bavaria")?.id, "metro:munich");
    assert.equal(resolveMetro("Munich City")?.id, "metro:munich");
  });

  it("routes Adzuna queries from metro catalog", () => {
    assert.deepEqual(resolveAdzunaRoute("Munich"), { country: "de", where: "München" });
    assert.deepEqual(resolveAdzunaRoute("Frankfurt am Main, Hesse"), {
      country: "de",
      where: "Frankfurt",
    });
    assert.deepEqual(resolveAdzunaRoute("Austin"), { country: "us", where: "Austin" });
    assert.equal(resolveAdzunaRoute("Hangzhou"), null);
  });

  it("resolves common offline metro synonyms", () => {
    assert.equal(resolveMetro("NYC")?.id, "metro:new-york");
    assert.equal(resolveMetro("Bay Area")?.id, "metro:san-francisco");
    assert.equal(resolveMetro("DC")?.id, "metro:washington");
    assert.equal(resolveMetro("GTA")?.id, "metro:toronto");
  });

  it("searches metros by prefix and localized labels", () => {
    const munichHits = searchMetros("mun", "en", 5);
    assert.ok(munichHits.some((item) => item.id === "metro:munich"));

    const hangzhouHits = searchMetros("杭州", "zh-CN", 5);
    assert.ok(hangzhouHits.some((item) => item.id === "metro:hangzhou"));

    const saoPauloHits = searchMetros("sao", "en", 5);
    assert.ok(saoPauloHits.some((item) => item.id === "metro:sao-paulo"));
  });

  it("excludes selected taxonomy and metro ids from suggestions", () => {
    const hits = searchMetros("", "en", 20, new Set(["city:berlin", "metro:austin"]));
    assert.ok(!hits.some((item) => item.id === "metro:berlin"));
    assert.ok(!hits.some((item) => item.id === "metro:austin"));
  });
});
