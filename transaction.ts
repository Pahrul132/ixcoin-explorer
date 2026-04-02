import { v4 as uuidv4 } from "uuid";
import { sha256, sha256bytes } from "./crypto.js";
import { CHAIN_CONFIG } from "./config.js";
import { IXWallet, validateAddress } from "./wallet.js";
import { HDKey } from "@scure/bip32";

export interface TransactionData {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  gasPrice: number;
  gasUsed: number;
  nonce: number;
  timestamp: number;
  signature?: string;
  publicKey?: string;
  contract?: string | null;
  status: "pending" | "confirmed" | "failed";
}

export class Transaction implements TransactionData {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  gasPrice: number;
  gasUsed: number;
  nonce: number;
  timestamp: number;
  signature?: string;
  publicKey?: string;
  contract?: string | null;
  status: "pending" | "confirmed" | "failed";

  constructor(params: {
    from: string;
    to: string;
    amount: number;
    fee?: number;
    gasPrice?: number;
    gasUsed?: number;
    nonce?: number;
    contract?: string | null;
  }) {
    this.id = uuidv4();
    this.from = params.from;
    this.to = params.to;
    this.amount = params.amount;
    this.gasPrice = params.gasPrice ?? CHAIN_CONFIG.BASE_GAS_PRICE;
    this.gasUsed = params.gasUsed ?? CHAIN_CONFIG.TX_GAS_LIMIT;
    this.fee = params.fee ?? (this.gasPrice * this.gasUsed) / 1_000_000;
    this.nonce = params.nonce ?? 0;
    this.contract = params.contract ?? null;
    this.timestamp = Date.now();
    this.status = "pending";
  }

  static fromSystem(to: string, amount: number): Transaction {
    return new Transaction({ from: "SYSTEM", to, amount, fee: 0, gasUsed: 0 });
  }

  hash(): string {
    return sha256(
      this.from +
        this.to +
        this.amount.toString() +
        this.fee.toString() +
        this.nonce.toString() +
        JSON.stringify(this.contract)
    );
  }

  sign(privateKeyHex: string, publicKeyHex: string): void {
    try {
      const hdKey = new HDKey({ privateKey: Buffer.from(privateKeyHex, "hex") });
      const hash = sha256bytes(this.hash());
      const sig = hdKey.sign(hash);
      this.signature = Buffer.from(sig).toString("hex");
      this.publicKey = publicKeyHex;
    } catch (err) {
      throw new Error("Gagal menandatangani transaksi: " + String(err));
    }
  }

  isValid(): boolean {
    if (this.from === "SYSTEM") return true;
    if (!this.signature || !this.publicKey) return false;
    if (this.amount <= 0) return false;
    if (this.fee < 0) return false;

    try {
      const pubBytes = Buffer.from(this.publicKey, "hex");
      if (pubBytes.length !== 33) return false;
      const hdKey = new HDKey({ publicKey: pubBytes });
      const hash = sha256bytes(this.hash());
      const sig = Buffer.from(this.signature, "hex");
      return hdKey.verify(hash, sig);
    } catch {
      return false;
    }
  }

  toJSON(): TransactionData {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      fee: this.fee,
      gasPrice: this.gasPrice,
      gasUsed: this.gasUsed,
      nonce: this.nonce,
      timestamp: this.timestamp,
      signature: this.signature,
      publicKey: this.publicKey,
      contract: this.contract,
      status: this.status,
    };
  }
}
