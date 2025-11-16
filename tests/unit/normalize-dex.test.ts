import { describe, it, expect } from "vitest";
import { normalizeDex } from "../../src/normalizers/dex";

describe("normalizeDex()", () => {
  it("normalizes DexScreener pair correctly", () => {
    const raw = {
      baseToken: {
        address: "ABC",
        name: "TestToken",
        symbol: "TT"
      },
      priceUsd: "1.23",
      volume: { h24: "5000" },
      liquidity: { usd: "10000" },
      fdv: "20000",
      txns: { h24: 50 },
      pairAddress: "pair123",
      dexId: "raydium"
    };

    const out = normalizeDex(raw);

    expect(out.token_address).toBe("ABC");
    expect(out.token_name).toBe("TestToken");
    expect(out.token_ticker).toBe("TT");
    expect(out.price).toBe(1.23);
    expect(out.volume).toBe(5000);
    expect(out.liquidity).toBe(10000);
    expect(out.market_cap).toBe(20000);
    expect(out.txns).toBe(50);
    expect(out.pair_address).toBe("pair123");
    expect(out.dex_id).toBe("raydium");
    expect(out.source).toBe("dex");
  });

  it("returns undefined for missing address", () => {
    const raw = {
      baseToken: { name: "X", symbol: "Y" }
    };

    const out = normalizeDex(raw);
    console.log(out);
    expect(out.token_address).toBeUndefined();
  });
});
