import { pool } from "@workspace/db";
import { Transaction } from "./transaction.js";
import { Block } from "./block.js";

export class BlockchainStorage {
  async saveBlock(block: Block): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO ix_blocks
          (height, hash, previous_hash, timestamp, nonce, difficulty, merkle_root,
           miner, block_reward, total_fees, tx_count, size_bytes, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (height) DO UPDATE SET
           hash=$2, data=$13`,
        [
          block.height,
          block.hash,
          block.previousHash,
          block.timestamp,
          block.nonce,
          block.difficulty,
          block.merkleRoot,
          block.miner,
          block.blockReward,
          block.totalFees,
          block.txCount,
          block.sizeBytes,
          JSON.stringify(block.toJSON()),
        ]
      );

      for (const tx of block.transactions) {
        await client.query(
          `INSERT INTO ix_transactions
            (id, block_height, block_hash, from_addr, to_addr, amount, fee,
             gas_price, gas_used, nonce, signature, public_key, contract, status, timestamp, data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            tx.id,
            block.height,
            block.hash,
            tx.from,
            tx.to,
            tx.amount,
            tx.fee,
            tx.gasPrice,
            tx.gasUsed,
            tx.nonce,
            tx.signature ?? null,
            tx.publicKey ?? null,
            tx.contract ? JSON.stringify(tx.contract) : null,
            "confirmed",
            tx.timestamp,
            JSON.stringify(tx.toJSON()),
          ]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async loadChain(): Promise<Block[]> {
    const res = await pool.query(
      "SELECT data FROM ix_blocks ORDER BY height ASC"
    );
    return res.rows.map((r) => {
      const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      return this.deserializeBlock(d);
    });
  }

  deserializeBlock(d: ReturnType<Block["toJSON"]>): Block {
    const txs = (d.transactions ?? []).map((t: ReturnType<Transaction["toJSON"]>) => {
      const tx = new Transaction({
        from: t.from,
        to: t.to,
        amount: Number(t.amount),
        fee: Number(t.fee),
        gasPrice: Number(t.gasPrice),
        gasUsed: Number(t.gasUsed),
        nonce: t.nonce,
        contract: t.contract ?? null,
      });
      tx.id = t.id;
      tx.timestamp = t.timestamp;
      tx.signature = t.signature;
      tx.publicKey = t.publicKey;
      tx.status = t.status as "pending" | "confirmed" | "failed";
      return tx;
    });

    const block = new Block({
      height: d.height,
      previousHash: d.previousHash,
      timestamp: d.timestamp,
      difficulty: d.difficulty,
      miner: d.miner,
      transactions: txs,
      blockReward: Number(d.blockReward),
      totalFees: Number(d.totalFees),
    });
    block.hash = d.hash;
    block.nonce = d.nonce;
    return block;
  }

  async getBlock(hashOrHeight: string | number): Promise<Block | null> {
    const query =
      typeof hashOrHeight === "number"
        ? "SELECT data FROM ix_blocks WHERE height = $1"
        : "SELECT data FROM ix_blocks WHERE hash = $1";
    const res = await pool.query(query, [hashOrHeight]);
    if (!res.rows.length) return null;
    const d = typeof res.rows[0].data === "string"
      ? JSON.parse(res.rows[0].data)
      : res.rows[0].data;
    return this.deserializeBlock(d);
  }

  async getTransaction(id: string) {
    const res = await pool.query(
      "SELECT data FROM ix_transactions WHERE id = $1",
      [id]
    );
    if (!res.rows.length) return null;
    return typeof res.rows[0].data === "string"
      ? JSON.parse(res.rows[0].data)
      : res.rows[0].data;
  }

  async getAddressTransactions(address: string, limit = 20, offset = 0) {
    const res = await pool.query(
      `SELECT data FROM ix_transactions
       WHERE from_addr = $1 OR to_addr = $1
       ORDER BY timestamp DESC LIMIT $2 OFFSET $3`,
      [address, limit, offset]
    );
    return res.rows.map((r) =>
      typeof r.data === "string" ? JSON.parse(r.data) : r.data
    );
  }

  async saveConfig(key: string, value: string): Promise<void> {
    await pool.query(
      `INSERT INTO ix_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  }

  async getConfig(key: string): Promise<string | null> {
    const res = await pool.query(
      "SELECT value FROM ix_config WHERE key = $1",
      [key]
    );
    return res.rows.length ? res.rows[0].value : null;
  }

  async saveWallet(address: string, publicKey: string, mnemonic: string, isGenesis = false): Promise<void> {
    await pool.query(
      `INSERT INTO ix_wallets (address, public_key, mnemonic, is_genesis, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (address) DO NOTHING`,
      [address, publicKey, mnemonic, isGenesis, Date.now()]
    );
  }

  async getGenesisWallet() {
    const res = await pool.query(
      "SELECT address, public_key, mnemonic FROM ix_wallets WHERE is_genesis = true LIMIT 1"
    );
    return res.rows[0] ?? null;
  }

  async getChainHeight(): Promise<number> {
    const res = await pool.query(
      "SELECT COALESCE(MAX(height), -1) as height FROM ix_blocks"
    );
    return Number(res.rows[0].height);
  }

  async getTotalTransactions(): Promise<number> {
    const res = await pool.query("SELECT COUNT(*) as cnt FROM ix_transactions");
    return Number(res.rows[0].cnt);
  }

  async getRecentBlocks(limit = 10): Promise<object[]> {
    const res = await pool.query(
      `SELECT height, hash, previous_hash, timestamp, miner, block_reward, total_fees, tx_count, difficulty
       FROM ix_blocks ORDER BY height DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  async getRecentTransactions(limit = 10): Promise<object[]> {
    const res = await pool.query(
      `SELECT id, block_height, from_addr, to_addr, amount, fee, status, timestamp
       FROM ix_transactions ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  async searchBlocks(query: string): Promise<object[]> {
    const height = parseInt(query);
    if (!isNaN(height)) {
      const res = await pool.query(
        "SELECT * FROM ix_blocks WHERE height = $1",
        [height]
      );
      return res.rows;
    }
    const res = await pool.query(
      "SELECT * FROM ix_blocks WHERE hash ILIKE $1 LIMIT 5",
      [`%${query}%`]
    );
    return res.rows;
  }
}
