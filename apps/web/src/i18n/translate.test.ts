import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchSupportedLocale,
  parseAcceptLanguage,
  resolveLocaleFromPreferences,
} from "./translate";

describe("matchSupportedLocale", () => {
  it("maps common language tags", () => {
    assert.equal(matchSupportedLocale("en-US"), "en");
    assert.equal(matchSupportedLocale("zh-CN"), "zh-CN");
    assert.equal(matchSupportedLocale("es-ES"), "es");
    assert.equal(matchSupportedLocale("fr-FR"), null);
  });
});

describe("parseAcceptLanguage", () => {
  it("orders tags by quality value", () => {
    assert.deepEqual(parseAcceptLanguage("fr-FR,en;q=0.9,zh-CN;q=0.8"), [
      "fr-FR",
      "en",
      "zh-CN",
    ]);
  });
});

describe("resolveLocaleFromPreferences", () => {
  it("picks the first supported preference", () => {
    assert.equal(resolveLocaleFromPreferences(parseAcceptLanguage("fr-FR,en;q=0.9")), "en");
    assert.equal(resolveLocaleFromPreferences(["es-MX", "en-US"]), "es");
    assert.equal(resolveLocaleFromPreferences(["ja-JP"]), "zh-CN");
  });
});
