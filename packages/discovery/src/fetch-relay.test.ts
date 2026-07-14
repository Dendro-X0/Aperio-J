import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRssRelayEnabled, resolveRelayFetchUrl } from "./fetch-relay.js";

describe("fetch-relay", () => {
  it("passes through when relay is unset", () => {
    const previous = process.env.APERO_J_RSS_RELAY_URL;
    delete process.env.APERO_J_RSS_RELAY_URL;
    try {
      assert.equal(isRssRelayEnabled(), false);
      assert.equal(
        resolveRelayFetchUrl("https://weworkremotely.com/remote-jobs.rss"),
        "https://weworkremotely.com/remote-jobs.rss",
      );
    } finally {
      if (previous === undefined) delete process.env.APERO_J_RSS_RELAY_URL;
      else process.env.APERO_J_RSS_RELAY_URL = previous;
    }
  });

  it("relays international RSS through configured base URL", () => {
    const previous = process.env.APERO_J_RSS_RELAY_URL;
    process.env.APERO_J_RSS_RELAY_URL = "https://relay.sg.example/fetch?url=";
    try {
      assert.equal(isRssRelayEnabled(), true);
      const relayed = resolveRelayFetchUrl("https://weworkremotely.com/remote-jobs.rss");
      assert.match(relayed, /^https:\/\/relay\.sg\.example\/fetch\?url=/);
      assert.doesNotMatch(
        resolveRelayFetchUrl("https://eleduck.com/posts/index.xml"),
        /relay\.sg\.example/,
      );
    } finally {
      if (previous === undefined) delete process.env.APERO_J_RSS_RELAY_URL;
      else process.env.APERO_J_RSS_RELAY_URL = previous;
    }
  });
});
