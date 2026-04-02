import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";

const KNOWN_LABELS: Record<string, string> = {
  "IX1Dk4g4ZAq1kSC3m72FhKce9oCQxcHTf5AR": "Genesis / Dev Fund",
};

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export default function RichList() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rich-list"],
    queryFn: () => api.getRichList(100),
    refetchInterval: 30000,
  });

  const top1Pct = data?.accounts[0] ? parseFloat(data.accounts[0].percentage) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Top Pemegang IXC</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daftar alamat dengan saldo terbesar di IXCOIN Network
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors px-3 py-1.5 rounded-lg border border-orange-500/30 hover:bg-orange-500/10"
        >
          🔄 Refresh
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Akun Aktif</p>
            <p className="font-mono font-bold text-2xl text-orange-400">{data.total}</p>
            <p className="text-xs text-muted-foreground">Memiliki saldo IXC</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
            <p className="font-mono font-bold text-xl">{data.totalSupply.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">IXC telah dicetak</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Konsentrasi Top 1</p>
            <p className="font-mono font-bold text-xl">{top1Pct.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">dari total supply</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Top 10 Konsentrasi</p>
            <p className="font-mono font-bold text-xl">
              {data.accounts.slice(0, 10).reduce((s, a) => s + parseFloat(a.percentage), 0).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">dari total supply</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Daftar Pemegang ({data?.total ?? "..."})</h2>
          <span className="text-xs text-muted-foreground">Update otomatis setiap 30 detik</span>
        </div>

        <div className="px-5 py-2 bg-muted/20 grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium border-b border-border">
          <span className="col-span-1 text-center">#</span>
          <span className="col-span-5">Alamat</span>
          <span className="col-span-3 text-right">Saldo</span>
          <span className="col-span-3 text-right">Porsi</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-3">
                <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : data?.accounts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada pemegang IXC</p>
            <p className="text-xs text-muted-foreground mt-1">Mine blok pertama untuk melihat data</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {data?.accounts.map((acct) => {
              const label = KNOWN_LABELS[acct.address];
              const pct = parseFloat(acct.percentage);
              return (
                <Link key={acct.address} href={`/address/${acct.address}`}>
                  <div className="px-5 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="col-span-1 text-center">
                      <span className={`font-mono text-xs font-bold ${
                        acct.rank === 1 ? "text-yellow-400" :
                        acct.rank === 2 ? "text-gray-300" :
                        acct.rank === 3 ? "text-amber-600" :
                        "text-muted-foreground"
                      }`}>
                        {acct.rank === 1 ? "🥇" : acct.rank === 2 ? "🥈" : acct.rank === 3 ? "🥉" : `#${acct.rank}`}
                      </span>
                    </div>
                    <div className="col-span-5 min-w-0">
                      <p className="font-mono text-xs text-orange-400 truncate hover:text-orange-300">
                        {acct.address}
                      </p>
                      {label && (
                        <span className="text-xs bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                          {label}
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="font-mono text-sm font-bold text-foreground">
                        {acct.balance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">IXC</p>
                    </div>
                    <div className="col-span-3 flex flex-col items-end gap-1">
                      <span className="font-mono text-xs text-muted-foreground">{acct.percentage}%</span>
                      <MiniBar pct={pct} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-blue-300 text-xs font-semibold mb-1">ℹ️ Tentang Rich List</p>
        <p className="text-blue-400/80 text-xs">
          Data menampilkan semua alamat dengan saldo IXC aktif di blockchain.
          Alamat Genesis/Dev Fund adalah dana biaya pengembangan yang terkunci dalam proyek.
          Klik alamat mana saja untuk melihat histori transaksi lengkap.
        </p>
      </div>
    </div>
  );
}
