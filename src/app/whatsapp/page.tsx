"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle2, XCircle, Send, RefreshCw, Sparkles, Smartphone, Bot, Phone } from 'lucide-react';

export default function WhatsAppPage() {
  const [configStatus, setConfigStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [botNumber, setBotNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [testInput, setTestInput] = useState('Beli kopi Kenangan 28rb tadi siang');
  const [testPhone, setTestPhone] = useState('628123456789');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setConfigStatus(data.status || 'disconnected');
        setBotNumber(data.botNumber || null);
      }
    } catch {
      setConfigStatus('disconnected');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: testPhone,
          text: testInput,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ error: 'Gagal menjalankan simulasi' });
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            padding: '12px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={28} color="#ffffff" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ margin: 0 }}>
              WhatsApp Bot Terpusat
              <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <Sparkles size={12} /> AI Powered
              </span>
            </h1>
            <p className="text-sm text-muted" style={{ margin: '4px 0 0 0' }}>
              Catat transaksi cukup dengan chat ke nomor bot — tanpa perlu daftar atau pairing.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.05) 100%)', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--color-accent)' }}>
          💡 Cara Kerja:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted">
          <div className="p-3 rounded-lg bg-paper border border-border">
            <span className="font-bold text-text block mb-1">1. Kirim Pesan ke Nomor Bot</span>
            Chat nomor WhatsApp bot yang sudah disediakan. Format bebas, contoh: <em>"Beli bensin 50rb"</em>, <em>"Dapat gaji 5jt"</em>, atau kirim foto struk.
          </div>
          <div className="p-3 rounded-lg bg-paper border border-border">
            <span className="font-bold text-text block mb-1">2. Otomatis Tercatat</span>
            AI akan memproses dan menyimpan transaksi. Bot akan membalas konfirmasi. Nomor HP kamu otomatis dikenali — <strong>tidak perlu daftar/pairing</strong>.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card flex flex-col justify-between" style={{ padding: '1.75rem' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ margin: 0 }}>
                <Bot size={20} className="text-accent" />
                Status Konfigurasi API
              </h2>
              <span className={`badge ${configStatus === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                {configStatus === 'connected' ? 'TERKONFIGURASI' : 'BELUM DIATUR'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw size={24} className="animate-spin text-muted" />
              </div>
            ) : configStatus === 'connected' ? (
              <div className="p-4 rounded-xl text-center space-y-2" style={{ background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
                <CheckCircle2 size={32} color="#25D366" className="mx-auto mb-2" />
                <div className="font-bold text-sm" style={{ color: '#25D366' }}>Fonnte API Siap!</div>
                {botNumber && (
                  <div className="text-xs text-muted">Nomor Bot: {botNumber}</div>
                )}
                <div className="text-xs text-muted">Bot siap menerima pesan dan mencatat transaksi.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} color="#ef4444" />
                    <span className="font-bold text-sm" style={{ color: '#ef4444' }}>API Token Belum Diatur</span>
                  </div>
                  <p className="text-xs text-muted">
                    Atur environment variable <code className="font-mono bg-paper-2 px-1 rounded">FONNTE_TOKEN</code> di file <code className="font-mono bg-paper-2 px-1 rounded">.env.local</code> untuk mengaktifkan bot.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card flex flex-col justify-between" style={{ padding: '1.75rem' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ margin: 0 }}>
                <Smartphone size={20} className="text-accent" />
                Nomor WhatsApp Terdaftar
              </h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Setiap nomor HP yang mengirim pesan ke bot akan otomatis terdaftar sebagai pengguna. 
              Tidak perlu kode OTP atau pairing — cukup kirim pesan, dan akun akan dibuat otomatis.
            </p>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
              <div className="flex items-center gap-2">
                <Phone size={18} color="#25D366" />
                <span className="text-xs text-muted">
                  Nomor terdaftar otomatis saat pertama kali kirim pesan ke bot.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ margin: 0 }}>
          <MessageSquare size={20} className="text-accent" />
          Simulasi Tes Chat AI (Uji Coba Langsung di Web)
        </h2>
        <p className="text-xs text-muted mb-4">
          Uji coba kecerdasan AI tanpa perlu chat ke WhatsApp. Masukkan nomor HP palsu dan kalimat transaksi:
        </p>

        <form onSubmit={handleRunTest} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium whitespace-nowrap">Nomor HP:</span>
            <input
              type="text"
              className="input-field"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="628123456789"
              style={{ width: '180px' }}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Contoh: Beli bensin Pertamax 50rb tadi sore"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isTesting}>
              {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              Uji AI
            </button>
          </div>
        </form>

        {testResult && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-border)' }}>
            <div className="text-xs font-bold text-muted mb-2">HASIL EKSTRAKSI AI:</div>

            {testResult.reply && (
              <pre className="text-xs p-3 rounded-lg" style={{
                background: '#0d1117',
                color: '#25D366',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                border: '1px solid rgba(37, 211, 102, 0.2)'
              }}>
                {testResult.reply}
              </pre>
            )}

            {testResult.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="p-2 rounded bg-paper">
                  <span className="text-muted block">Tipe:</span>
                  <span className="font-bold uppercase">{testResult.data.type}</span>
                </div>
                <div className="p-2 rounded bg-paper">
                  <span className="text-muted block">Nominal:</span>
                  <span className="font-bold text-accent">
                    Rp {Number(testResult.data.amount).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded bg-paper">
                  <span className="text-muted block">Kategori:</span>
                  <span className="font-bold">{testResult.data.category}</span>
                </div>
                <div className="p-2 rounded bg-paper">
                  <span className="text-muted block">Keterangan:</span>
                  <span className="font-bold">{testResult.data.description}</span>
                </div>
              </div>
            )}

            {testResult.error && (
              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{testResult.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
