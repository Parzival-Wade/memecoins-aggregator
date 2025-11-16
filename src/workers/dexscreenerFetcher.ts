import { http, limit } from "../lib/httpClient";
import { ingestApi } from "../lib/internalApi";
import { normalizeDex } from "../normalizers/dex";

/**
 * Fetch boosted tokens and then token details.
 * Improvements:
 * - Robust parsing of boost response
 * - Promise.allSettled for detail fetches
 * - Deduplicate tokens by address, choose best pair (by liquidity -> volume -> latest)
 * - POST final deduped normalized tokens to /ingest
 */
export async function fetchDexScreener() {
  try {
    // STEP 1 — fetch boosted tokens (list)
    const boostUrl = "https://api.dexscreener.com/token-boosts/top/v1";
    const boostRes = await http.get(boostUrl);

    // dexscreener may return array directly or wrap it; be defensive
    const boostedArray: any[] =
      Array.isArray(boostRes.data) ? boostRes.data : boostRes.data?.tokens ?? boostRes.data?.topTokens ?? [];

    if (!Array.isArray(boostedArray) || boostedArray.length === 0) {
      console.log("DexScreener: No boosted tokens found");
      console.log("Raw Boost Response:", JSON.stringify(boostRes.data)?.slice(0, 400));
      return;
    }

    // Take top 50 addresses
    const top50 = boostedArray.slice(0, 50);
    const addresses = top50.map((e: any) => e?.tokenAddress).filter(Boolean);

    console.log(`DexScreener: Boosted tokens → ${addresses.length} addresses`);

    if (addresses.length === 0) return;

    // STEP 2 — Fetch token details in limited concurrency
    const detailPromises = addresses.map((addr: string) =>
      limit(() =>
        http
          .get(`https://api.dexscreener.com/latest/dex/tokens/${addr}`)
          .then((r) => r)
          .catch((err) => {
            // swallow error, return null so Promise.allSettled can handle
            console.warn(`Dexscreener detail fetch failed for ${addr}: ${String(err)}`);
            return null;
          })
      )
    );

    const settled = await Promise.allSettled(detailPromises);
    const successfulResults: any[] = [];

    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) {
        successfulResults.push(s.value);
      }
    }

    // STEP 3 — collect SOL / SOL-quoted pairs only and normalize
    const normalizedPairs: any[] = [];

    for (const res of successfulResults) {
      const pairs = res?.data?.pairs;
      if (!Array.isArray(pairs)) continue;

      const solPairs = pairs.filter(
        (pair: any) =>
          pair?.chainId === "solana" &&
          (pair?.quoteToken?.symbol?.toUpperCase?.() === "SOL" ||
            pair?.quoteToken?.symbol === "SOL")
      );

      for (const p of solPairs) {
        const normalized = normalizeDex(p);
        if (normalized.token_address) normalizedPairs.push(normalized);
      }
    }

    if (normalizedPairs.length === 0) {
      console.log("DexScreener: no SOL pairs normalized");
      return;
    }

    // STEP 4 — deduplicate by token_address and choose best pair
    const bestByAddress = new Map<string, any>();

    for (const t of normalizedPairs) {
      const addr = t.token_address;
      if (!addr) continue;

      const existing = bestByAddress.get(addr);
      if (!existing) {
        bestByAddress.set(addr, t);
        continue;
      }

      // choose the "better" entry: prefer higher liquidity, then higher volume, then more recent
      const existingScore =
        (existing.liquidity || 0) * 1e6 + (existing.volume || 0) * 1e3 + (existing.fetched_at || 0);
      const newScore = (t.liquidity || 0) * 1e6 + (t.volume || 0) * 1e3 + (t.fetched_at || 0);

      if (newScore > existingScore) {
        bestByAddress.set(addr, t);
      }
    }

    const deduped = Array.from(bestByAddress.values());

    // STEP 5 — POST to /ingest
    await ingestApi.post("/ingest", {
      source: "dex",
      tokens: deduped,
    });

    console.log(`DexScreener: sent ${deduped.length} deduped token(s) to /ingest`);
  } catch (err) {
    console.error("DexScreener fetch error:", err);
  }
}
