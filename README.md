🚀 Meme Coin Aggregator — Real-time Token Data Pipeline

A scalable real-time backend service that aggregates meme coin data from multiple DEX APIs, merges data, caches results, and broadcasts live updates — similar to Axiom.trade / Birdeye Discover / DexTools.

This project uses:

Node.js + TypeScript

Redis (Pub/Sub + Sorted Sets)

Axios (with retry + exponential backoff)

Custom workers (fetcher + aggregator)

🧱 Full Architecture
[ DexScreener API ] 
      ↓ fetch worker (polling)
raw_tokens → Redis Pub/Sub → Aggregator Worker
                                  ↓
                           Redis (hash + sorted sets)
                                  ↓
                      (API server + WebSocket server)
                                  ↓
                               Frontend

📦 Features Implemented So Far
✔ DexScreener Fetch Worker

Polls API every 8 seconds

Normalizes token data

Handles rate-limits (429)

Retries with exponential backoff

Publishes results into Redis Pub/Sub

✔ Aggregator Worker

Subscribes to raw_tokens channel

Loads existing token data from Redis

Merges tokens intelligently

Computes diffs

Publishes changes to state_changes channel

Stores merged tokens in Redis hashes

✔ Redis Database Structure

token:{address} → hash storing token fields

state_changes → pub/sub notifications

Designed for future sorted-set indexes:

index:volume

index:market_cap

index:liquidity

index:price_change_24h



🚀 Running the Project
1. Install dependencies
npm install

2. Start Redis

Linux:

sudo systemctl start redis-server


or via Docker:

docker run -p 6379:6379 redis

3. Run the fetcher worker
npx ts-node src/worker-runner.ts

4. Run the aggregator worker
npx ts-node src/aggregator-runner.ts

5. Observe real-time data

Subscribe to Redis:

redis-cli SUBSCRIBE raw_tokens
redis-cli SUBSCRIBE state_changes

🛠 Upcoming Features

Full API server (/discover)

Cursor-based pagination

Sorting by volume, liquidity, market cap

WebSocket server for real-time UI updates

Integration with Jupiter & GeckoTerminal

Meme coin filtering & scoring logic
