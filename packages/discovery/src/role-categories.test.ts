import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRoleCategories } from "./role-categories.js";

describe("classifyRoleCategories — tech roles", () => {
  it("classifies backend and frontend developer titles", () => {
    const backend = classifyRoleCategories("Senior Backend Engineer Python PostgreSQL");
    assert.ok(backend.includes("backend-dev"));

    const frontend = classifyRoleCategories("React Frontend Developer TypeScript");
    assert.ok(frontend.includes("frontend-dev"));
  });

  it("classifies devops and data roles", () => {
    const devops = classifyRoleCategories("DevOps Engineer Kubernetes Terraform");
    assert.ok(devops.includes("devops"));

    const data = classifyRoleCategories("Machine Learning Engineer deep learning");
    assert.ok(data.includes("data-ml"));
  });

  it("still classifies factory roles", () => {
    const factory = classifyRoleCategories("深圳电子厂IQC质检员 普工");
    assert.ok(factory.includes("qc") || factory.includes("production-line"));
  });
});
