import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BlockStat {
  height: number;
  timestamp: number;
  difficulty: number;
  txCount: number;
  reward: number;
  fees: number;
  blockTimeSec: number | null;
}

function MiniChart({
  data,
  getValue,
  color,
  label,
  format,
}: {
  data: BlockStat[];
  getValue: (b: BlockStat) => number | null;
  color: string;
  label: string;
  format: (v: number) => string;
}) {
  const values = data.map(getValue).filter((v): v is number => v !== null);
  if (values.length === 0) return (
    <div className="h-20 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">Tidak cukup data</p>
    </div>
  );
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-muted-foreground">avg: {format(avg)}</span>
      </div>
      <div className="h-20 flex items-end gap-0.5">
        {data.map((b, i) => {
          const val = getValue(b);
          if (val === null) return <div key={i} className="flex-1 bg-muted/20 rounded-t" style={{ height: "10%" }} />;
          const pct = ((val - min) / range) * 80 + 20;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${color}`}
              style={{ height: `${pct}%` }}
              title={`Block #${b.height}: ${format(val)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground/60">
        <span>Min: {format(min)}</span>
        <span>Max: {format(max)}</span>
      </div>
    </div>
  );
}

export default function Statistics() {
  const { data: blockStats, isLoading } = useQuery({
    queryKey: ["block-stats"],
    queryFn: () => api.getBlockStats(100),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 15000,
  });

  const blocks = blockStats?.blocks ?? [];
  const recentBlocks = blocks.slice(-50);

  const validBlockTimes = blocks.map(b => b.blockTimeSec).filter((v): v is number => v !== null && v > 0);
  const avgBlockTime = validBlockTimes.length > 0
    ? validBlockTimes.reduce((a, b) => a + b, 0) / validBlockTimes.length
    : null;

  const totalTxs = blocks.reduce((s, b) => s + b.txCount, 0);
  const totalFees = blocks.reduce((s, b) => s + b.fees, 0);
  const avgTxPerBlock = blocks.length > 0 ? totalTxs / blocks.length : 0;

  function formatTime(sec: number) {
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${Math.round(sec / 60)}m ${Math.round(sec % 60)}s`;
    return `${Math.round(sec / 3600)}j`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Statistik Jaringan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analisis performa blockchain IXCOIN secara real-time
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Blok</p>
          <p className="font-mono font-bold text-2xl text-orange-400">
            {stats?.height !== undefined ? `#${stats.height}` : "..."}
          </p>
          <p className="text-xs text-muted-foreground">Dikonfirmasi</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rata-rata Block Time</p>
          <p className="font-mono font-bold text-2xl text-emerald-400">
            {avgBlockTime !== null ? formatTime(avgBlockTime) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Target: 5 menit</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Transaksi</p>
          <p className="font-mono font-bold text-2xl text-blue-400">
            {stats?.totalTransactions?.toLocaleString() ?? totalTxs.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Semua waktu</p>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Fee Terkumpul</p>
          <p className="font-mono font-bold text-2xl text-purple-400">
            {totalFees.toFixed(4)}
          </p>
          <p className="text-xs text-muted-foreground">IXC dibakar</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : blocks.length < 2 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-2xl mb-3">📊</p>
          <p className="text-muted-foreground font-medium">Belum cukup data untuk chart</p>
          <p className="text-xs text-muted-foreground mt-1">
            Mine beberapa blok terlebih dahulu untuk melihat statistik
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Waktu Antar Blok (detik)</h2>
            <MiniChart
              data={recentBlocks}
              getValue={b => b.blockTimeSec}
              color="bg-emerald-500/60"
              label="Detik per blok (50 terakhir)"
              format={v => formatTime(v)}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Difficulty</h2>
            <MiniChart
              data={recentBlocks}
              getValue={b => b.difficulty}
              color="bg-orange-500/60"
              label="Target difficulty (50 terakhir)"
              format={v => v.toString()}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Transaksi per Blok</h2>
            <MiniChart
              data={recentBlocks}
              getValue={b => b.txCount}
              color="bg-blue-500/60"
              label="Jumlah transaksi (50 terakhir)"
              format={v => `${v} tx`}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Fee yang Dikumpulkan (IXC)</h2>
            <MiniChart
              data={recentBlocks}
              getValue={b => b.fees}
              color="bg-purple-500/60"
              label="Fee per blok (50 terakhir)"
              format={v => `${v.toFixed(4)} IXC`}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Detail Blok Terbaru</h2>
          <span className="text-xs text-muted-foreground">{blocks.length} blok dimuat</span>
        </div>

        {blocks.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Belum ada data blok
          </div>
        ) : (
          <>
            <div className="px-5 py-2 bg-muted/20 grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium border-b border-border">
              <span className="col-span-2">Blok</span>
              <span className="col-span-2 text-center">Block Time</span>
              <span className="col-span-2 text-center">Difficulty</span>
              <span className="col-span-2 text-center">Txs</span>
              <span className="col-span-2 text-right">Reward</span>
              <span className="col-span-2 text-right">Fee</span>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {[...blocks].reverse().slice(0, 50).map((b) => (
                <div key={b.height} className="px-5 py-2.5 grid grid-cols-12 gap-2 items-center text-xs hover:bg-muted/20">
                  <span className="col-span-2 font-mono text-orange-400 font-bold">#{b.height}</span>
                  <span className={`col-span-2 text-center font-mono ${
                    b.blockTimeSec !== null && b.blockTimeSec < 600
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                  }`}>
                    {b.blockTimeSec !== null ? formatTime(b.blockTimeSec) : "—"}
                  </span>
                  <span className="col-span-2 text-center font-mono">{b.difficulty}</span>
                  <span className="col-span-2 text-center font-mono">{b.txCount}</span>
                  <span className="col-span-2 text-right font-mono text-yellow-400">{b.reward.toFixed(2)}</span>
                  <span className="col-span-2 text-right font-mono text-purple-400">{b.fees.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-xs">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider">Ringkasan Mining</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Blok</span>
              <span className="font-mono">{blocks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Tx/Blok</span>
              <span className="font-mono">{avgTxPerBlock.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Block Time</span>
              <span className="font-mono">{avgBlockTime !== null ? formatTime(avgBlockTime) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Block Time</span>
              <span className="font-mono">5 menit</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider">Supply Stats</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Minted</span>
              <span className="font-mono">{stats?.totalMinted.toLocaleString() ?? "..."}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Circulating</span>
              <span className="font-mono">{stats ? Number(stats.circulating).toLocaleString() : "..."}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Burned</span>
              <span className="font-mono">{stats ? Number(stats.totalBurned).toFixed(4) : "0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Block Reward</span>
              <span className="font-mono text-yellow-400">{stats?.blockReward.toFixed(2) ?? "10"} IXC</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider">Halving Progress</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blok Saat Ini</span>
              <span className="font-mono">#{stats?.height.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Halving</span>
              <span className="font-mono text-orange-400">#{stats?.nextHalvingBlock.toLocaleString() ?? "400,000"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{stats?.halvingProgress ?? "0%"}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                style={{
                  width: stats
                    ? `${Math.min(100, (stats.height / stats.nextHalvingBlock) * 100)}%`
                    : "0%"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
