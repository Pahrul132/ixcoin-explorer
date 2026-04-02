import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, blocksTable, transactionsTable, walletsTable } from "@workspace/db";
import { GetBlockParams, GetBlocksQueryParams } from "@workspace/api-zod";
import {
  COIN_SYMBOL,
  NETWORK_NAME,
  ALGORITHM,
  MAX_SUPPLY,
  INITIAL_REWARD,
  HALVING_INTERVAL,
  getBlockReward,
  getNextHalving,
} from "../lib/blockchain.js";

const router: IRouter = Router();

router.get("/blockchain/info", async (req, res): Promise<void> => {
  const latestBlockResult = await db
    .select()
    .from(blocksTable)
    .orderBy(desc(blocksTable.height))
    .limit(1);

  const totalTxResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactionsTable);

  const activeWalletsResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(walletsTable);

  const latestBlock = latestBlockResult[0];
  const currentHeight = latestBlock?.height ?? 0;
  const difficulty = latestBlock?.difficulty ?? 2;

  const mintedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(reward), 0)` })
    .from(blocksTable);

  const totalMinted = parseFloat(mintedResult[0]?.total ?? "0");
  const currentReward = getBlockReward(currentHeight);
  const nextHalvingBlock = getNextHalving(currentHeight);

  res.json({
    networkName: NETWORK_NAME,
    symbol: COIN_SYMBOL,
    algorithm: ALGORITHM,
    currentHeight,
    difficulty,
    totalSupply: totalMinted,
    maxSupply: MAX_SUPPLY,
    circulatingSupply: totalMinted,
    blockReward: currentReward,
    halvingBlock: HALVING_INTERVAL,
    avgBlockTime: TARGET_BLOCK_TIME,
    tps: 3000,
    totalTransactions: parseInt(totalTxResult[0]?.count ?? "0"),
    activeWallets: parseInt(activeWalletsResult[0]?.count ?? "0"),
    gasFeeEnabled: true,
  });
});

const TARGET_BLOCK_TIME = 10;

router.get("/blockchain/blocks", async (req, res): Promise<void> => {
  const query = GetBlocksQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 10) : 10;
  const offset = query.success ? (query.data.offset ?? 0) : 0;

  const blocks = await db
    .select()
    .from(blocksTable)
    .orderBy(desc(blocksTable.height))
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<string>`COUNT(*)` }).from(blocksTable);
  const total = parseInt(countResult[0]?.count ?? "0");

  res.json({
    blocks: blocks.map(formatBlock),
    total,
  });
});

router.get("/blockchain/blocks/:blockHash", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.blockHash) ? req.params.blockHash[0] : req.params.blockHash;
  const params = GetBlockParams.safeParse({ blockHash: raw });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [block] = await db.select().from(blocksTable).where(eq(blocksTable.blockHash, params.data.blockHash));

  if (!block) {
    res.status(404).json({ error: "not_found", message: "Block not found" });
    return;
  }

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.blockHash, block.blockHash));

  res.json({
    ...formatBlock(block),
    transactions: txs.map(tx => ({
      txHash: tx.txHash,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: parseFloat(tx.amount),
      gasFee: parseFloat(tx.gasFee),
      status: tx.status as "pending" | "confirmed" | "failed",
      blockHash: tx.blockHash ?? undefined,
      blockHeight: tx.blockHeight ?? undefined,
      confirmations: tx.confirmations,
      memo: tx.memo ?? undefined,
      timestamp: tx.timestamp.toISOString(),
    })),
  });
});

function formatBlock(block: typeof blocksTable.$inferSelect) {
  return {
    blockHash: block.blockHash,
    height: block.height,
    previousHash: block.previousHash,
    merkleRoot: block.merkleRoot,
    transactionCount: block.transactionCount,
    miner: block.miner,
    reward: parseFloat(block.reward),
    difficulty: block.difficulty,
    nonce: Number(block.nonce),
    timestamp: block.timestamp.toISOString(),
  };
}

export default router;
