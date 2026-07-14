import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSalaryRange, stripEmptySalaryLines } from "./salary-format.js";

describe("salary-format", () => {
  it("returns null for zero salary bounds", () => {
    assert.equal(formatSalaryRange(0, 0), null);
    assert.equal(formatSalaryRange(undefined, 0), null);
  });

  it("formats meaningful salary ranges", () => {
    assert.match(formatSalaryRange(50000, 80000)!, /\$50,000.*\$80,000/);
    assert.match(formatSalaryRange(20, undefined)!, /from \$20/);
  });

  it("strips zero salary lines from bodies", () => {
    const body = ["Company: Acme", "Salary: $0 - $0", "Remote role"].join("\n");
    assert.equal(stripEmptySalaryLines(body), "Company: Acme\nRemote role");
  });
});
