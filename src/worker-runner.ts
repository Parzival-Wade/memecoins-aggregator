import dotenv from "dotenv";
dotenv.config();

import { redis } from "./lib/redis";
import { fetchDexScreener } from "./workers/dexscreenerFetcher";
import { fetchJupiter } from "./workers/jupiterFetcher";

const interval = Number(process.env.FETCH_INTERVAL || 8000);

console.log("Starting Worker Runner...");

async function runCycle() {
  try {
    console.log("\n=== Fetch Cycle Start ===");

    // 1) Fetch trending Solana tokens from DexScreener
    await fetchDexScreener();

    // 2) Get all known tokens from Redis
    const keys = await redis.keys("token:*");
    const addresses = keys.map((k) => k.replace("token:", ""));

    console.log(`Jupiter: fetching prices for ${addresses.length} tokens...`);

    // 3) Fetch Jupiter prices for all tokens we have
    await fetchJupiter(addresses);

    console.log("=== Fetch Cycle Complete ===");

  } catch (err) {
    console.error("Worker Cycle Error:", err);
  }
}

// Run immediately when worker starts
runCycle();

// Run every X milliseconds
setInterval(runCycle, interval);
