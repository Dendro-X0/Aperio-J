import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cityIdentityKey,
  cityMatchTerms,
  displayCityLabel,
  localizeCityList,
  resolveCityNode,
} from "./city.js";

describe("city localization", () => {
  it("resolves Shenzhen across English and Chinese labels", () => {
    assert.equal(resolveCityNode("Shenzhen")?.id, "city:shenzhen");
    assert.equal(resolveCityNode("深圳")?.id, "city:shenzhen");
    assert.equal(cityIdentityKey("Shenzhen"), cityIdentityKey("深圳"));
  });

  it("displays city labels per locale", () => {
    assert.equal(displayCityLabel("Shenzhen", "en"), "Shenzhen");
    assert.equal(displayCityLabel("Shenzhen", "zh-CN"), "深圳");
    assert.equal(displayCityLabel("深圳", "en"), "Shenzhen");
    assert.equal(displayCityLabel("Berlin", "zh-CN"), "柏林");
    assert.equal(displayCityLabel("柏林", "en"), "Berlin");
  });

  it("expands match terms for bilingual corpus search", () => {
    const terms = cityMatchTerms("Shenzhen");
    assert.ok(terms.includes("shenzhen"));
    assert.ok(terms.includes("深圳"));
  });

  it("localizes city lists without duplicates", () => {
    assert.deepEqual(localizeCityList(["Shenzhen", "Berlin"], "zh-CN"), ["深圳", "柏林"]);
    assert.deepEqual(localizeCityList(["深圳", "柏林"], "en"), ["Shenzhen", "Berlin"]);
  });
});
