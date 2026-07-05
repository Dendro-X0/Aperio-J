import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFixtureSeekerProfile } from "@aperio-j/matcher";
import {
  buildSeekerTaxonomy,
  resolveTaxonomyFromText,
  resolveOpportunityTaxonomy,
  scoreTaxonomyOverlap,
} from "./taxonomy.js";

describe("taxonomy", () => {
  it("resolves city and sub-sector from job text", () => {
    const refs = resolveTaxonomyFromText("深圳龙岗 招聘 IQC 质检员", "zh-CN");
    assert.ok(refs.some((ref) => ref.id === "city:shenzhen"));
    assert.ok(refs.some((ref) => ref.id === "subSector:qc"));
  });

  it("builds seeker taxonomy from profile portfolio and intent", () => {
    const profile = createFixtureSeekerProfile();
    const refs = buildSeekerTaxonomy(profile, "zh-CN");
    assert.ok(refs.some((ref) => ref.kind === "city"));
    assert.ok(refs.some((ref) => ref.kind === "subSector" || ref.kind === "industry"));
  });

  it("expands sub-sector refs to parent industry", () => {
    const refs = resolveOpportunityTaxonomy(
      {
        title: "IQC 质检",
        body: "电子厂招聘",
        locationText: "深圳",
        roleCategories: ["qc"],
      },
      "en",
    );
    assert.ok(refs.some((ref) => ref.id === "subSector:qc"));
    assert.ok(refs.some((ref) => ref.id === "industry:electronics-manufacturing"));
  });

  it("scores overlap between seeker and opportunity taxonomy", () => {
    const profile = createFixtureSeekerProfile();
    const seekerRefs = buildSeekerTaxonomy(profile, "zh-CN");
    const opportunityRefs = resolveOpportunityTaxonomy(
      {
        title: "IQC 质检 深圳",
        body: "电子制造 品检",
        locationText: "深圳",
        roleCategories: ["qc"],
      },
      "zh-CN",
    );
    const overlap = scoreTaxonomyOverlap(seekerRefs, opportunityRefs);
    assert.ok(overlap.score > 0);
    assert.ok(overlap.hits.length > 0);
  });
});
