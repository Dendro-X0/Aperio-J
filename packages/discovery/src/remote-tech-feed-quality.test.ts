import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  filterRemoteTechFeedItemsForProfile,
  isIrrelevantListingForRemoteTechProfile,
  isNonTechRemoteListing,
} from "./remote-tech-feed-quality.js";

const remoteBackendProfile = {
  intent: {
    desiredRoles: ["Backend Engineer"],
    desiredIndustries: ["SaaS"],
    avoidRoles: [],
    avoidPhrases: [],
    industryProximity: "open-to-any" as const,
    excludeProductionLine: true,
    excludeSales: true,
    excludeFoodService: true,
  },
  artifacts: [],
  constraints: {
    primaryCity: "Frankfurt",
    acceptableCities: [],
    remotePreference: "remote-only",
    employmentTypes: ["full-time", "contract"],
    allowAgencyPostings: true,
    hideRedFlagListings: true,
    preferDirectHire: false,
  },
  skillTokens: ["Python", "PostgreSQL"],
} satisfies Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">;

describe("remote-tech-feed-quality", () => {
  it("flags ghostwriter and admin assistant listings as non-tech remote", () => {
    assert.equal(isNonTechRemoteListing("Founder Ghostwriter (Remote)", "Flexible hours"), true);
    assert.equal(
      isNonTechRemoteListing("Entry Level Administrative Assistant", "Remote work from home"),
      true,
    );
    assert.equal(isNonTechRemoteListing("Backend Engineer", "Python API development"), false);
  });

  it("keeps customer success engineer and support engineer listings", () => {
    assert.equal(
      isNonTechRemoteListing("Customer Success Engineer", "SaaS onboarding"),
      false,
    );
    assert.equal(isNonTechRemoteListing("Support Engineer", "Debug customer issues"), false);
  });

  it("drops non-tech listings for remote tech profiles", () => {
    assert.equal(
      isIrrelevantListingForRemoteTechProfile(
        "Founder Ghostwriter",
        "Remote content writing",
        remoteBackendProfile,
        ["other"],
      ),
      true,
    );
    assert.equal(
      isIrrelevantListingForRemoteTechProfile(
        "Senior Backend Engineer",
        "Python FastAPI PostgreSQL",
        remoteBackendProfile,
        ["backend-dev"],
      ),
      false,
    );
    assert.equal(
      isIrrelevantListingForRemoteTechProfile(
        "Remote opportunity",
        "Join our startup team",
        remoteBackendProfile,
        ["other"],
      ),
      true,
    );
  });

  it("filters a mixed remote feed batch", () => {
    const filtered = filterRemoteTechFeedItemsForProfile(
      [
        {
          title: "Founder Ghostwriter",
          body: "Remote writing role",
          url: "https://remotive.com/job/ghost",
          sourceId: "remotive",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "Administrative Assistant",
          body: "Work from home data entry",
          url: "https://remoteok.com/job/admin",
          sourceId: "remoteok",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "Senior Backend Engineer",
          body: "Python PostgreSQL remote EU",
          url: "https://weworkremotely.com/job/backend",
          sourceId: "wwr",
          fetchedAt: new Date().toISOString(),
        },
      ],
      remoteBackendProfile,
    );

    assert.equal(filtered.length, 1);
    assert.match(filtered[0]!.title, /Backend Engineer/);
  });
});
