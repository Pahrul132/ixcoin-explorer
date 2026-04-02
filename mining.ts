import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, blocksTable, transactionsTable, walletsTable } from "@workspace/db";
import { StartMiningBody } from "@workspace/api-zod";
import {
  mineBlock,
  computeMerkleRoot,
  getBlockReward,
  getDifficulty,
  getNextHalving,
  GENESIS_HASH,
  HALVING_INTERVAL,
} from "../lib/blockchain.js";

const router: IRouter = Router();

router.post("/mining/start", async (req, res): Promise<void> => {
  const parsed = StartMiningBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { minerAddress } = parsed.data;

  const [minerWallet] = await db.select().from(walletsTable).where(eq(walletsTable.address, minerAddress));
  if (!minerWallet) {
    res.status(404).json({
      success: false,
      message: "Miner wallet not found. Create a wallet first.",
    });
    return;
  }

  const latestBlocks = await db
    .select()
    .from(blocksTable)
    .orderBy(desc(blocksTable.height))
    .limit(1);

  const latestBlock = latestBlocks[0];
  const height = (latestBlock?.height ?? -1) + 1;
  const previousHash = latestBlock?.blockHash ?? GENESIS_HASH;

  const blockCount = height;
  const difficulty = getDifficulty(blockCount);
  const reward = getBlockReward(height);

  const pendingTxs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"))
    .limit(100);

  const txHashes = pendingTxs.map(tx => tx.txHash);
  const merkleRoot = computeMerkleRoot(txHashes.length > 0 ? txHashes : [`coinbase-${height}`]);

  let miningResult: { hash: string; nonce: number; timeMs: number };
  try {
    miningResult = mineBlock(height, previousHash, merkleRoot, difficulty);
  } catch (err) {
    res.status(500).json({ success: false, message: "Mining failed. Please try again." });
    return;
  }

  await db.insert(blocksTable).values({
    blockHash: miningResult.hash,
    height,
    previousHash,
    merkleRoot,
    transactionCount: pendingTxs.length,
    miner: minerAddress,
    reward: reward.toString(),
    difficulty,
    nonce: miningResult.nonce,
  });

  if (pendingTxs.length > 0) {
    await db
      .update(transactionsTable)
      .set({
        status: "confirmed",
        blockHash: miningResult.hash,
        blockHeight: height,
        confirmations: 1,
      })
      .where(eq(transactionsTable.status, "pending"));
  }

  const [miner] = await db.select().from(walletsTable).where(eq(walletsTable.address, minerAddress));
  if (miner) {
    await db
      .update(walletsTable)
      .set({
        balance: (parseFloat(miner.balance) + reward).toString(),
        totalReceived: (parseFloat(miner.totalReceived) + reward).toString(),
      })
      .where(eq(walletsTable.address, minerAddress));
  }

  req.log.info({ height, hash: miningResult.hash, reward, miner: minerAddress }, "Block mined");

  res.json({
    success: true,
    blockHash: miningResult.hash,
    height,
    reward,
    nonce: miningResult.nonce,
    difficulty,
    timeMs: miningResult.timeMs,
    message: `Block #${height} mined successfully! Reward: ${reward} MTID`,
  });
});

router.get("/mining/stats", async (req, res): Promise<void> => {
  const countResult = await db.select({ count: sql<string>`COUNT(*)` }).from(blocksTable);
  const totalBlocks = parseInt(countResult[0]?.count ?? "0");

  const latestBlock = await db
    .select()
    .from(blocksTable)
    .orderBy(desc(blocksTable.height))
    .limit(1);

  const currentHeight = latestBlock[0]?.height ?? 0;
  const currentDifficulty = getDifficulty(currentHeight);
  const currentReward = getBlockReward(currentHeight);
  const nextHalving = getNextHalving(currentHeight);

  const minerCountResult = await db
    .select({ count: sql<string>`COUNT(DISTINCT miner)` })
    .from(blocksTable);

  res.json({
    currentDifficulty,
    hashRate: currentDifficulty * 1000 * Math.random() + 500000,
    blocksMinedTotal: totalBlocks,
    lastBlockTime: latestBlock[0]?.timestamp?.toISOString() ?? new Date().toISOString(),
    currentReward,
    nextHalving,
    totalMiners: parseInt(minerCountResult[0]?.count ?? "0"),
  });
});

export default router;
