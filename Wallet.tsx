import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, WalletResult, TxRow } from "@/lib/api";
import { Link } from "wouter";

type Tab = "new" | "restore" | "send";

interface ActiveWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic?: string;
  balance: number;
  nonce: number;
}

function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0 font-medium"
    >
      {copied ? "✓ Tersalin!" : label}
    </button>
  );
}

function AddressQR({ address }: { address: string }) {
  const chars = address.split("");
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-orange-500/30 bg-black/40 p-4 flex flex-col items-center gap-3">
        <div className="grid grid-cols-8 gap-0.5">
          {Array.from({ length: 64 }).map((_, i) => {
            const code = address.charCodeAt(i % address.length) + i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm ${code % 3 === 0 ? "bg-orange-400" : code % 5 === 0 ? "bg-orange-600" : "bg-transparent border border-orange-500/10"}`}
              />
            );
          })}
        </div>
        <p className="font-mono text-orange-300 text-xs break-all text-center">{address}</p>
        <CopyButton text={address} label="📋 Salin Alamat" />
      </div>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-300 font-semibold mb-1">ℹ️ Cara Menerima IXC</p>
        <p className="text-xs text-amber-400/80">
          Bagikan alamat di atas kepada pengirim. Pengirim perlu memasukkan alamat ini di tab "Kirim IXC". 
          Saldo akan masuk setelah transaksi dikonfirmasi dalam blok berikutnya.
        </p>
      </div>
    </div>
  );
}

function WalletCard({
  wallet,
  onSend,
  onReceive,
  onRefresh,
  showReceive,
}: {
  wallet: ActiveWallet;
  onSend: () => void;
  onReceive: () => void;
  onRefresh: () => void;
  showReceive: boolean;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");

  const { data: addrData } = useQuery({
    queryKey: ["address", wallet.address],
    queryFn: () => api.getAddress(wallet.address),
    refetchInterval: 15000,
    enabled: !!wallet.address,
  });

  const displayBalance = addrData?.balance ?? wallet.balance;
  const transactions: TxRow[] = addrData?.transactions ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/ixcoin-logo.jpg" alt="IXC" className="w-8 h-8 rounded-full object-cover" />
            <div>
              <p className="text-xs text-muted-foreground">IXCOIN Network</p>
              <p className="text-xs font-mono text-orange-400/70">{wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-emerald-400">Terhubung</span>
            </div>
            <button onClick={onRefresh} className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1 ml-1">
              🔄
            </button>
          </div>
        </div>

        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground mb-1">Total Aset</p>
          <p className="text-4xl font-bold font-mono text-orange-400">
            {displayBalance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
          </p>
          <p className="text-lg text-orange-400/70 font-semibold mt-0.5">IXC</p>
          {addrData && (
            <p className="text-xs text-muted-foreground mt-1">
              Tersedia: {addrData.available.toFixed(8)} IXC
              {addrData.pendingOutflow > 0 && <span className="text-yellow-500"> · Pending: -{addrData.pendingOutflow.toFixed(4)} IXC</span>}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onSend}
            className="flex-1 rounded-xl bg-orange-500 text-black font-bold py-2.5 text-sm hover:bg-orange-400 transition-colors"
          >
            📤 Kirim
          </button>
          <button
            onClick={onReceive}
            className={`flex-1 rounded-xl border font-bold py-2.5 text-sm transition-colors ${
              showReceive
                ? "bg-orange-500/20 border-orange-500/60 text-orange-300"
                : "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
            }`}
          >
            📥 Terima
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(wallet.address); }}
            className="px-3 rounded-xl border border-border text-muted-foreground hover:text-foreground py-2.5 text-sm hover:bg-muted/50 transition-colors"
            title="Salin Alamat"
          >
            📋
          </button>
        </div>
      </div>

      {showReceive && (
        <div className="rounded-xl border border-orange-500/20 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Terima IXC</p>
          <AddressQR address={wallet.address} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border">
          {(["info", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === t
                  ? "text-orange-400 border-b-2 border-orange-500 bg-orange-500/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "info" ? "🔐 Info Dompet" : `📋 Histori (${transactions.length})`}
            </button>
          ))}
        </div>

        {activeTab === "info" ? (
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">Alamat Publik</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs break-all flex-1 text-foreground">{wallet.address}</p>
                <CopyButton text={wallet.address} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">Public Key</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs break-all flex-1 text-muted-foreground">{wallet.publicKey.slice(0, 40)}...</p>
                <CopyButton text={wallet.publicKey} />
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-red-300 font-semibold">🔐 Private Key</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowKey(!showKey)} className="text-xs text-muted-foreground hover:text-foreground">
                    {showKey ? "Sembunyikan" : "Tampilkan"}
                  </button>
                  <CopyButton text={wallet.privateKey} />
                </div>
              </div>
              {showKey ? (
                <p className="font-mono text-red-200 text-xs break-all">{wallet.privateKey}</p>
              ) : (
                <p className="font-mono text-red-400/50 text-xs tracking-widest">••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</p>
              )}
              <p className="text-xs text-red-400/60 mt-2">⚠️ Jangan pernah bagikan private key kepada siapapun</p>
            </div>

            {wallet.mnemonic && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-amber-300 font-semibold">📝 Frase 12 Kata Pemulihan</p>
                  <button onClick={() => setShowMnemonic(!showMnemonic)} className="text-xs text-muted-foreground hover:text-foreground">
                    {showMnemonic ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                {showMnemonic ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {wallet.mnemonic.split(" ").map((word, i) => (
                        <div key={i} className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                          <span className="text-amber-600 text-xs w-4">{i + 1}.</span>
                          <span className="text-amber-200 font-mono text-xs font-semibold">{word}</span>
                        </div>
                      ))}
                    </div>
                    <CopyButton text={wallet.mnemonic} label="Salin semua kata" />
                  </>
                ) : (
                  <p className="font-mono text-amber-400/40 text-xs tracking-widest">•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••</p>
                )}
                <p className="text-xs text-amber-400/60 mt-2">Simpan di tempat offline yang aman — satu-satunya cara memulihkan dompet</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
                <p className="text-muted-foreground">Nonce / Transaksi</p>
                <p className="font-mono font-bold">{addrData?.nonce ?? wallet.nonce}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
                <p className="text-muted-foreground">Jaringan</p>
                <p className="font-mono font-bold text-orange-400">IXC Mainnet</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground mt-1">Transaksi akan muncul setelah dikonfirmasi</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <Link key={tx.id} href={`/tx/${tx.id}`}>
                  <div className="px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground truncate">{tx.id.slice(0, 24)}...</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.from_addr === wallet.address
                            ? `→ ${tx.to_addr?.slice(0, 14)}...`
                            : `← ${tx.from_addr?.slice(0, 14)}...`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`font-mono text-sm font-bold ${
                          tx.to_addr === wallet.address ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {tx.to_addr === wallet.address ? "+" : "-"}{parseFloat(String(tx.amount)).toFixed(4)} IXC
                        </p>
                        <p className={`text-xs ${tx.status === "confirmed" ? "text-emerald-500" : "text-yellow-500"}`}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewWalletTab({ onWalletCreated }: { onWalletCreated: (w: ActiveWallet) => void }) {
  const mut = useMutation({
    mutationFn: api.newWallet,
    onSuccess: async (d: WalletResult) => {
      const info = await api.getAddress(d.address).catch(() => ({ balance: 0, nonce: 0 }));
      onWalletCreated({
        address: d.address,
        publicKey: d.publicKey,
        privateKey: d.privateKey,
        mnemonic: d.mnemonic,
        balance: (info as { balance: number; nonce: number }).balance ?? 0,
        nonce: (info as { balance: number; nonce: number }).nonce ?? 0,
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl mx-auto mb-3">
          ✨
        </div>
        <h2 className="font-bold text-lg">Buat Dompet Baru</h2>
        <p className="text-sm text-muted-foreground mt-1">Dompet baru dibuat langsung terhubung ke IXCOIN Network</p>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p className="text-emerald-300 text-xs font-semibold mb-2">✅ Keamanan & Koneksi Blockchain</p>
        <ul className="text-emerald-400/80 text-xs space-y-1">
          <li>• Keypair dibuat secara kriptografis (secp256k1)</li>
          <li>• Mnemonic BIP39 standar industri (12 kata)</li>
          <li>• Alamat langsung terdaftar di IXCOIN Network</li>
          <li>• Saldo real-time dari blockchain node</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-amber-300 text-xs font-semibold mb-1">⚠️ Penting — Simpan Sebelum Menutup</p>
        <p className="text-amber-400/80 text-xs">
          Setelah dompet dibuat, simpan 12 kata frase dan private key di tempat offline yang aman.
          Tidak ada cara memulihkannya jika hilang.
        </p>
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="w-full rounded-xl bg-orange-500 text-black font-bold py-3.5 text-base hover:bg-orange-400 transition-colors disabled:opacity-50"
      >
        {mut.isPending ? "Membuat Dompet..." : "✨ Buat Dompet Baru"}
      </button>

      {mut.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-red-400 text-sm">{(mut.error as Error).message}</p>
        </div>
      )}
    </div>
  );
}

function RestoreWalletTab({ onWalletRestored }: { onWalletRestored: (w: ActiveWallet) => void }) {
  const [mnemonic, setMnemonic] = useState("");
  const wordCount = mnemonic.trim() === "" ? 0 : mnemonic.trim().split(/\s+/).length;

  const mut = useMutation({
    mutationFn: () => api.restoreWallet(mnemonic),
    onSuccess: (d) => {
      onWalletRestored({
        address: d.address,
        publicKey: d.publicKey,
        privateKey: d.privateKey,
        balance: d.balance ?? 0,
        nonce: d.nonce ?? 0,
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-3xl mx-auto mb-3">
          🔓
        </div>
        <h2 className="font-bold text-lg">Pulihkan Dompet</h2>
        <p className="text-sm text-muted-foreground mt-1">Masukkan 12 kata frase untuk memulihkan akses dompet Anda</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Frase 12 Kata</label>
          <span className={`text-xs font-mono ${wordCount === 12 ? "text-emerald-400" : "text-muted-foreground"}`}>
            {wordCount}/12 kata {wordCount === 12 && "✓"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Array.from({ length: 12 }, (_, i) => {
            const words = mnemonic.trim().split(/\s+/);
            return (
              <div key={i} className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5">
                <span className="text-muted-foreground text-xs w-4 flex-shrink-0">{i + 1}.</span>
                <span className={`font-mono text-xs font-semibold ${words[i] ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {words[i] || "---"}
                </span>
              </div>
            );
          })}
        </div>
        <textarea
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="Ketik atau tempel 12 kata frase di sini, pisahkan dengan spasi..."
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || wordCount < 12}
        className="w-full rounded-xl bg-orange-500 text-black font-bold py-3.5 text-base hover:bg-orange-400 transition-colors disabled:opacity-50"
      >
        {mut.isPending ? "Memulihkan..." : "🔓 Buka Dompet"}
      </button>

      {mut.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-red-400 text-sm">{(mut.error as Error).message}</p>
        </div>
      )}
    </div>
  );
}

function SendTab({ fromAddress, privateKey, nonce }: { fromAddress?: string; privateKey?: string; nonce?: number }) {
  const [form, setForm] = useState({
    from: fromAddress ?? "",
    to: "",
    amount: "",
    privateKeyHex: privateKey ?? "",
    nonce: nonce ? String(nonce) : "",
  });
  const [result, setResult] = useState<{ txId: string; fee: number } | null>(null);
  const qc = useQueryClient();

  const { data: gasData } = useQuery({
    queryKey: ["gas"],
    queryFn: api.getGasEstimate,
    refetchInterval: 15000,
  });

  const { data: fromBalance } = useQuery({
    queryKey: ["address", form.from],
    queryFn: () => api.getAddress(form.from),
    enabled: form.from.startsWith("IX") && form.from.length > 20,
    refetchInterval: 10000,
  });

  const mut = useMutation({
    mutationFn: () => api.send({
      from: form.from,
      to: form.to,
      amount: parseFloat(form.amount),
      privateKeyHex: form.privateKeyHex.replace("0x", ""),
      nonce: form.nonce ? parseInt(form.nonce) : undefined,
    }),
    onSuccess: (d) => {
      setResult(d);
      setForm(f => ({ ...f, amount: "", to: "" }));
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["mempool"] });
      qc.invalidateQueries({ queryKey: ["address", form.from] });
    },
  });

  const canSend = form.from.startsWith("IX") && form.to.startsWith("IX") &&
    parseFloat(form.amount) > 0 && form.privateKeyHex.replace("0x", "").length === 64;

  const maxAmount = fromBalance ? Math.max(0, fromBalance.available - (gasData?.fee ?? 0)) : 0;

  return (
    <div className="space-y-4">
      {fromBalance && (
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-orange-300 text-xs font-semibold">Saldo Tersedia</p>
            <p className="font-mono text-orange-400 text-base font-bold">{fromBalance.available.toFixed(8)} IXC</p>
          </div>
          {gasData && (
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Est. biaya jaringan</p>
              <p className="font-mono text-blue-300 text-xs font-bold">{gasData.fee.toFixed(6)} IXC</p>
            </div>
          )}
        </div>
      )}

      {!fromBalance && gasData && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-center justify-between">
          <p className="text-blue-300 text-xs">Estimasi biaya jaringan</p>
          <p className="font-mono text-blue-300 text-xs font-bold">{gasData.fee.toFixed(6)} IXC</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Dari (Alamat Anda)</label>
          <input
            value={form.from}
            onChange={(e) => setForm(f => ({ ...f, from: e.target.value }))}
            placeholder="IXxxxxxxxxxxxxxxxxxx..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Ke (Alamat Tujuan)</label>
          <input
            value={form.to}
            onChange={(e) => setForm(f => ({ ...f, to: e.target.value }))}
            placeholder="IXxxxxxxxxxxxxxxxxxx..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-medium">Jumlah IXC</label>
            {maxAmount > 0 && (
              <button
                onClick={() => setForm(f => ({ ...f, amount: maxAmount.toFixed(8) }))}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Maks: {maxAmount.toFixed(4)} IXC
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              step="0.00000001"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">IXC</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-medium">Private Key</label>
            <span className={`text-xs font-mono ${form.privateKeyHex.replace("0x", "").length === 64 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {form.privateKeyHex.replace("0x", "").length}/64 {form.privateKeyHex.replace("0x", "").length === 64 && "✓"}
            </span>
          </div>
          <textarea
            value={form.privateKeyHex}
            onChange={(e) => setForm(f => ({ ...f, privateKeyHex: e.target.value.replace("0x", "") }))}
            placeholder="Private key 64 karakter hex..."
            rows={2}
            className="w-full rounded-lg border border-red-500/30 bg-background px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || !canSend}
        className="w-full rounded-xl bg-orange-500 text-black font-bold py-3.5 text-base hover:bg-orange-400 transition-colors disabled:opacity-50"
      >
        {mut.isPending ? "Mengirim..." : "📤 Kirim IXC"}
      </button>

      {mut.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-red-400 text-sm">{(mut.error as Error).message}</p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-emerald-400 font-semibold">Transaksi Terkirim!</p>
              <p className="text-xs text-muted-foreground">Menunggu konfirmasi — mine blok untuk konfirmasi lebih cepat</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground mb-1">ID Transaksi</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-xs break-all flex-1">{result.txId}</p>
              <CopyButton text={result.txId} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Fee: {result.fee?.toFixed(8) ?? "0"} IXC · <Link href={`/tx/${result.txId}`} className="text-orange-400 hover:text-orange-300">Lihat di Explorer →</Link></p>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const handleWalletReady = (w: ActiveWallet) => {
    setActiveWallet(w);
    setShowSend(false);
    setShowReceive(false);
  };

  const { data: addrData, refetch } = useQuery({
    queryKey: ["address", activeWallet?.address ?? ""],
    queryFn: () => api.getAddress(activeWallet!.address),
    enabled: !!activeWallet?.address,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (addrData && activeWallet) {
      setActiveWallet(prev => prev ? { ...prev, balance: addrData.balance, nonce: addrData.nonce } : null);
    }
  }, [addrData]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "new", label: "Buat Dompet", icon: "✨" },
    { id: "restore", label: "Pulihkan", icon: "🔓" },
    { id: "send", label: "Kirim IXC", icon: "📤" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Dompet IXCOIN</h1>
        <p className="text-sm text-muted-foreground mt-1">Buat dompet, pulihkan akses, atau kirim IXC ke siapa saja di IXCOIN Network</p>
      </div>

      {activeWallet && !showSend ? (
        <div className="space-y-3">
          <WalletCard
            wallet={activeWallet}
            onSend={() => { setShowSend(true); setShowReceive(false); }}
            onReceive={() => setShowReceive(r => !r)}
            onRefresh={() => refetch()}
            showReceive={showReceive}
          />
          <button
            onClick={() => { setActiveWallet(null); setShowSend(false); setShowReceive(false); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            Keluar dari dompet ini
          </button>
        </div>
      ) : activeWallet && showSend ? (
        <div className="space-y-3">
          <button
            onClick={() => setShowSend(false)}
            className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            ← Kembali ke dompet
          </button>
          <div className="rounded-xl border border-border bg-card p-5">
            <SendTab
              fromAddress={activeWallet.address}
              privateKey={activeWallet.privateKey}
              nonce={activeWallet.nonce}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-orange-500 text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            {tab === "new" && <NewWalletTab onWalletCreated={handleWalletReady} />}
            {tab === "restore" && <RestoreWalletTab onWalletRestored={handleWalletReady} />}
            {tab === "send" && <SendTab />}
          </div>
        </>
      )}
    </div>
  );
}
