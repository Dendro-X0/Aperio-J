import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  profileCities,
  profileHasExplicitCity,
  profileLocationLabel,
  profileLocationLabelFromCityField,
  remoteLocationLabel,
} from "./profile-location-display.js";

const baseProfile = {
  constraints: {
    primaryCity: "",
    acceptableCities: [],
    remotePreference: "remote-only",
    employmentTypes: ["full-time"],
    allowAgencyPostings: true,
    hideRedFlagListings: true,
    preferDirectHire: false,
  },
} satisfies Pick<SeekerProfile, "constraints">;

describe("profile-location-display", () => {
  it("returns Remote when no cities are set", () => {
    assert.equal(remoteLocationLabel("en"), "Remote");
    assert.equal(remoteLocationLabel("zh-CN"), "远程");
    assert.equal(profileLocationLabel(baseProfile, "en"), "Remote");
    assert.equal(profileLocationLabelFromCityField("", "en"), "Remote");
    assert.equal(profileHasExplicitCity(baseProfile), false);
  });

  it("joins explicit city tags", () => {
    const profile = {
      constraints: {
        ...baseProfile.constraints,
        primaryCity: "Frankfurt",
        acceptableCities: ["Berlin"],
      },
    } satisfies Pick<SeekerProfile, "constraints">;

    assert.deepEqual(profileCities(profile), ["Frankfurt", "Berlin"]);
    assert.equal(profileHasExplicitCity(profile), true);
    assert.match(profileLocationLabel(profile, "en"), /Frankfurt/);
    assert.match(profileLocationLabel(profile, "en"), /Berlin/);
  });
});
