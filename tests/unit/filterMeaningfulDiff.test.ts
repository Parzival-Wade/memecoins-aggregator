import { describe, it, expect } from "vitest";
import { filterMeaningfulDiff } from "../../src/aggregator/logic";

describe("filterMeaningfulDiff()", () => {
  it("removes ignored metadata fields", () => {
    const diff = {
      price: 10,
      _updated_at: 123,
      fetched_at: 555,
      last_source: "dex",
      token_address: "AAA",
      sources_used: ["dex"],
    };

    const out = filterMeaningfulDiff(diff);

    expect(out).toEqual({
      price: 10
    });
  });

  it("removes undefined and null values", () => {
    const diff = {
      price: 5,
      volume: undefined,
      liquidity: null
    };

    const out = filterMeaningfulDiff(diff);

    expect(out).toEqual({ price: 5 });
  });

  it("keeps valid numeric fields", () => {
    const diff = {
      price: 123,
      volume: 200,
      liquidity: 50,
    };

    const out = filterMeaningfulDiff(diff);

    expect(out).toEqual({
      price: 123,
      volume: 200,
      liquidity: 50,
    });
  });

  it("filters very small volume noise (<1e-6)", () => {
    const diff = {
      volume: 0.0000000001, // tiny noise
    };

    const out = filterMeaningfulDiff(diff);

    expect(out).toEqual({});
  });

  it("keeps real volume updates", () => {
    const diff = {
      volume: 5, // meaningful change
    };

    const out = filterMeaningfulDiff(diff);

    expect(out).toEqual({ volume: 5 });
  });

  it("handles completely empty diff", () => {
    expect(filterMeaningfulDiff({})).toEqual({});
  });
});
