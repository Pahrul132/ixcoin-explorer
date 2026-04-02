import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import {
  CreateWalletBody,
  GetWalletParams,
  GetWalletBalanceParams,
  GetWalletTransactionsParams,
  GetWalletTransactionsQueryParams,
} from "@workspace/api-zod";
import { generateKeyPair } from "../lib/blockchain.js";

const router: IRouter = Router();

router.post("/wallet/create", async (req, res): Promise<void> => {
  const parsed = CreateWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { name } = parsed.data;
  const { privateKey, publicKey, address } = generateKeyPair();

  const existing = await db.select().from(walletsTable).where(eq(walletsTable.address, address));
  if (existing.length > 0) {
    res.status(400).json({ error: "address_exists", message: "Wallet address already exists" });
    return;
  }

  await db.insert(walletsTable).values({
    address,
    publicKey,
    name: name ?? null,
    balance: "1000",
    totalSent: "0",
    totalReceived: "1000",
    transactionCount: 0,
  });

  req.log.info({ address }, "New wallet created");

  res.status(201).json({
    address,
    publicKey,
    name: name ?? null,
    balance: 1000,
    createdAt: new Date().toISOString(),
    warning: `IMPORTANT: Save your private key securely! It will NOT be stored anywhere: ${privateKey}. Anyone with your private key has full access to your wallet. Never share it.`,
  });
});

router.get("/wallet/:address", async (req, res): Promise<void> => {
  const params = GetWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.address, params.data.address));

  if (!wallet) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }

  res.json({
    address: wallet.address,
    publicKey: wallet.publicKey,
    name: wallet.name ?? undefined,
    balance: parseFloat(wallet.balance),
    totalSent: parseFloat(wallet.totalSent),
    totalReceived: parseFloat(wallet.totalReceived),
    transactionCount: wallet.transactionCount,
    createdAt: wallet.createdAt.toISOString(),
  });
});

router.get("/wallet/:address/balance", async (req, res): Promise<void> => {
  const params = GetWalletBalanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.address, params.data.address));

  if (!wallet) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }

  const pendingResult = await db
    .select({ total: sql<string>`COALESCE(SUM(amount + gas_fee), 0)` })
    .from(transactionsTable)
    .where(
      sql`from_address = ${wallet.address} AND status = 'pending'`
    );

  const pendingOut = parseFloat(pendingResult[0]?.total ?? "0");
  const balance = parseFloat(wallet.balance);

  res.json({
    address: wallet.address,
    balance,
    pendingBalance: pendingOut,
    confirmedBalance: balance - pendingOut,
  });
});

router.get("/wallet/:address/transactions", async (req, res): Promise<void> => {
  const params = GetWalletTransactionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const query = GetWalletTransactionsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = query.success ? (query.data.offset ?? 0) : 0;

  const { address } = params.data;

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(sql`from_address = ${address} OR to_address = ${address}`)
    .orderBy(sql`timestamp DESC`)
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactionsTable)
    .where(sql`from_address = ${address} OR to_address = ${address}`);

  const total = parseInt(countResult[0]?.count ?? "0");

  res.json({
    transactions: txs.map(formatTx),
    total,
    offset,
    limit,
  });
});

function formatTx(tx: typeof transactionsTable.$inferSelect) {
  return {
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
  };
}

export default router;
export { formatTx };
