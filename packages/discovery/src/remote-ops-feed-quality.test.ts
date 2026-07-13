import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  filterRemoteOpsFeedItemsForProfile,
  isIrrelevantListingForRemoteOpsProfile,
} from "./remote-ops-feed-quality.js";

const remoteOpsProfile = {
  intent: {
    desiredRoles: ["电商运营", "直播运营"],
    desiredIndustries: ["互联网"],
    avoidRoles: [],
    avoidPhrases: [],
    industryProximity: "open-to-any" as const,
    excludeProductionLine: true,
    excludeSales: false,
    excludeFoodService: false,
  },
  artifacts: [],
  constraints: {
    primaryCity: "",
    acceptableCities: [],
    remotePreference: "remote-only",
    employmentTypes: ["full-time", "part-time", "contract"],
    allowAgencyPostings: true,
    hideRedFlagListings: true,
    preferDirectHire: false,
  },
  skillTokens: ["客服", "社群"],
} satisfies Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">;

describe("remote-ops-feed-quality", () => {
  it("drops pure developer listings for remote ops profiles", () => {
    assert.equal(
      isIrrelevantListingForRemoteOpsProfile(
        "Senior Backend Engineer",
        "Python FastAPI PostgreSQL remote",
        remoteOpsProfile,
        ["backend-dev"],
      ),
      true,
    );
    assert.equal(
      isIrrelevantListingForRemoteOpsProfile(
        "E-commerce Operations Specialist",
        "Manage TikTok Shop listings remotely",
        remoteOpsProfile,
        ["ecommerce-ops"],
      ),
      false,
    );
  });

  it("keeps customer support and community listings", () => {
    assert.equal(
      isIrrelevantListingForRemoteOpsProfile(
        "Customer Support Specialist",
        "Remote chat support for SaaS",
        remoteOpsProfile,
        ["customer-support"],
      ),
      false,
    );
    assert.equal(
      isIrrelevantListingForRemoteOpsProfile(
        "Community Manager",
        "Discord and social media moderation",
        remoteOpsProfile,
        ["community-ops"],
      ),
      false,
    );
  });

  it("filters a mixed remote feed batch for ops profiles", () => {
    const filtered = filterRemoteOpsFeedItemsForProfile(
      [
        {
          title: "Senior Software Engineer",
          body: "Golang Kubernetes backend",
          url: "https://remoteok.com/job/backend",
          sourceId: "remoteok",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "风控运营",
          body: "Remote risk operations for crypto exchange",
          url: "https://workbest.xyz/job/ops",
          sourceId: "workbest",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "流水线普工",
          body: "Factory assembly line Shenzhen",
          url: "https://example.com/factory",
          sourceId: "local",
          fetchedAt: new Date().toISOString(),
        },
      ],
      remoteOpsProfile,
    );

    assert.equal(filtered.length, 1);
    assert.match(filtered[0]!.title, /风控运营/);
  });
});
