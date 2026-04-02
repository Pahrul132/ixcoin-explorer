import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function InfoRow({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center rounded-lg border border-border bg-card/50 px-4 py-2.5 gap-3">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${mono ? "font-mono" : ""} ${highlight ? "text-orange-400" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

export default function Network() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 15000,
  });

  const apiBase = "/api/ixcoin";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <img src="/ixcoin-logo.jpg" alt="IXCOIN" className="w-10 h-10 rounded-full object-cover shadow" />
        <div>
          <h1 className="text-xl font-bold text-orange-400">Informasi Jaringan</h1>
          <p className="text-sm text-muted-foreground">Spesifikasi teknis IXCOIN untuk exchange, developer & investor</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-emerald-400 font-medium">Mainnet</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Block Height", value: stats ? `#${stats.height.toLocaleString()}` : "...", color: "orange" },
          { label: "Circulating Supply", value: stats ? `${Number(stats.circulating).toLocaleString()} IXC` : "...", color: "green" },
          { label: "Block Reward", value: stats ? `${stats.blockReward.toFixed(2)} IXC` : "...", color: "yellow" },
          { label: "Next Halving", value: stats ? `#${stats.nextHalvingBlock.toLocaleString()}` : "...", color: "blue" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 text-center ${
            s.color === "orange" ? "border-orange-500/30 bg-orange-500/5" :
            s.color === "green" ? "border-emerald-500/30 bg-emerald-500/5" :
            s.color === "yellow" ? "border-yellow-500/30 bg-yellow-500/5" :
            "border-blue-500/30 bg-blue-500/5"
          }`}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`font-mono font-bold text-sm ${
              s.color === "orange" ? "text-orange-400" :
              s.color === "green" ? "text-emerald-400" :
              s.color === "yellow" ? "text-yellow-400" :
              "text-blue-400"
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Identitas Token" icon="🪙">
          <InfoRow label="Nama" value="IXCOIN" highlight />
          <InfoRow label="Ticker / Symbol" value="IXC" highlight mono />
          <InfoRow label="Network Name" value="IXCOIN Network" />
          <InfoRow label="Chain ID" value="7777" mono />
          <InfoRow label="Versi" value="1.0.0" mono />
          <InfoRow label="Address Prefix" value="IX..." mono />
          <InfoRow label="Decimals" value="8" mono />
          <InfoRow label="Tipe" value="Layer 1 Native Coin" />
        </Section>

        <Section title="Tokenomics" icon="📊">
          <InfoRow label="Max Supply" value="21,000,000 IXC" highlight mono />
          <InfoRow label="Biaya Pengembangan" value="13,000,000 IXC (61.9%)" mono />
          <InfoRow label="Mining Supply" value="8,000,000 IXC (38.1%)" mono />
          <InfoRow label="Circulating" value={stats ? `${Number(stats.circulating).toLocaleString()} IXC` : "..."} mono />
          <InfoRow label="Total Burned" value={stats ? `${Number(stats.totalBurned).toFixed(4)} IXC` : "0 IXC"} mono />
          <InfoRow label="Inflasi" value="Deflationary (Halving)" />
          <InfoRow label="Fee Model" value="EIP-1559 (Burning)" />
        </Section>

        <Section title="Spesifikasi Teknis" icon="⚙️">
          <InfoRow label="Consensus" value="Proof of Work (PoW)" />
          <InfoRow label="Hash Algorithm" value="SHA-256" mono />
          <InfoRow label="Target Block Time" value="5 menit (300 detik)" highlight />
          <InfoRow label="Halving Interval" value="400,000 blok (~3.8 tahun)" />
          <InfoRow label="Reward Awal" value="10 IXC per blok" mono />
          <InfoRow label="Min Reward" value="0.00000001 IXC" mono />
          <InfoRow label="Max Tx per Blok" value="2,000 transaksi" />
          <InfoRow label="Block Size" value="1 MB" />
          <InfoRow label="Difficulty Adj." value="Setiap 2,016 blok" />
          <InfoRow label="Mining Selesai" value="~Tahun 2140" highlight />
        </Section>

        <Section title="Info Exchange" icon="🏦">
          <InfoRow label="Confirmations" value="6 blok (~30 menit)" />
          <InfoRow label="Withdrawal Min." value="Disesuaikan exchange" />
          <InfoRow label="Cold Wallet" value="Didukung (BIP39/BIP32)" />
          <InfoRow label="HD Wallet" value="Didukung (BIP44)" />
          <InfoRow label="Multisig" value="Didukung" />
          <InfoRow label="Address Format" value="IX + Base58Check" mono />
          <InfoRow label="Tx Signing" value="secp256k1 ECDSA" mono />
          <InfoRow label="Block Explorer" value="Built-in" />
          <InfoRow label="REST API" value="Tersedia (/api/ixcoin)" mono />
          <InfoRow label="Token Standard" value="Native L1 Coin" />
        </Section>
      </div>

      <Section title="REST API Reference untuk Exchange" icon="🔌">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Base URL: <code className="font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{apiBase}</code>
          </p>

          {[
            {
              method: "GET",
              path: "/info",
              desc: "Informasi dasar jaringan (supply, height, block time, dll)",
            },
            {
              method: "GET",
              path: "/stats",
              desc: "Statistik lengkap: supply, block reward, halving, transaksi terbaru, dll",
            },
            {
              method: "GET",
              path: "/balance/:address",
              desc: "Cek saldo alamat IXC tertentu",
            },
            {
              method: "GET",
              path: "/address/:address",
              desc: "Detail alamat: saldo, nonce, histori transaksi",
            },
            {
              method: "GET",
              path: "/tx/:txId",
              desc: "Detail transaksi berdasarkan Transaction ID",
            },
            {
              method: "GET",
              path: "/block/:height",
              desc: "Detail blok berdasarkan block height",
            },
            {
              method: "GET",
              path: "/chain?limit=20",
              desc: "Daftar blok terbaru (limit 1-100)",
            },
            {
              method: "GET",
              path: "/mempool",
              desc: "Transaksi pending yang belum dikonfirmasi",
            },
            {
              method: "GET",
              path: "/gas/estimate",
              desc: "Estimasi biaya transaksi (gas price & fee)",
            },
            {
              method: "POST",
              path: "/send",
              desc: "Kirim transaksi IXC (from, to, amount, privateKeyHex)",
            },
            {
              method: "POST",
              path: "/wallet/new",
              desc: "Buat dompet baru (keypair + mnemonic BIP39)",
            },
            {
              method: "POST",
              path: "/wallet/restore",
              desc: "Pulihkan dompet dari mnemonic phrase",
            },
          ].map((ep, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <span className={`text-xs font-mono font-bold flex-shrink-0 px-2 py-0.5 rounded ${
                ep.method === "GET"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}>{ep.method}</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-foreground">{apiBase}{ep.path}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Jadwal Halving" icon="📅">
        <div className="space-y-2">
          {[
            { era: 1, blok: "0 – 400.000",           tahun: "2026 – 2030", reward: "10 IXC",    supply: "4,000,000 IXC" },
            { era: 2, blok: "400.001 – 800.000",      tahun: "2030 – 2033", reward: "5 IXC",     supply: "+2,000,000 IXC" },
            { era: 3, blok: "800.001 – 1.200.000",    tahun: "2033 – 2037", reward: "2.5 IXC",   supply: "+1,000,000 IXC" },
            { era: 4, blok: "1.200.001 – 1.600.000",  tahun: "2037 – 2041", reward: "1.25 IXC",  supply: "+500,000 IXC" },
            { era: 5, blok: "1.600.001 – 2.000.000",  tahun: "2041 – 2044", reward: "0.625 IXC", supply: "+250,000 IXC" },
            { era: 6, blok: "2.000.001+",              tahun: "2044 – 2140", reward: "↓ terus",   supply: "+~250,000 IXC" },
          ].map((row) => {
            const h = stats?.height ?? 0;
            const startBlock = (row.era - 1) * 400_000;
            const endBlock = row.era < 6 ? row.era * 400_000 : Infinity;
            const active = h >= startBlock && h < endBlock;
            return (
              <div key={row.era} className={`rounded-lg border px-4 py-2.5 flex items-center gap-3 ${
                active ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card/30"
              }`}>
                <span className={`text-xs font-mono font-bold w-10 flex-shrink-0 ${active ? "text-yellow-400" : "text-muted-foreground"}`}>
                  Era {row.era}
                </span>
                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                  <p className="text-xs font-mono text-muted-foreground truncate">{row.blok}</p>
                  <p className="text-xs text-muted-foreground text-center">{row.tahun}</p>
                  <p className="text-xs text-muted-foreground text-right">{row.supply}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-mono text-sm font-bold ${active ? "text-yellow-300" : "text-foreground"}`}>{row.reward}</span>
                  {active && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-semibold">AKTIF</span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground pt-2">Total mining: 8,000,000 IXC · Selesai ~2140 · Mirip model Bitcoin</p>
      </Section>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="font-semibold text-amber-300 mb-2">📋 Checklist Listing Exchange</p>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            { ok: true, item: "Token/coin dengan ticker unik (IXC)" },
            { ok: true, item: "Max supply terbatas (21 juta IXC)" },
            { ok: true, item: "Blockchain live dengan blok aktif" },
            { ok: true, item: "REST API untuk deposit/withdrawal" },
            { ok: true, item: "Block explorer built-in" },
            { ok: true, item: "Address format standar (IX...)" },
            { ok: true, item: "Tx konfirmasi terukur (6 blok)" },
            { ok: true, item: "Fee model (EIP-1559 burning)" },
            { ok: true, item: "HD Wallet (BIP39/BIP32)" },
            { ok: true, item: "Whitepaper tokenomics (halving)" },
            { ok: false, item: "Website resmi publik" },
            { ok: false, item: "Whitepaper PDF publik" },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={c.ok ? "text-emerald-400" : "text-muted-foreground"}>{c.ok ? "✅" : "⬜"}</span>
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
