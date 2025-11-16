// src/normalizers/dex.ts
export function normalizeDex(entry: any) {
  // normalize token address: try several fields, trim and fallback to undefined
  const rawAddr =
    entry?.baseToken?.address ??
    entry?.tokenAddress ??
    entry?.base_token?.address ??
    "";

  const token_address = rawAddr ? String(rawAddr).trim() : undefined;

  return {
    token_address: token_address || undefined,
    token_name: entry?.baseToken?.name || entry?.tokenName || undefined,
    token_ticker: entry?.baseToken?.symbol || entry?.tokenTicker || undefined,

    price: entry?.priceUsd !== undefined ? Number(entry.priceUsd) : undefined,
    volume: entry?.volume?.h24 !== undefined ? Number(entry.volume.h24) : undefined,
    liquidity: entry?.liquidity?.usd !== undefined ? Number(entry.liquidity.usd) : undefined,
    market_cap: entry?.fdv !== undefined ? Number(entry.fdv) : undefined,

    txns: entry?.txns?.h24 !== undefined ? entry.txns.h24 : undefined,
    pair_address: entry?.pairAddress || undefined,
    dex_id: entry?.dexId || undefined,

    source: "dex",
    fetched_at: Date.now(),
  };
}
