const BASE = "/api/ixcoin";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface ChainInfo {
  chainName: string;
  ticker: string;
  network: string;
  height: number;
  difficulty: number;
  totalMinted: number;
  totalBurned: number;
  circulating: number;
  maxSupply: number;
  premineAmount: number;
  miningSupply: number;
  mempoolSize: number;
  blockReward: number;
  baseFee: number;
  halvingProgress: string;
  nextHalvingBlock: number;
}

export interface BlockRow {
  height: number;
  hash: string;
  previous_hash: string;
  timestamp: number;
  miner: string;
  block_reward: string;
  total_fees: string;
  tx_count: number;
  difficulty: number;
}

export interface TxRow {
  id: string;
  block_height: number;
  from_addr: string;
  to_addr: string;
  amount: string;
  fee: string;
  status: string;
  timestamp: number;
}

export interface GenesisWallet {
  address: string;
  balance: number;
  publicKey: string;
  network: string;
  ticker: string;
}

export interface Stats extends ChainInfo {
  totalTransactions: number;
  recentBlocks: BlockRow[];
  recentTransactions: TxRow[];
}

export interface MineResult {
  success: boolean;
  block: {
    height: number;
    hash: string;
    nonce: number;
    difficulty: number;
    txCount: number;
    reward: number;
    fees: number;
    timestamp: number;
  };
  newBalance: number;
}

export interface WalletResult {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  network: string;
  warning: string;
}

export interface AddressInfo {
  address: string;
  balance: number;
  pendingOutflow: number;
  available: number;
  nonce: number;
  txCount: number;
  transactions: TxRow[];
}

export const api = {
  getInfo: () => apiFetch<ChainInfo>("/info"),
  getStats: () => apiFetch<Stats>("/stats"),
  getGenesisWallet: () => apiFetch<GenesisWallet>("/genesis-wallet"),
  getChain: (limit = 20) => apiFetch<{ blocks: BlockRow[]; total: number }>(`/chain?limit=${limit}`),
  getBlock: (id: string | number) => apiFetch<object>(`/block/${id}`),
  getTx: (id: string) => apiFetch<object>(`/tx/${id}`),
  getAddress: (addr: string) => apiFetch<AddressInfo>(`/address/${addr}`),
  getBalance: (addr: string) => apiFetch<{ address: string; balance: number; ticker: string }>(`/balance/${addr}`),
  getMempool: () => apiFetch<{ count: number; transactions: TxRow[]; totalFees: number }>(`/mempool`),
  getGasEstimate: () => apiFetch<{ gasPrice: number; gasUsed: number; fee: number; baseFee: number }>(`/gas/estimate`),
  search: (q: string) => apiFetch<{ type: string; data: object }>(`/search/${q}`),
  mine: (address: string) => apiFetch<MineResult>("/mine", {
    method: "POST",
    body: JSON.stringify({ address }),
  }),
  newWallet: () => apiFetch<WalletResult>("/wallet/new", { method: "POST" }),
  restoreWallet: (mnemonic: string) => apiFetch<{ address: string; publicKey: string; privateKey: string; mnemonic: string; balance: number; nonce: number; warning: string }>("/wallet/restore", {
    method: "POST",
    body: JSON.stringify({ mnemonic }),
  }),
  send: (params: {
    from: string;
    to: string;
    amount: number;
    privateKeyHex: string;
    nonce?: number;
  }) => apiFetch<{ success: boolean; txId: string; fee: number }>("/send", {
    method: "POST",
    body: JSON.stringify(params),
  }),
  getRichList: (limit = 50) => apiFetch<{
    total: number;
    totalSupply: number;
    accounts: { rank: number; address: string; balance: number; percentage: string }[];
  }>(`/rich-list?limit=${limit}`),
  getMetrics: () => apiFetch<{
    name: string; symbol: string; max_supply: number; total_supply: number;
    circulating_supply: number; total_burned: number; block_height: number;
    block_reward: number; last_block_time: string | null; halving_progress: string;
    next_halving_block: number; difficulty: number; mempool_size: number;
    consensus: string; decimals: number; chain_id: number; version: string;
    block_time_target_seconds: number;
  }>("/metrics"),
  getBlockStats: (limit = 100) => apiFetch<{
    blocks: {
      height: number; timestamp: number; difficulty: number;
      txCount: number; reward: number; fees: number; blockTimeSec: number | null;
    }[];
  }>(`/stats/blocks?limit=${limit}`),
  faucet: (address: string) => apiFetch<{
    success: boolean; amount: number; txId: string; blockHeight: number;
    from: string; to: string; message: string;
  }>("/faucet", { method: "POST", body: JSON.stringify({ address }) }),
  airdrop: (params: {
    from: string;
    privateKeyHex: string;
    recipients: { address: string; amount: number }[];
    mineAfter?: boolean;
  }) => apiFetch<{
    success: boolean;
    sent: number;
    failed: number;
    totalAmount: number;
    results: { address: string; amount: number; txId: string; status: string }[];
    errors: { address: string; error: string }[];
    minedBlock: { height: number; hash: string; txCount: number } | null;
  }>("/airdrop", {
    method: "POST",
    body: JSON.stringify(params),
  }),
};
