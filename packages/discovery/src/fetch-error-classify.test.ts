import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyStreamFetchFailure,
  formatClassifiedStreamFetchError,
  parseClassifiedStreamFetchError,
} from "./fetch-error-classify.js";

describe("fetch-error-classify", () => {
  it("classifies empty connector responses", () => {
    const error = classifyStreamFetchFailure("Remotive API", "0 items", {
      kind: "connector",
      connectorId: "remotive",
    });
    assert.equal(error.kind, "empty");
  });

  it("classifies Adzuna auth failures", () => {
    const error = classifyStreamFetchFailure(
      "Adzuna API",
      "Adzuna API HTTP 401 for de",
      { kind: "connector", connectorId: "adzuna" },
    );
    assert.equal(error.kind, "auth");
    assert.match(error.detail, /Adzuna/i);
  });

  it("classifies rate limits", () => {
    const error = classifyStreamFetchFailure("RemoteOK API", "RemoteOK API HTTP 429");
    assert.equal(error.kind, "rate_limit");
  });

  it("classifies intl board network blocks", () => {
    const error = classifyStreamFetchFailure(
      "Dynamite Jobs",
      "HTTP 403 Forbidden",
      { kind: "rss", url: "https://dynamitejobs.com/remote-jobs.rss" },
    );
    assert.equal(error.kind, "network");
  });

  it("round-trips formatted errors", () => {
    const formatted = formatClassifiedStreamFetchError({
      label: "Adzuna API",
      kind: "auth",
      detail: "Check Adzuna app id and key",
    });
    const parsed = parseClassifiedStreamFetchError(formatted);
    assert.equal(parsed?.kind, "auth");
    assert.equal(parsed?.label, "Adzuna API");
  });
});
