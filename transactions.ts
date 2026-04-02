import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, walletsTable, transactionsTable, blocksTable } from "@workspace/db";
import { SendTransactionBody, GetTransactionParams } from "@workspace/api-zod";
import { computeTransactionHash, BASE_GAS_FEE } from "../lib/blockchain.js";
import { randomBytes } from "crypto";
import { formatTx } from "./wallet.js";

const router: IRouter = Router();

router.post("/transactions/send", async (req, res): Promise<void> => {
  const parsed = SendTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { fromAddress, toAddress, amount, memo } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "invalid_amount", message: "Amount must be greater than 0" });
    return;
  }

  if (fromAddress === toAddress) {
    res.status(400).json({ error: "same_address", message: "Cannot send to yourself" });
    return;
  }

  const [sender] = await db.select().from(walletsTable).where(eq(walletsTable.address, fromAddress));
  if (!sender) {
    res.status(404).json({ error: "sender_not_found", message: "Sender wallet not found" });
    return;
  }

  const gasFee = BASE_GAS_FEE;
  const totalCost = amount + gasFee;
  const senderBalance = parseFloat(sender.balance);

  if (senderBalance < totalCost) {
    res.status(400).json({
      error: "insufficient_balance",
      message: `Insufficient balance. Need ${totalCost} MTID, have ${senderBalance} MTID`,
    });
    return;
  }

  const timestamp = Date.now();
  const nonce = randomBytes(8).toString("hex");
  const txHash = computeTransactionHash(fromAddress, toAddress, amount, gasFee, timestamp, nonce);

  await db.insert(transactionsTable).values({
    txHash,
    fromAddress,
    toAddress,
    amount: amount.toString(),
    gasFee: gasFee.toString(),
    status: "pending",
    blockHash: null,
    blockHeight: null,
    confirmations: 0,
    memo: memo ?? null,
  });

  await db
    .update(walletsTable)
    .set({
      balance: (senderBalance - totalCost).toString(),
      totalSent: (parseFloat(sender.totalSent) + amount).toString(),
      transactionCount: sender.transactionCount + 1,
    })
    .where(eq(walletsTable.address, fromAddress));

  const [recipient] = await db.select().from(walletsTable).where(eq(walletsTable.address, toAddress));
  if (recipient) {
    await db
      .update(walletsTable)
      .set({
        balance: (parseFloat(recipient.balance) + amount).toString(),
        totalReceived: (parseFloat(recipient.totalReceived) + amount).toString(),
        transactionCount: recipient.transactionCount + 1,
      })
      .where(eq(walletsTable.address, toAddress));
  }

  req.log.info({ txHash, fromAddress, toAddress, amount }, "Transaction submitted");

  res.status(201).json({
    txHash,
    fromAddress,
    toAddress,
    amount,
    gasFee,
    status: "pending",
    timestamp: new Date(timestamp).toISOString(),
  });
});

router.get("/transactions/pending", async (req, res): Promise<void> => {
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"))
    .orderBy(desc(transactionsTable.timestamp))
    .limit(50);

  const total = txs.length;

  res.json({
    transactions: txs.map(formatTx),
    total,
    offset: 0,
    limit: 50,
  });
});

router.get("/transactions/:txHash", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.txHash) ? req.params.txHash[0] : req.params.txHash;
  const params = GetTransactionParams.safeParse({ txHash: raw });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.txHash, params.data.txHash));

  if (!tx) {
    res.status(404).json({ error: "not_found", message: "Transaction not found" });
    return;
  }

  res.json(formatTx(tx));
});

export default router;
