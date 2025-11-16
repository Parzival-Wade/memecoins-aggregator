import { describe, it, expect, vi } from "vitest";
import { normalizeJup } from "../../src/normalizers/jup";

// Freeze time so fetched_at is predictable
vi.useFakeTimers();
vi.setSystemTime(1700000000000);

describe("normalizeJup()", () => {
  it("normalizes valid Jupiter data", () => {
    const out = normalizeJup("So11111111111111111111111111111111111111112", {
      usdPrice: 123.45,
      priceChange24h: -2.3,
    });

    expect(out).toEqual({
      token_address: "So11111111111111111111111111111111111111112",
      price: 123.45,
      price_change_24h: -2.3,
      source: "jup",
      fetched_at: 1700000000000,
    });
  });

  it("returns null when address is missing/empty", () => {
    expect(normalizeJup("", { usdPrice: 1 })).toBeNull();
    expect(normalizeJup("   ", { usdPrice: 1 })).toBeNull();
    expect(normalizeJup(undefined as any, { usdPrice: 1 })).toBeNull();
  });

  it("handles missing price fields", () => {
    const out = normalizeJup("ABC", {});

    expect(out).toEqual({
      token_address: "ABC",
      price: undefined,
      price_change_24h: undefined,
      source: "jup",
      fetched_at: 1700000000000,
    });
  });

  it("converts string numeric values", () => {
    const out = normalizeJup("XYZ", {
      usdPrice: "10.5",
      priceChange24h: "3.2",
    });

    expect(out.price).toBe(10.5);
    expect(out.price_change_24h).toBe(3.2);
  });
});
