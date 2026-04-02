import { Router, type IRouter } from "express";
import { desc, gte, sql } from "drizzle-orm";
import { db, blocksTable, walletsTable, priceHistoryTable } from "@workspace/db";
import { GetPriceHistoryQueryParams } from "@workspace/api-zod";
import { getCurrentPrice, getPriceHistory, initializeMarket } from "../lib/market.js";
import { COIN_SYMBOL, MAX_SUPPLY } from "../lib/blockchain.js";

initializeMarket().catch(console.error);

const router: IRouter = Router();

router.get("/market/price", async (req, res): Promise<void> => {
  const price = getCurrentPrice();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const history24h = await db
    .select()
    .from(priceHistoryTable)
    .where(gte(priceHistoryTable.timestamp, oneDayAgo))
    .orderBy(priceHistoryTable.timestamp);

  const prices = history24h.map(p => parseFloat(p.priceUsd));
  const volumes = history24h.map(p => parseFloat(p.volume));

  const high24h = prices.length > 0 ? Math.max(...prices) : price;
  const low24h = prices.length > 0 ? Math.min(...prices) : price;
  const openPrice = prices.length > 0 ? prices[0] : price;
  const priceChange24h = price - openPrice;
  const priceChangePercent24h = openPrice > 0 ? (priceChange24h / openPrice) * 100 : 0;
  const volume24h = volumes.reduce((a, b) => a + b, 0);

  const mintedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(reward), 0)` })
    .from(blocksTable);
  const circulatingSupply = parseFloat(mintedResult[0]?.total ?? "0");
  const marketCap = price * circulatingSupply;

  res.json({
    symbol: COIN_SYMBOL,
    priceUsd: price,
    priceChange24h,
    priceChangePercent24h,
    volume24h,
    marketCap,
    high24h,
    low24h,
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/market/history", async (req, res): Promise<void> => {
  const query = GetPriceHistoryQueryParams.safeParse(req.query);
  const period = query.success ? (query.data.period ?? "24h") : "24h";

  const history = await getPriceHistory(period);

  res.json({
    symbol: COIN_SYMBOL,
    period,
    data: history.map(p => ({
      timestamp: p.timestamp.toISOString(),
      price: parseFloat(p.priceUsd),
      volume: parseFloat(p.volume),
    })),
  });
});

router.get("/market/stats", async (req, res): Promise<void> => {
  const price = getCurrentPrice();

  const mintedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(reward), 0)` })
    .from(blocksTable);
  const circulatingSupply = parseFloat(mintedResult[0]?.total ?? "0");

  const allHistory = await db
    .select()
    .from(priceHistoryTable)
    .orderBy(priceHistoryTable.priceUsd);

  const allPrices = allHistory.map(p => parseFloat(p.priceUsd));
  const allTimeHigh = allPrices.length > 0 ? Math.max(...allPrices) : price;
  const allTimeLow = allPrices.length > 0 ? Math.min(...allPrices) : price;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const vol24hResult = await db
    .select({ total: sql<string>`COALESCE(SUM(volume), 0)` })
    .from(priceHistoryTable)
    .where(gte(priceHistoryTable.timestamp, oneDayAgo));
  const volume24h = parseFloat(vol24hResult[0]?.total ?? "0");

  res.json({
    symbol: COIN_SYMBOL,
    rank: 1,
    priceUsd: price,
    marketCap: price * circulatingSupply,
    volume24h,
    circulatingSupply,
    maxSupply: MAX_SUPPLY,
    allTimeHigh,
    allTimeLow,
  });
});

export default router;
