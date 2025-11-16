import { describe, it, expect } from "vitest";
import { mergeTokens } from "../../src/aggregator/logic";

describe("mergeTokens()", () => {
  it("creates a new token when no existing snapshot", () => {
    const existing = null;

    const incoming = {
      token_address: "AAA",
      price: 10,
      volume: 5,
      token_name: "Alpha",
      token_ticker: "ALP",
      sources_used: ["dex"],
    };

    const merged = mergeTokens(existing, incoming, "dex", 1000);

    expect(merged.token_address).toBe("AAA");
    expect(merged.price).toBe(10);
    expect(merged.volume).toBe(5);
    expect(merged.token_name).toBe("Alpha");
    expect(merged.token_ticker).toBe("ALP");
    expect(merged.sources_used).toEqual(["dex"]);
    expect(merged.last_source).toBe("dex");
    expect(merged.fetched_at).toBe(1000);
  });

  it("merges existing + incoming and prefers incoming numeric fields", () => {
    const existing = {
      token_address: "AAA",
      price: 2,
      volume: 1,
      token_name: "Alpha",
      sources_used: ["dex"],
    };

    const incoming = {
      token_address: "AAA",
      price: 100,
      volume: 50,
      sources_used: ["jup"],
    };

    const merged = mergeTokens(existing, incoming, "jup", 2000);

    expect(merged.price).toBe(100); // incoming wins
    expect(merged.volume).toBe(50); // incoming wins
    expect(merged.token_name).toBe("Alpha"); // keep existing
    expect(merged.sources_used.sort()).toEqual(["dex", "jup"].sort());
    expect(merged.last_source).toBe("jup");
    expect(merged.fetched_at).toBe(2000);
  });

  it("fills missing name/ticker from incoming", () => {
    const existing = {
      token_address: "AAA",
      price: 1,
    };

    const incoming = {
      token_address: "AAA",
      token_name: "Pepe",
      token_ticker: "PEPE",
    };

    const merged = mergeTokens(existing, incoming, "dex", 3000);

    expect(merged.token_name).toBe("Pepe");
    expect(merged.token_ticker).toBe("PEPE");
  });

  it("keeps only valid numeric fields", () => {
    const existing = { token_address: "AAA", price: 10 };

    const incoming = {
      token_address: "AAA",
      price: null,
      liquidity: 99,
      unknown_field: 123, // should be ignored
    };

    const merged = mergeTokens(existing, incoming, "dex", 4000);

    expect(merged.price).toBe(10); // null incoming ignored
    expect(merged.liquidity).toBe(99);
    expect((merged as any).unknown_field).toBeUndefined();
  });
});
