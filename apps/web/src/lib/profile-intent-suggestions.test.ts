import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_PROFILE_FORM } from "@/lib/profile-form";
import {
  applyProfileIntentPreset,
  isManufacturingLikeProfile,
  targetRoleSuggestionsForProfile,
} from "@/lib/profile-intent-suggestions";

describe("profile-intent-suggestions", () => {
  it("detects manufacturing-like industries", () => {
    assert.equal(
      isManufacturingLikeProfile({ industries: ["电子制造"] }),
      true,
    );
    assert.equal(
      isManufacturingLikeProfile({ industries: ["IT/软件"] }),
      false,
    );
  });

  it("suggests transition roles for manufacturing profiles", () => {
    const suggestions = targetRoleSuggestionsForProfile(
      { industries: ["电子制造"] },
      "zh-CN",
    );
    assert.ok(suggestions.some((label) => /质检|仓储/.test(label)));
  });

  it("applies remote-ops-gig preset", () => {
    const next = applyProfileIntentPreset(EMPTY_PROFILE_FORM, "remote-ops-gig", "zh-CN");
    assert.equal(next.remotePreference, "remote-only");
    assert.match(next.desiredRolesText, /电商运营|客服/);
    assert.ok(next.employmentTypes.includes("part-time"));
  });

  it("applies remote-developer preset", () => {
    const next = applyProfileIntentPreset(EMPTY_PROFILE_FORM, "remote-developer", "en");
    assert.equal(next.remotePreference, "remote-only");
    assert.match(next.desiredRolesText, /Backend|DevOps/i);
    assert.ok(next.industries.length > 0);
  });

  it("applies remote-backend preset", () => {
    const next = applyProfileIntentPreset(EMPTY_PROFILE_FORM, "remote-backend", "en");
    assert.equal(next.remotePreference, "remote-only");
    assert.match(next.desiredRolesText, /Backend|API/i);
  });

  it("applies factory-upgrade preset without wiping custom cities", () => {
    const next = applyProfileIntentPreset(
      {
        ...EMPTY_PROFILE_FORM,
        cities: ["深圳"],
        remotePreference: "onsite-only",
      },
      "factory-upgrade",
      "zh-CN",
    );

    assert.deepEqual(next.cities, ["深圳"]);
    assert.equal(next.remotePreference, "onsite-only");
    assert.equal(next.excludeProductionLine, true);
    assert.match(next.desiredRolesText, /质检/);
    assert.match(next.avoidText, /夜班|流水线/);
  });
});
