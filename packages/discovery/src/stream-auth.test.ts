import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSessionAuthAllowed,
  buildSessionAuthHeaders,
  isBlockedSessionAuthHost,
  SESSION_AUTH_BLOCKED,
} from "./stream-auth.js";

describe("stream-auth", () => {
  it("blocks linkedin session auth", () => {
    assert.equal(isBlockedSessionAuthHost("https://www.linkedin.com/jobs/"), true);
    assert.throws(
      () => assertSessionAuthAllowed("https://linkedin.com/feed/"),
      (error: Error) => error.message === SESSION_AUTH_BLOCKED,
    );
  });

  it("allows gov portals", () => {
    assert.equal(isBlockedSessionAuthHost("https://careers.sf.gov/"), false);
  });

  it("builds cookie and bearer headers", () => {
    assert.deepEqual(
      buildSessionAuthHeaders({ mode: "cookie", secret: "sid=abc" }),
      { Cookie: "sid=abc" },
    );
    assert.deepEqual(
      buildSessionAuthHeaders({ mode: "bearer", secret: "tok" }),
      { Authorization: "Bearer tok" },
    );
  });
});
