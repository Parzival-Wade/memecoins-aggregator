import { http, limit } from "../lib/httpClient";
import { publishRaw } from "./fetcherBase";

// Normalize pair data → TokenDto
function normalizeDex(entry: any) {
  return {
    token_address: entry?.baseToken?.address,
    token_name: entry?.baseToken?.name,
    token_ticker: entry?.baseToken?.symbol,

    price: Number(entry?.priceUsd) || undefined,
    volume: Number(entry?.volume?.h24) || undefined,
    liquidity: Number(entry?.liquidity?.usd) || undefined,
    market_cap: Number(entry?.fdv) || undefined,

    txns: entry?.txns?.h24 || undefined,
    pair_address: entry?.pairAddress,
    dex_id: entry?.dexId,

    source: "dexscreener",
    fetched_at: Date.now(),
  };
}

export async function fetchDexScreener() {
  try {
    //
    // STEP 1 — Fetch boosted tokens (raw array)
    //
    const boostUrl = "https://api.dexscreener.com/token-boosts/top/v1";
    const boostRes = await http.get(boostUrl);

    const boostedArray = boostRes.data;  // <--- FIX

    if (!Array.isArray(boostedArray) || boostedArray.length === 0) {
      console.log("DexScreener: No boosted tokens found");
      console.log("Raw Boost Response:", boostRes.data);
      return;
    }

    // Take top 50
    const top50 = boostedArray.slice(0, 50);

    const addresses = top50
      .map((entry: any) => entry.tokenAddress)
      .filter(Boolean);

    console.log(`DexScreener: Boosted tokens → ${addresses.length} addresses`);

    //
    // STEP 2 — Fetch details for each token
    //
    const results = await Promise.all(
      addresses.map((addr: string) =>
        limit(() => http.get(`https://api.dexscreener.com/latest/dex/tokens/${addr}`))
      )
    );

// STEP 3 — Collect Solana SOL pairs only
//
let pairs: any[] = [];

for (const res of results) {
  const p = res?.data?.pairs || [];

  if (Array.isArray(p)) {
    const solPairs = p.filter(
      (pair: any) =>
        pair.chainId === "solana" &&
        pair.quoteToken?.symbol?.toUpperCase() === "SOL"
    );

    pairs.push(...solPairs);
  }
}

    //
    // STEP 4 — Normalize
    //
    const normalized = pairs
      .map(normalizeDex)
      .filter((x) => x.token_address);

    //
    // STEP 5 — Publish to PubSub
    //
    await publishRaw("dexscreener", normalized);

    console.log(
      `DexScreener: Published ${normalized.length} token pairs (Top 50 boosted)`
    );

  } catch (err) {
    console.error("DexScreener fetch error:", err);
  }
}
