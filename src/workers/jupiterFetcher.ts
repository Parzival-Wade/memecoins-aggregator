import { http, limit } from "../lib/httpClient";
import { publishRaw } from "./fetcherBase";

function normalizeJup(address: string, j: any) {
  return {
    token_address: address,
    price: j.usdPrice,
    price_24h_change: j.priceChange24h,
    source: "jupiter",
    fetched_at: Date.now(),
  };
}

export async function fetchJupiter(addresses: string[]) {
  try {
    if (addresses.length === 0) return;

    // Jupiter supports up to ~100 IDs comfortably
    const chunks = [];
    for (let i = 0; i < addresses.length; i += 50) {
      chunks.push(addresses.slice(i, i + 50));
    }

    const allTokens: any[] = [];

    for (const chunk of chunks) {
      const url = `https://lite-api.jup.ag/price/v3?ids=${chunk.join(",")}`;

      const res = await limit(() => http.get(url));
      const data = res.data || {};

      for (const [tokenAddress, info] of Object.entries<any>(data)) {
        allTokens.push(normalizeJup(tokenAddress, info));
      }
    }

    await publishRaw("jupiter", allTokens);

    console.log(`Jupiter: Published ${allTokens.length} price updates`);

  } catch (err) {
    console.error("Jupiter fetch error:", err);
  }
}
