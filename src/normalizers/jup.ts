export function normalizeJup(addrRaw: string, j: any) {
  const token_address = addrRaw?.toString()?.trim();

  if (!token_address) return null;

  const price = j?.usdPrice;
  const price_change_24h = j?.priceChange24h;

  return {
    token_address,
    price: price !== undefined ? Number(price) : undefined,
    price_change_24h: price_change_24h !== undefined ? Number(price_change_24h) : undefined,
    source: "jup",
    fetched_at: Date.now(),
  };
}
