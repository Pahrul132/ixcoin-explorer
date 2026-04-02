import { useQuery } from "@tanstack/react-query";
import { api, Stats, BlockRow, TxRow } from "@/lib/api";
import { Link } from "wouter";

function StatCard({ label, value, sub, accent, color }: { label: string; value: string; sub?: string; accent?: boolean; color?: "blue" | "green" | "purple" }) {
  const borderColor = accent
    ? "border-orange-500/40 bg-orange-500/5"
    : color === "blue"
    ? "border-blue-500/30 bg-blue-500/5"
    : color === "green"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : color === "purple"
    ? "border-purple-500/30 bg-purple-500/5"
    : "border-border bg-card";
  const textColor = accent
    ? "text-orange-400"
    : color === "blue"
    ? "text-blue-400"
    : color === "green"
    ? "text-emerald-400"
    : color === "purple"
    ? "text-purple-400"
    : "text-foreground";
  return (
    <div className={`rounded-xl border p-5 ${borderColor}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function BlockItem({ b }: { b: BlockRow }) {
  return (
    <Link href={`/block/${b.height}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
        <div className="w-11 h-11 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-orange-400 font-mono font-bold text-xs">{b.height}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono truncate">{b.hash?.slice(0, 18)}...</p>
          <p className="text-xs text-muted-foreground">{b.tx_count} txs · Diff {b.difficulty}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono text-orange-400 font-semibold">{parseFloat(b.block_reward).toFixed(2)} IXC</p>
          <p className="text-xs text-muted-foreground">{new Date(Number(b.timestamp)).toLocaleTimeString()}</p>
        </div>
      </div>
    </Link>
  );
}

function TxItem({ t }: { t: TxRow }) {
  return (
    <Link href={`/tx/${t.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
        <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono truncate">{t.id?.slice(0, 22)}...</p>
          <p className="text-xs text-muted-foreground truncate">
            {(t.from_addr ?? "")?.slice(0, 10)}... → {(t.to_addr ?? "")?.slice(0, 10)}...
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono text-emerald-400 font-semibold">{parseFloat(String(t.amount)).toFixed(4)} IXC</p>
          <p className={`text-xs ${t.status === "confirmed" ? "text-emerald-500" : "text-yellow-500"}`}>{t.status}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 8000,
  });

  const supplyPct = stats ? Math.min(100, (stats.totalMinted / stats.maxSupply) * 100).toFixed(2) : "0";
  const minedPct = stats ? Math.min(100, ((stats.totalMinted - stats.premineAmount) / stats.miningSupply) * 100).toFixed(4) : "0";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <img src="/ixcoin-logo.jpg" alt="IXCOIN" className="w-12 h-12 rounded-full object-cover shadow-lg" />
        <div>
          <h1 className="text-2xl font-bold text-orange-400">IXCOIN Network</h1>
          <p className="text-sm text-muted-foreground">IXCOIN Network · IXC · Layer 1 Blockchain</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Block Height" value={`#${stats.height.toLocaleString()}`} sub="Block terakhir dikonfirmasi" accent />
            <StatCard label="Block Reward" value={`${stats.blockReward.toFixed(2)} IXC`} sub={`Halving tiap 400k blok (~3.8 thn)`} />
            <StatCard label="Difficulty" value={String(stats.difficulty)} sub="PoW SHA-256 target" />
            <StatCard label="Mempool" value={String(stats.mempoolSize)} sub="Transaksi pending" />
            <StatCard label="Total Minted" value={`${stats.totalMinted.toLocaleString()} IXC`} sub={`${supplyPct}% dari max supply`} accent />
            <StatCard label="Circulating" value={`${Number(stats.circulating).toLocaleString()} IXC`} sub="Total beredar" color="green" />
            <StatCard label="Total Burned" value={`${Number(stats.totalBurned).toFixed(4)} IXC`} sub="Fee burning (EIP-1559)" color="blue" />
            <StatCard label="Max Supply" value={`${stats.maxSupply.toLocaleString()} IXC`} sub={`Mining: ${stats.miningSupply.toLocaleString()} IXC`} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Supply Progress</span>
              <span className="text-xs text-muted-foreground font-mono">
                {stats.totalMinted.toLocaleString()} / {stats.maxSupply.toLocaleString()} IXC
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                style={{ width: `${supplyPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Biaya Pengembangan: {stats.premineAmount.toLocaleString()} IXC</span>
              <span>Next halving: Block #{stats.nextHalvingBlock.toLocaleString()}</span>
            </div>

            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Mining Progress</span>
                <span className="text-xs text-muted-foreground font-mono">{minedPct}% dari 8.000.000 IXC</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                  style={{ width: `${minedPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-sm">Block Terbaru</h2>
                <Link href="/explorer" className="text-xs text-orange-400 hover:text-orange-300">Lihat semua</Link>
              </div>
              <div className="space-y-0.5">
                {stats.recentBlocks?.map((b: BlockRow) => (
                  <BlockItem key={b.height} b={b} />
                ))}
                {(!stats.recentBlocks || stats.recentBlocks.length === 0) && (
                  <p className="text-muted-foreground text-sm text-center py-6">Belum ada block — mulai mining!</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-sm">Transaksi Terbaru</h2>
                <Link href="/explorer" className="text-xs text-orange-400 hover:text-orange-300">Explorer</Link>
              </div>
              <div className="space-y-0.5">
                {stats.recentTransactions?.map((t: TxRow) => (
                  <TxItem key={t.id} t={t} />
                ))}
                {(!stats.recentTransactions || stats.recentTransactions.length === 0) && (
                  <p className="text-muted-foreground text-sm text-center py-6">Belum ada transaksi</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <img src="/ixcoin-logo.jpg" alt="IXC" className="w-9 h-9 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-sm text-orange-300">Tentang IXCOIN (IXC)</p>
                <p className="text-xs text-muted-foreground">Layer 1 Blockchain · Proof of Work · SHA-256</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Max Supply</p>
                <p className="font-mono text-orange-300 font-bold text-base">21,000,000</p>
                <p className="text-muted-foreground/60 text-xs">IXC</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Block Time</p>
                <p className="font-mono text-orange-300 font-bold text-base">~5 menit</p>
                <p className="text-muted-foreground/60 text-xs">300 detik</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Halving</p>
                <p className="font-mono text-orange-300 font-bold text-base">~3.8 Tahun</p>
                <p className="text-muted-foreground/60 text-xs">400.000 blok</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Consensus</p>
                <p className="font-mono text-orange-300 font-bold text-base">PoW</p>
                <p className="text-muted-foreground/60 text-xs">SHA-256</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Chain ID</p>
                <p className="font-mono text-orange-300 font-bold text-base">7777</p>
                <p className="text-muted-foreground/60 text-xs">Network ID</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Mining Supply</p>
                <p className="font-mono text-orange-300 font-bold text-base">8,000,000</p>
                <p className="text-muted-foreground/60 text-xs">IXC via mining</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Premine</p>
                <p className="font-mono text-orange-300 font-bold text-base">13,000,000</p>
                <p className="text-muted-foreground/60 text-xs">IXC biaya dev</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-black/20 border border-orange-500/10">
                <p className="text-muted-foreground mb-0.5">Mining End</p>
                <p className="font-mono text-orange-300 font-bold text-base">~2140</p>
                <p className="text-muted-foreground/60 text-xs">Est. selesai</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-emerald-400 text-lg">🏦</span>
              <div>
                <p className="font-semibold text-sm text-emerald-300">Siap Listing Exchange</p>
                <p className="text-xs text-muted-foreground">Informasi teknis untuk exchange dan investor</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Ticker Symbol</span>
                  <span className="font-mono font-bold text-emerald-300">IXC</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Network Name</span>
                  <span className="font-mono font-bold text-emerald-300">IXCOIN Network</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Blockchain Type</span>
                  <span className="font-mono font-bold text-emerald-300">Layer 1 PoW</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Block Confirmation</span>
                  <span className="font-mono font-bold text-emerald-300">6 blok (~30 menit)</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-mono font-bold text-emerald-300">21,000,000 IXC</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Circulating Supply</span>
                  <span className="font-mono font-bold text-emerald-300">{Number(stats.circulating).toLocaleString()} IXC</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Decimals</span>
                  <span className="font-mono font-bold text-emerald-300">8</span>
                </div>
                <div className="flex justify-between rounded bg-black/20 border border-emerald-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Address Prefix</span>
                  <span className="font-mono font-bold text-emerald-300">IX...</span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Link href="/network">
                <span className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
                  Lihat info lengkap untuk exchange & developer →
                </span>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
