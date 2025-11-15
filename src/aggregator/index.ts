import { sub, pub, redis } from "../lib/redis";

console.log("Aggregator started...");

// Subscribe to raw token updates
sub.subscribe("raw_tokens");

sub.on("message", async (_channel, message) => {
  try {
    const payload = JSON.parse(message);
    const { tokens, source, fetched_at } = payload;

    for (const t of tokens) {
      const addr = t.token_address;
      if (!addr) continue;

      // 1. Load current data
      const existing = await readTokenFromRedis(addr);

      // 2. Merge incoming + existing
      const merged = mergeTokens(existing, t, source, fetched_at);

      // 3. Compute diff
      const diff = diffObjects(existing, merged);

      // 4. Filter out useless changes (timestamps/noise)
      const filteredDiff = filterMeaningfulDiff(diff);

      // If meaningful changes → write + publish
      if (Object.keys(filteredDiff).length > 0) {
        await writeTokenToRedis(addr, merged);
        await pub.publish("state_changes", JSON.stringify({ address: addr, diff: filteredDiff }));
        prettyPrintDiff(addr, filteredDiff, existing);
      }
    }
  } catch (err) {
    console.error("Aggregator error:", err);
  }
});


//
// HELPER: Filter meaningful diffs
//
function filterMeaningfulDiff(diff: any) {
  const ignore = ["_updated_at", "fetched_at", "last_source", "token_address"];

  const meaningful: any = {};

  for (const [key, val] of Object.entries(diff)) {
    if (ignore.includes(key)) continue;

    // Skip null/undefined changes
    if (val === null || val === undefined) continue;

    meaningful[key] = val;
  }

  return meaningful;
}


//
// HELPER: Pretty-print readable diff
//
function prettyPrintDiff(address: string, diff: any, oldData: any | null) {
  console.log(`\n📌 Token Update → ${address}`);

  const entries = Object.entries(diff);

  for (const [field, newValue] of entries) {
    const oldValue = oldData ? oldData[field] : undefined;

    const newNum = Number(newValue);
    const oldNum = Number(oldValue);

  
    // ------------------------
    // VOLUME THRESHOLD
    // ------------------------
    if (field === "volume" && !isNaN(newNum) && !isNaN(oldNum)) {
      if (Math.abs(newNum - oldNum) < 20) continue; // skip small volume changes
    }

    // ------------------------
    // LIQUIDITY THRESHOLD
    // ------------------------
    if (field === "liquidity" && !isNaN(newNum) && !isNaN(oldNum)) {
      if (Math.abs(newNum - oldNum) < 1) continue; // skip tiny liq changes
    }

    // Print readable change
    console.log(
      `  ${field.padEnd(18)} ${String(oldValue).padEnd(10)} → ${newValue}`
    );
  }

  console.log("");
}



//
// 1. Read existing token
//
async function readTokenFromRedis(address: string): Promise<any | null> {
  const key = `token:${address}`;
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) return null;

  const parsed: any = {};
  for (const [k, v] of Object.entries(data)) {
    try {
      parsed[k] = JSON.parse(v);
    } catch {
      parsed[k] = v;
    }
  }
  return parsed;
}



//
// 2. Write merged token into Redis + sorted sets
//
async function writeTokenToRedis(address: string, token: any) {
  const key = `token:${address}`;
  const payload: Record<string, string> = {};

  for (const [k, v] of Object.entries(token)) {
    payload[k] = JSON.stringify(v);
  }

  await redis.hset(key, payload);

  if (token.volume !== undefined) {
    await redis.zadd("index:volume", token.volume, address);
  }

  if (token.liquidity !== undefined) {
    await redis.zadd("index:liquidity", token.liquidity, address);
  }

  if (token.market_cap !== undefined) {
    await redis.zadd("index:market_cap", token.market_cap, address);
  }

  if (token.price_24h_change !== undefined) {
    await redis.zadd("index:price_change_24h", token.price_24h_change, address);
  }
}



//
// 3. Merge tokens
//
function mergeTokens(
  existing: any | null,
  incoming: any,
  source: string,
  fetched_at: number
) {
  const result = existing ? { ...existing } : {};

  result.token_address = incoming.token_address;

  if (!result.token_name && incoming.token_name) {
    result.token_name = incoming.token_name;
  }
  if (!result.token_ticker && incoming.token_ticker) {
    result.token_ticker = incoming.token_ticker;
  }

  const numericFields = [
    "price",
    "market_cap",
    "volume",
    "liquidity",
    "transaction_count",
    "price_1h_change",
    "price_24h_change",
    "price_7d_change",
  ];

  for (const field of numericFields) {
    if (incoming[field] !== undefined && incoming[field] !== null) {
      result[field] = incoming[field];
    }
  }

  result.last_source = source;
  result.fetched_at = fetched_at;
  result._updated_at = Date.now();

  return result;
}



//
// 4. Compute diff
//
function diffObjects(oldObj: any | null, newObj: any) {
  const diff: Record<string, any> = {};

  if (!oldObj) return newObj;

  for (const [key, newValue] of Object.entries(newObj)) {
    const oldValue = oldObj[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff[key] = newValue;
    }
  }

  return diff;
}
