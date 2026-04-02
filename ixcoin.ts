import { Router, type IRouter, type Request } from "express";
import { blockchain, IXWallet, Transaction, CHAIN_CONFIG, validateAddress } from "../blockchain/index.js";
import { HDKey } from "@scure/bip32";

const router: IRouter = Router();

router.get("/info", (_req, res) => {
  res.json(blockchain.getStats());
});

router.get("/genesis-wallet", async (req, res) => {
  try {
    const w = await blockchain.storage.getGenesisWallet();
    if (!w) return res.status(404).json({ error: "Genesis wallet tidak ditemukan" });
    res.json({
      address: w.address,
      balance: blockchain.getBalance(w.address),
      publicKey: w.public_key,
      network: CHAIN_CONFIG.NETWORK,
      ticker: CHAIN_CONFIG.TICKER,
    });
  } catch (err) {
    (req as Request).log?.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/chain", async (_req, res) => {
  try {
    const blocks = await blockchain.storage.getRecentBlocks(50);
    res.json({ blocks, total: blockchain.chain.length });
  } catch {
    res.status(500).json({ error: "Gagal mengambil chain" });
  }
});

router.get("/block/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const block = isNaN(Number(id))
      ? await blockchain.storage.getBlock(id)
      : await blockchain.storage.getBlock(Number(id));
    if (!block) return res.status(404).json({ error: "Block tidak ditemukan" });
    res.json(block.toJSON());
  } catch {
    res.status(500).json({ error: "Gagal mengambil block" });
  }
});

router.get("/tx/:id", async (req, res) => {
  try {
    const tx = await blockchain.storage.getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    res.json(tx);
  } catch {
    res.status(500).json({ error: "Gagal mengambil transaksi" });
  }
});

router.get("/address/:addr", async (req, res) => {
  try {
    const addr = req.params.addr;
    if (!validateAddress(addr)) return res.status(400).json({ error: "Alamat IXCOIN tidak valid" });

    const balance = blockchain.getBalance(addr);
    const nonce = blockchain.getNonce(addr);
    const pending = blockchain.getPendingOutflow(addr);
    const txs = await blockchain.storage.getAddressTransactions(addr, 20, 0);
    const allTxs = await blockchain.storage.getAddressTransactions(addr, 1000, 0);

    res.json({
      address: addr,
      balance,
      pendingOutflow: pending,
      available: balance - pending,
      nonce,
      txCount: allTxs.length,
      transactions: txs,
    });
  } catch {
    res.status(500).json({ error: "Gagal mengambil info alamat" });
  }
});

router.get("/balance/:addr", (req, res) => {
  const addr = req.params.addr;
  if (!validateAddress(addr)) return res.status(400).json({ error: "Alamat tidak valid" });
  res.json({ address: addr, balance: blockchain.getBalance(addr), ticker: CHAIN_CONFIG.TICKER });
});

router.get("/mempool", (_req, res) => {
  res.json({
    count: blockchain.mempool.length,
    transactions: blockchain.mempool.map((t) => t.toJSON()),
    totalFees: blockchain.mempool.reduce((s, t) => s + t.fee, 0),
  });
});

