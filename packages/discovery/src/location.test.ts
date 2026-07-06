import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  corpusMatchesCity,
  corpusClaimsRemoteWork,
  extractLocationText,
  inferCityHintFromListingUrl,
  locationMatchesProfile,
} from "./location.js";

describe("extractLocationText", () => {
  it("extracts labeled work location", () => {
    const text = "岗位：质检员\n工作地点：浙江杭州西湖区\n要求：有经验";
    assert.equal(extractLocationText(text), "浙江杭州西湖区");
  });

  it("extracts generic city with district", () => {
    const text = "招聘普工，深圳龙岗电子厂两班倒";
    assert.match(extractLocationText(text) ?? "", /深圳龙岗/);
  });

  it("extracts Hong Kong without 市 suffix", () => {
    assert.match(extractLocationText("香港九龙区仓库管理员") ?? "", /香港/);
  });

  it("uses profile city hints when generic patterns miss", () => {
    const text = "我们在宁波鄞州园区招聘质检";
    assert.match(extractLocationText(text, ["宁波"]) ?? "", /宁波/);
  });

  it("falls back to city hint for city-scoped boards without explicit city text", () => {
    const text = "电子厂300一天岗位轻松手机可带普工";
    assert.equal(extractLocationText(text, ["深圳"]), "深圳");
  });

  it("prefers headquarters over incidental remote mentions", () => {
    const text =
      "GM: Design Release Engineer\nHeadquarters: Warren, Michigan\nURL: https://weworkremotely.com/jobs/123";
    assert.equal(extractLocationText(text), "Warren, Michigan");
  });

  it("detects explicit remote work arrangements", () => {
    assert.equal(extractLocationText("Senior Dev — 100% remote, US timezone"), "远程");
  });

  it("ignores remote negation for on-site roles", () => {
    const text = "On-site only in Austin, TX — no remote work";
    assert.notEqual(extractLocationText(text), "远程");
  });
});

describe("locationMatchesProfile", () => {
  const profile = {
    primaryCity: "杭州",
    acceptableCities: ["宁波"],
    remotePreference: "hybrid-ok" as const,
  };

  const shenzhenProfile = {
    primaryCity: "深圳",
    acceptableCities: [] as string[],
    remotePreference: "hybrid-ok" as const,
  };

  it("matches explicit location text", () => {
    assert.equal(locationMatchesProfile(profile, "杭州市西湖区"), true);
  });

  it("falls back to corpus when location is missing", () => {
    assert.equal(
      locationMatchesProfile(profile, null, "招聘文员，宁波江北区，双休"),
      true,
    );
  });

  it("rejects missing location for non-Chinese city profiles without corpus hints", () => {
    const berlinProfile = {
      primaryCity: "Berlin",
      acceptableCities: [] as string[],
      remotePreference: "hybrid-ok" as const,
    };
    assert.equal(locationMatchesProfile(berlinProfile, null, "Senior engineer role"), false);
  });

  it("accepts broad remote locations for hybrid profiles", () => {
    assert.equal(locationMatchesProfile(shenzhenProfile, "Worldwide", ""), true);
    assert.equal(locationMatchesProfile(shenzhenProfile, "APAC", ""), true);
  });

  it("accepts foreign remote listings for hybrid profiles", () => {
    assert.equal(
      locationMatchesProfile(shenzhenProfile, "Germany", "100% remote software engineer"),
      true,
    );
    assert.equal(locationMatchesProfile(shenzhenProfile, "Germany", "On-site in Berlin"), false);
  });

  it("accepts remote feeds without location for Chinese hybrid profiles", () => {
    assert.equal(locationMatchesProfile(shenzhenProfile, null, "Senior engineer role"), true);
  });

  it("matches Shenzhen listings when profile stores English city label", () => {
    const englishProfile = {
      primaryCity: "Shenzhen",
      acceptableCities: [] as string[],
      remotePreference: "hybrid-ok" as const,
    };
    assert.equal(locationMatchesProfile(englishProfile, "深圳市南山区", ""), true);
    assert.equal(locationMatchesProfile(englishProfile, null, "深圳龙岗招聘普工"), true);
  });

  it("matches Shenzhen listings", () => {
    assert.equal(locationMatchesProfile(shenzhenProfile, "深圳市南山区", ""), true);
    assert.equal(locationMatchesProfile(shenzhenProfile, null, "深圳龙岗招聘普工"), true);
  });

  it("rejects unknown city for onsite-only seekers", () => {
    assert.equal(
      locationMatchesProfile(
        { ...profile, remotePreference: "onsite-only" },
        "成都市高新区",
        "成都招聘",
      ),
      false,
    );
  });

  it("accepts remote listings for hybrid seekers", () => {
    assert.equal(locationMatchesProfile(profile, "远程", ""), true);
  });

  it("uses remote platform mode when no cities are set", () => {
    const remoteProfile = {
      primaryCity: "",
      acceptableCities: [] as string[],
      remotePreference: "remote-only" as const,
    };

    assert.equal(locationMatchesProfile(remoteProfile, "远程", ""), true);
    assert.equal(locationMatchesProfile(remoteProfile, "Remote", ""), true);
    assert.equal(locationMatchesProfile(remoteProfile, null, "work from home"), true);
    assert.equal(locationMatchesProfile(remoteProfile, "深圳市龙岗区", "深圳招聘"), false);
    assert.equal(locationMatchesProfile(remoteProfile, null, ""), true);
  });
});

describe("inferCityHintFromListingUrl", () => {
  it("maps city-scoped board URLs to profile cities", () => {
    assert.equal(
      inferCityHintFromListingUrl(
        "https://sz.58.com/sou/jh_%E6%B7%B1%E5%9C%B3%E7%94%B5%E5%AD%90%E5%8E%82%E6%99%AE%E5%B7%A5/",
      ),
      "深圳",
    );
    assert.equal(inferCityHintFromListingUrl("https://www.zhipin.com/shenzhen/"), "深圳");
    assert.equal(inferCityHintFromListingUrl("https://shenzhen.zhaopin.com/"), "深圳");
  });
});

describe("corpusMatchesCity", () => {
  it("matches city without 市 suffix", () => {
    assert.equal(corpusMatchesCity("工作地点：杭州滨江", ["杭州"]), true);
  });

  it("matches Chinese corpus when profile stores English city label", () => {
    assert.equal(corpusMatchesCity("深圳龙岗招聘普工", ["Shenzhen"]), true);
    assert.equal(corpusMatchesCity("Berlin startup hiring onsite", ["柏林"]), true);
  });

  it("does not treat remote-only corpus as a city match", () => {
    assert.equal(corpusMatchesCity("100% remote worldwide", ["杭州"]), false);
  });
});
