import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0"
    >
      {copied ? "✓ Tersalin!" : "Salin"}
    </button>
  );
}

export default function Faucet() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<{
    success: boolean; amount: number; txId: string; blockHeight: number; to: string;
  } | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 15000,
  });

  const mut = useMutation({
    mutationFn: () => api.faucet(address.trim()),
    onSuccess: (d) => {
      setResult(d);
    },
  });

  const isValidAddr = address.trim().startsWith("IX") && address.trim().length > 20;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-2xl flex-shrink-0">
          🚰
        </div>
        <div>
          <h1 className="text-xl font-bold">Faucet IXCOIN</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dapatkan IXC gratis untuk mencoba jaringan</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-black/20 p-3">
            <p className="text-xs text-muted-foreground mb-1">Jumlah Faucet</p>
            <p className="font-mono font-bold text-xl text-blue-400">10 IXC</p>
            <p className="text-xs text-muted-foreground">per permintaan</p>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <p className="text-xs text-muted-foreground mb-1">Cooldown</p>
            <p className="font-mono font-bold text-xl text-blue-400">24 Jam</p>
            <p className="text-xs text-muted-foreground">per alamat</p>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <p className="text-xs text-muted-foreground mb-1">Konfirmasi</p>
            <p className="font-mono font-bold text-xl text-blue-400">Instan</p>
            <p className="text-xs text-muted-foreground">1 blok</p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Saldo Faucet (Genesis)</p>
            <p className="font-mono text-emerald-400 font-bold">
              {Number(stats.circulating).toLocaleString()} IXC tersedia
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Alamat Dompet IXCOIN Anda</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="IXxxxxxxxxxxxxxxxxxx... (buat dompet di menu Wallet)"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {address && !isValidAddr && (
            <p className="text-xs text-red-400 mt-1">Alamat tidak valid — harus dimulai dengan "IX"</p>
          )}
          {isValidAddr && (
            <p className="text-xs text-emerald-400 mt-1">✓ Alamat valid</p>
          )}
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-amber-300 text-xs font-semibold mb-1">⚠️ Catatan</p>
          <ul className="text-amber-400/80 text-xs space-y-1">
            <li>• Faucet hanya bisa digunakan 1 kali per 24 jam per alamat</li>
            <li>• Setiap permintaan langsung dikonfirmasi dalam 1 blok</li>
            <li>• Faucet disediakan dari dana pengembangan genesis</li>
            <li>• Belum punya dompet? <Link href="/wallet" className="text-orange-400 hover:text-orange-300">Buat dompet baru →</Link></li>
          </ul>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !isValidAddr}
          className="w-full rounded-xl bg-blue-500 text-white font-bold py-3.5 text-base hover:bg-blue-400 transition-colors disabled:opacity-50"
        >
          {mut.isPending ? "⏳ Mengirim IXC..." : "🚰 Minta 10 IXC dari Faucet"}
        </button>

        {mut.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-red-400 text-sm">{(mut.error as Error).message}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">✅</span>
            <div>
              <p className="font-bold text-emerald-400 text-lg">{result.amount} IXC Terkirim!</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dikonfirmasi di Block #{result.blockHeight}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">Penerima</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs break-all flex-1 text-orange-400">{result.to}</p>
                <CopyButton text={result.to} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">ID Transaksi</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs break-all flex-1">{result.txId}</p>
                <CopyButton text={result.txId} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`/tx/${result.txId}`}>
              <span className="flex-1 text-center text-xs text-orange-400 hover:text-orange-300 cursor-pointer border border-orange-500/30 rounded-lg px-4 py-2 block">
                Lihat Transaksi →
              </span>
            </Link>
            <Link href={`/address/${result.to}`}>
              <span className="flex-1 text-center text-xs text-orange-400 hover:text-orange-300 cursor-pointer border border-orange-500/30 rounded-lg px-4 py-2 block">
                Lihat Saldo →
              </span>
            </Link>
          </div>

          <button
            onClick={() => { setResult(null); setAddress(""); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            Minta untuk alamat lain
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-sm">Cara Menggunakan IXC Anda</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: "⛏️", title: "Mining", desc: "Gunakan alamat Anda sebagai miner reward", href: "/mining" },
            { icon: "📤", title: "Kirim IXC", desc: "Transfer IXC ke alamat lain di jaringan", href: "/wallet" },
            { icon: "🪂", title: "Airdrop", desc: "Bagikan IXC ke banyak alamat sekaligus", href: "/airdrop" },
            { icon: "🔍", title: "Explorer", desc: "Pantau transaksi di block explorer", href: "/explorer" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <span className="ml-auto text-orange-400 text-xs">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
