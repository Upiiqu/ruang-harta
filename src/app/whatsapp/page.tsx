"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, QrCode, CheckCircle2, Copy, RefreshCw, Send, Mic, Image, Sparkles, Smartphone, ShieldCheck, Unlink, Wifi, Power } from 'lucide-react';
import QRCode from 'qrcode';
import QRCodeInline from '@/components/QRCodeInline';

export default function WhatsAppPage() {
  const [pairingCode, setPairingCode] = useState<string>('RH-...');
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Bot Connection State
  const [botStatus, setBotStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isStartingBot, setIsStartingBot] = useState<boolean>(false);

  // Interactive Test State
  const [testInput, setTestInput] = useState<string>('Beli kopi Kenangan 28rb tadi siang');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Fetch user pairing info
  const fetchPairingInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/pairing');
      const data = await res.json();

      if (data.success) {
        setIsPaired(data.isPaired);
        setPhoneNumber(data.phoneNumber);
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch pairing info:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Bot Connection Status & QR Code
  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setBotStatus(data.status || 'disconnected');
        if (data.qrCode) {
          setQrCodeData(data.qrCode);
        } else {
          setQrCodeData(null);
        }
      }
    } catch {
      setBotStatus('disconnected');
    }
  };

  // Trigger Bot Connection (Scan QR)
  const handleStartBot = async () => {
    setIsStartingBot(true);
    try {
      const res = await fetch('/api/whatsapp/status', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBotStatus(data.status || 'connecting');
        if (data.qrCode) setQrCodeData(data.qrCode);
      }
    } catch (err) {
      console.error('Failed to start bot:', err);
    } finally {
      setIsStartingBot(false);
    }
  };

  useEffect(() => {
    fetchPairingInfo();
    fetchBotStatus();

    const interval = setInterval(() => {
      fetchBotStatus();
    }, 4000); // Check status every 4 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (qrCodeData) {
      QRCode.toDataURL(qrCodeData, { margin: 2, width: 220 })
        .then((url) => setQrImageUrl(url))
        .catch((err) => console.error('Error generating QR data URL:', err));
    } else {
      setQrImageUrl(null);
    }
  }, [qrCodeData]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = async () => {
    if (!confirm('Apakah Anda yakin ingin melepas tautan nomor WhatsApp dari akun ini?')) return;
    setLoading(true);
    try {
      await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      });
      await fetchPairingInfo();
    } catch (err) {
      console.error('Unlink error:', err);
    } finally {
      setLoading(false);
    }
  };

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
          phone: phoneNumber || '628123456789',
          text: testInput,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: 'Gagal menjalankan simulasi' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
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
              Integrasi WhatsApp Bot
              <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <Sparkles size={12} /> AI Powered (Baileys)
              </span>
            </h1>
            <p className="text-sm text-muted" style={{ margin: '4px 0 0 0' }}>
              Catat pengeluaran, pemasukan & struk belanja cukup dengan mengirim chat atau voice note di WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Guide Banner */}
      <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.05) 100%)', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
        <h3 className="text-sm font-bold text-accent flex items-center gap-2 mb-2">
          💡 Cara Mudah Mengaktifkan & Menggunakan WhatsApp Bot (2 Langkah):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted">
          <div className="p-3 rounded-lg bg-paper border border-border">
            <span className="font-bold text-text block mb-1">Langkah 1: Aktifkan Bot (Scan QR Code)</span>
            Klik tombol <strong>"Nyalakan Bot WhatsApp"</strong> di bawah. Buka WA HP → <em>Perangkat Tertaut (Linked Devices)</em> → Scan QR Code yang muncul.
          </div>
          <div className="p-3 rounded-lg bg-paper border border-border">
            <span className="font-bold text-text block mb-1">Langkah 2: Tautkan Akun Pengguna</span>
            Kirimkan kode OTP <strong>{pairingCode}</strong> dari WhatsApp Anda ke nomor Bot yang sudah aktif. Bot akan membalas bahwa akun Anda sudah terhubung!
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Bot Server Connection & QR Code */}
        <div className="glass-card flex flex-col justify-between" style={{ padding: '1.75rem' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ margin: 0 }}>
                <Wifi size={20} className="text-accent" />
                1. Status Server Bot WhatsApp
              </h2>
              <span className={`badge ${botStatus === 'connected' ? 'badge-success' : botStatus === 'connecting' ? 'badge-warning' : 'badge-danger'}`}>
                {botStatus === 'connected' ? 'ONLINE' : botStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
              </span>
            </div>

            {botStatus === 'connected' ? (
              <div className="p-4 rounded-xl text-center space-y-2" style={{ background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
                <CheckCircle2 size={32} color="#25D366" className="mx-auto mb-2" />
                <div className="font-bold text-sm text-accent">Server WhatsApp Bot Berhasil Aktif & Terhubung!</div>
                <div className="text-xs text-muted">Nomor WhatsApp Bot siap menerima pesan transaksi dari Anda.</div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs text-muted">
                  Server Bot WhatsApp saat ini dalam kondisi offline. Klik tombol di bawah untuk menampilkan QR Code penautan server:
                </p>

                <button
                  onClick={handleStartBot}
                  disabled={isStartingBot}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                  style={{ padding: '12px' }}
                >
                  {isStartingBot ? <RefreshCw size={18} className="animate-spin" /> : <Power size={18} />}
                  {isStartingBot ? 'Menyiapkan Server Bot...' : 'Nyalakan Bot WhatsApp (Scan QR)'}
                </button>

                {qrCodeData && (
                  <div className="p-4 rounded-xl bg-paper border border-border inline-block mt-3">
                    <div className="text-xs font-bold mb-2">Scan QR Code ini menggunakan WhatsApp HP:</div>
                    <QRCodeInline data={qrCodeData} qrImageUrl={qrImageUrl} />
                    <div className="text-xs text-muted mt-2">Buka WA HP → Perangkat Tertaut → Tautkan Perangkat</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Status Pairing Nomor Akun User */}
        <div className="glass-card flex flex-col justify-between" style={{ padding: '1.75rem' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ margin: 0 }}>
                <Smartphone size={20} className="text-accent" />
                2. Tautkan Nomor Pengguna
              </h2>
              <span className={`badge ${isPaired ? 'badge-success' : 'badge-warning'}`}>
                {isPaired ? 'TERHUBUNG' : 'BELUM TERHUBUNG'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw size={24} className="animate-spin text-muted" />
              </div>
            ) : isPaired ? (
              <div className="space-y-4">
                <div style={{
                  background: 'rgba(37, 211, 102, 0.1)',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={28} color="#25D366" />
                    <div>
                      <div className="text-xs text-muted">Nomor WhatsApp Anda:</div>
                      <div className="text-lg font-bold" style={{ color: '#25D366' }}>
                        +{phoneNumber}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Akun Anda sudah terhubung. Setiap kali Anda mengirim pesan transaksi ke bot WhatsApp, data akan otomatis tercatat di dashboard ini.
                </p>
                <button
                  onClick={handleUnlink}
                  className="btn btn-secondary flex items-center justify-center gap-2 w-full"
                  style={{ color: 'var(--color-danger, #ef4444)' }}
                >
                  <Unlink size={16} />
                  Lepas Tautan WhatsApp
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Kirimkan kode OTP unik di bawah ini sebagai pesan chat ke nomor Bot WhatsApp yang sudah aktif:
                </p>

                {/* Pairing Code Card */}
                <div className="glass-panel text-center" style={{ padding: '1.25rem', background: 'var(--color-paper-2)', borderRadius: '14px' }}>
                  <div className="text-xs text-muted mb-1">Kode OTP Pairing Anda (Berlaku 15 Menit):</div>
                  <div className="text-3xl font-extrabold tracking-widest my-2" style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>
                    {pairingCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="btn btn-secondary text-xs flex items-center justify-center gap-1 mx-auto"
                    style={{ marginTop: '0.75rem', padding: '6px 14px' }}
                  >
                    {copied ? <CheckCircle2 size={14} color="#25D366" /> : <Copy size={14} />}
                    {copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck size={16} className="text-accent flex-shrink-0" />
                  <span>Kirimkan pesan <strong>{pairingCode}</strong> ke nomor Bot untuk menghubungkan akun.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Interactive WhatsApp Simulator */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ margin: 0 }}>
          <MessageSquare size={20} className="text-accent" />
          Simulasi Tes Chat AI WhatsApp (Uji Coba Langsung di Web)
        </h2>
        <p className="text-xs text-muted mb-4">
          Anda juga bisa mencoba kecerdasan buatan AI tanpa harus menyalakan bot WhatsApp asli dengan menguji kalimat di bawah ini:
        </p>

        <form onSubmit={handleRunTest} className="flex gap-2">
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
        </form>

        {testResult && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-border)' }}>
            <div className="text-xs font-bold text-muted mb-2">HASIL EKSTRAKSI AI & BALASAN BOT:</div>
            
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
          </div>
        )}
      </div>
    </div>
  );
}