router.post("/wallet/new", (_req, res) => {
  try {
    const wallet = IXWallet.create();
    res.json({
      ...wallet.toFullJSON(),
      network: CHAIN_CONFIG.NETWORK,
      warning: "SIMPAN MNEMONIC DAN PRIVATE KEY INI! Tidak bisa dipulihkan jika hilang.",
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat wallet" });
  }
});

router.post("/wallet/restore", (req, res) => {
  try {
    const { mnemonic } = req.body as { mnemonic: string };
    if (!mnemonic) return res.status(400).json({ error: "Mnemonic diperlukan" });

    const wallet = IXWallet.fromMnemonic(mnemonic.trim());
    res.json({
      address: wallet.address,
      publicKey: wallet.publicKeyHex,
      privateKey: wallet.privateKeyHex,
      mnemonic: wallet.mnemonic,
      balance: blockchain.getBalance(wallet.address),
      nonce: blockchain.getNonce(wallet.address),
      warning: "JANGAN BAGIKAN PRIVATE KEY INI KEPADA SIAPAPUN!",
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Mnemonic tidak valid" });
  }
});

router.post("/send", async (req, res) => {
  try {
    const { from, to, amount, privateKeyHex, nonce, gasPrice, contract } = req.body as {
      from: string;
      to: string;
      amount: number;
      privateKeyHex: string;
      nonce?: number;
      gasPrice?: number;
      contract?: string;
    };

    if (!from || !to || !amount || !privateKeyHex) {
      return res.status(400).json({ error: "Field wajib: from, to, amount, privateKeyHex" });
    }
    if (!validateAddress(to)) return res.status(400).json({ error: "Alamat tujuan tidak valid" });
    if (Number(amount) <= 0) return res.status(400).json({ error: "Amount harus positif" });

    const txNonce = nonce ?? blockchain.getNonce(from);
    const gasEstimate = blockchain.gas.estimate("medium");

    const privBytes = Buffer.from(privateKeyHex, "hex");
    const hdKey = new HDKey({ privateKey: privBytes });
    const publicKeyHex = Buffer.from(hdKey.publicKey!).toString("hex");

    const tx = new Transaction({
      from,
      to,
      amount: Number(amount),
      fee: gasEstimate.fee,
      gasPrice: gasPrice ?? gasEstimate.gasPrice,
      gasUsed: gasEstimate.gasUsed,
      nonce: txNonce,
      contract: contract ?? null,
    });

    tx.sign(privateKeyHex, publicKeyHex);
    blockchain.addTransaction(tx);

    res.json({
      success: true,
      txId: tx.id,
      from,
      to,
      amount,
      fee: tx.fee,
      nonce: txNonce,
      status: "pending",
      message: "Transaksi berhasil ditambahkan ke mempool",
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/mine", async (req, res) => {
  try {
    const { address } = req.body as { address: string };
    if (!address) return res.status(400).json({ error: "Alamat miner diperlukan" });
    if (!validateAddress(address)) return res.status(400).json({ error: "Alamat miner tidak valid" });

    const block = await blockchain.mine(address);

    res.json({
      success: true,
      block: {
        height: block.height,
        hash: block.hash,
        nonce: block.nonce,
        difficulty: block.difficulty,
        txCount: block.txCount,
        reward: block.blockReward,
        fees: block.totalFees,
        timestamp: block.timestamp,
      },
      newBalance: blockchain.getBalance(address),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/airdrop", async (req, res) => {
  try {
    const { from, privateKeyHex, recipients, mineAfter } = req.body as {
      from: string;
      privateKeyHex: string;
      recipients: { address: string; amount: number }[];
      mineAfter?: boolean;
    };

    if (!from || !privateKeyHex) return res.status(400).json({ error: "from dan privateKeyHex wajib diisi" });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0)
      return res.status(400).json({ error: "recipients harus berupa array dan tidak boleh kosong" });
    if (recipients.length > 50) return res.status(400).json({ error: "Maksimum 50 penerima per airdrop" });

    const privBytes = Buffer.from(privateKeyHex, "hex");
    const hdKey = new HDKey({ privateKey: privBytes });
    const publicKeyHex = Buffer.from(hdKey.publicKey!).toString("hex");
    const gasEstimate = blockchain.gas.estimate("low");

    const results: { address: string; amount: number; txId: string; status: string }[] = [];
    const errors: { address: string; error: string }[] = [];
    let currentNonce = blockchain.getNonce(from);

    for (const recipient of recipients) {
      try {
        if (!validateAddress(recipient.address)) throw new Error("Alamat tidak valid");
        if (recipient.amount <= 0) throw new Error("Amount harus positif");

        const tx = new Transaction({
          from,
          to: recipient.address,
          amount: Number(recipient.amount),
          fee: gasEstimate.fee,
          gasPrice: gasEstimate.gasPrice,
          gasUsed: gasEstimate.gasUsed,
          nonce: currentNonce++,
          contract: null,
        });
        tx.sign(privateKeyHex, publicKeyHex);
        blockchain.addTransaction(tx);
        results.push({ address: recipient.address, amount: recipient.amount, txId: tx.id, status: "pending" });
      } catch (e) {
        errors.push({ address: recipient.address, error: e instanceof Error ? e.message : String(e) });
      }
    }

    let minedBlock = null;
    if (mineAfter && results.length > 0) {
      const block = await blockchain.mine(from);
      minedBlock = { height: block.height, hash: block.hash, txCount: block.txCount };
      results.forEach((r) => (r.status = "confirmed"));
    }

    const totalSent = results.reduce((s, r) => s + r.amount, 0);
    res.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      totalAmount: totalSent,
      results,
      errors,
      minedBlock,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/gas/estimate", (req, res) => {
  const priority = (req.query.priority as "low" | "medium" | "high") ?? "medium";
  res.json({ ...blockchain.gas.estimate(priority), baseFee: blockchain.gas.getBaseFee() });
});

router.get("/validate", (_req, res) => {
  res.json(blockchain.validateChain());
});

router.get("/search/:query", async (req, res) => {
  try {
    const q = req.params.query;
    if (validateAddress(q)) {
      return res.json({
        type: "address",
        data: {
          address: q,
          balance: blockchain.getBalance(q),
          nonce: blockchain.getNonce(q),
        },
      });
    }
    const height = parseInt(q);
    if (!isNaN(height)) {
      const block = await blockchain.storage.getBlock(height);
      if (block) return res.json({ type: "block", data: block.toJSON() });
    }
    if (q.length > 20) {
      const tx = await blockchain.storage.getTransaction(q);
      if (tx) return res.json({ type: "transaction", data: tx });
      const block = await blockchain.storage.getBlock(q);
      if (block) return res.json({ type: "block", data: block.toJSON() });
    }
    res.status(404).json({ error: "Tidak ditemukan" });
  } catch {
    res.status(500).json({ error: "Pencarian gagal" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const [totalTxs, recentBlocks, recentTxs] = await Promise.all([
      blockchain.storage.getTotalTransactions(),
      blockchain.storage.getRecentBlocks(5),
      blockchain.storage.getRecentTransactions(5),
    ]);
    res.json({ ...blockchain.getStats(), totalTransactions: totalTxs, recentBlocks, recentTransactions: recentTxs });
  } catch {
    res.status(500).json({ error: "Gagal mengambil stats" });
  }
});

router.get("/rich-list", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const balances = blockchain.balances;
    const totalSupply = blockchain.totalMinted;
    const sorted = Object.entries(balances)
      .filter(([, bal]) => bal > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([address, balance], i) => ({
        rank: i + 1,
        address,
        balance,
        percentage: totalSupply > 0 ? ((balance / totalSupply) * 100).toFixed(4) : "0",
      }));
    res.json({ total: sorted.length, totalSupply, accounts: sorted });
  } catch {
    res.status(500).json({ error: "Gagal mengambil rich list" });
  }
});

router.get("/metrics", (_req, res) => {
  try {
    const stats = blockchain.getStats();
    const lastBlock = blockchain.chain.length > 0 ? blockchain.chain[blockchain.chain.length - 1] : null;
    res.json({
      name: CHAIN_CONFIG.NAME,
      symbol: CHAIN_CONFIG.TICKER,
      max_supply: CHAIN_CONFIG.MAX_SUPPLY,
      total_supply: stats.totalMinted,
      circulating_supply: stats.circulating,
      total_burned: stats.totalBurned,
      block_height: stats.height,
      block_reward: stats.blockReward,
      last_block_time: lastBlock ? new Date(Number(lastBlock.timestamp)).toISOString() : null,
      halving_progress: stats.halvingProgress,
      next_halving_block: stats.nextHalvingBlock,
      difficulty: stats.difficulty,
      mempool_size: stats.mempoolSize,
      consensus: "SHA-256 PoW",
      decimals: 8,
      chain_id: CHAIN_CONFIG.CHAIN_ID,
      version: CHAIN_CONFIG.VERSION,
      block_time_target_seconds: CHAIN_CONFIG.TARGET_BLOCK_TIME_MS / 1000,
    });
  } catch {
    res.status(500).json({ error: "Gagal mengambil metrics" });
  }
});

router.get("/stats/blocks", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const blocks = await blockchain.storage.getRecentBlocks(limit);
    const data = blocks
      .map((b, i, arr) => {
        const prev = arr[i + 1];
        const blockTimeMs = prev ? Number(b.timestamp) - Number(prev.timestamp) : null;
        return {
          height: b.height,
          timestamp: Number(b.timestamp),
          difficulty: b.difficulty,
          txCount: b.tx_count,
          reward: parseFloat(String(b.block_reward)),
          fees: parseFloat(String(b.total_fees)),
          blockTimeSec: blockTimeMs !== null ? Math.round(blockTimeMs / 1000) : null,
        };
      })
      .reverse();
    res.json({ blocks: data });
  } catch {
    res.status(500).json({ error: "Gagal mengambil statistik blok" });
  }
});

const faucetCooldowns = new Map<string, number>();
const FAUCET_AMOUNT = 10;
const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000;

router.post("/faucet", async (req, res) => {
  try {
    const { address } = req.body as { address: string };
    if (!address || !validateAddress(address)) {
      return res.status(400).json({ error: "Alamat IXCOIN tidak valid" });
    }

    const last = faucetCooldowns.get(address);
    if (last && Date.now() - last < FAUCET_COOLDOWN_MS) {
      const nextAvail = new Date(last + FAUCET_COOLDOWN_MS);
      return res.status(429).json({
        error: `Faucet sudah digunakan. Coba lagi pada ${nextAvail.toLocaleString("id-ID")}`,
        nextAvailable: nextAvail.toISOString(),
      });
    }

    const mnemonic = await blockchain.storage.getConfig("genesis_mnemonic");
    if (!mnemonic) return res.status(500).json({ error: "Genesis wallet tidak tersedia" });

    const genesisWallet = IXWallet.fromMnemonic(mnemonic);
    const genesisBalance = blockchain.getBalance(genesisWallet.address);
    if (genesisBalance < FAUCET_AMOUNT + 1) {
      return res.status(400).json({ error: "Saldo faucet tidak mencukupi" });
    }

    const gasEstimate = blockchain.gas.estimate("low");
    const hdKey = new HDKey({ privateKey: Buffer.from(genesisWallet.privateKeyHex, "hex") });
    const pubKeyHex = Buffer.from(hdKey.publicKey!).toString("hex");

    const tx = new Transaction({
      from: genesisWallet.address,
      to: address,
      amount: FAUCET_AMOUNT,
      fee: gasEstimate.fee,
      gasPrice: gasEstimate.gasPrice,
      gasUsed: gasEstimate.gasUsed,
      nonce: blockchain.getNonce(genesisWallet.address),
      contract: null,
    });
    tx.sign(genesisWallet.privateKeyHex, pubKeyHex);
    blockchain.addTransaction(tx);

    const block = await blockchain.mine(genesisWallet.address);
    faucetCooldowns.set(address, Date.now());

    res.json({
      success: true,
      amount: FAUCET_AMOUNT,
      txId: tx.id,
      blockHeight: block.height,
      from: genesisWallet.address,
      to: address,
      message: `${FAUCET_AMOUNT} IXC berhasil dikirim ke ${address}`,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Faucet error" });
  }
});

export default router;
