"use client";

import React, { useEffect, useState } from 'react';
import { Users, Plus, LogIn, Copy, Check, Share2, ArrowLeft, Database, Upload, RefreshCw } from 'lucide-react';

export default function KeluargaPage() {
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family');
      const data = await res.json();
      setFamily(data.family);
      setMembers(data.members || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadFamily(); }, []);

  const handleCreate = async () => {
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName || 'Keluarga Saya' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Keluarga berhasil dibuat!');
        setShowCreate(false);
        loadFamily();
      } else {
        setError(data.error || 'Gagal membuat keluarga');
      }
    } catch {
      setError('Gagal menghubungi server');
    }
  };

  const handleJoin = async () => {
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Bergabung dengan ${data.family.name}!`);
        setShowJoin(false);
        loadFamily();
      } else {
        setError(data.error || 'Gagal bergabung');
      }
    } catch {
      setError('Gagal menghubungi server');
    }
  };

  const copyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}><p className="text-muted">Memuat...</p></div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Keluarga</h1>
        <p className="text-muted">Atur keluarga dan undang pasangan untuk berbagi data keuangan.</p>
      </header>

      {message && (
        <div className="glass-panel" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <p style={{ color: 'var(--color-success)' }}>{message}</p>
        </div>
      )}

      {!family ? (
        <div className="glass-panel" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-4)', opacity: 0.5 }} />
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Belum Bergabung dalam Keluarga</h3>
          <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>Buat keluarga baru atau bergabung dengan undangan pasangan.</p>

          <div className="flex items-center justify-center gap-4" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Buat Keluarga
            </button>
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => setShowJoin(true)}>
              <LogIn size={18} /> Gabung dengan Kode
            </button>
          </div>

          {showCreate && (
            <div className="glass-panel" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'left' }}>
              <h4 style={{ marginBottom: 'var(--space-4)' }}>Buat Keluarga Baru</h4>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Nama Keluarga</label>
                  <input className="input-field" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Keluarga Saya" />
                </div>
                {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>}
                <div className="flex items-center gap-3">
                  <button className="btn btn-primary" onClick={handleCreate}>Simpan</button>
                  <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setError(''); }}>Batal</button>
                </div>
              </div>
            </div>
          )}

          {showJoin && (
            <div className="glass-panel" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'left' }}>
              <h4 style={{ marginBottom: 'var(--space-4)' }}>Gabung dengan Kode Undangan</h4>
              <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>Masukkan kode undangan dari pasanganmu.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Kode Undangan</label>
                  <input className="input-field" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="Contoh: ABC123YZ" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                </div>
                {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>}
                <div className="flex items-center gap-3">
                  <button className="btn btn-primary" onClick={handleJoin}>Gabung</button>
                  <button className="btn btn-ghost" onClick={() => { setShowJoin(false); setError(''); }}>Batal</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass-panel" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="flex items-center gap-3">
                <Users size={24} color="var(--color-accent)" />
                <h3>{family.name}</h3>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--color-paper-3)', border: '1px solid var(--color-border)' }}>
                {members.length} anggota
              </span>
            </div>

            <div className="glass-panel" style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-paper-3)', marginTop: 'var(--space-4)' }}>
              <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Kode Undangan</label>
              <div className="flex items-center gap-3">
                <code style={{
                  fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.15em',
                  padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--color-paper)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flex: 1,
                  textAlign: 'center'
                }}>
                  {family.invite_code}
                </code>
                <button className="btn btn-secondary flex items-center gap-2" onClick={copyInviteCode}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>
                Bagikan kode ini ke pasanganmu. Mereka bisa bergabung dari halaman Keluarga.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
            <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
              <h4>Anggota Keluarga</h4>
            </div>
            {members.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <p className="text-muted">Belum ada anggota</p>
              </div>
            ) : (
              <div>
                {members.map((m: any) => (
                  <div key={m.id} style={{
                    padding: 'var(--space-4) var(--space-6)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <p className="font-medium">{m.users?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted">{m.users?.email}</p>
                    </div>
                    <span className="badge" style={{
                      backgroundColor: m.role === 'owner' ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-paper-3)',
                      border: '1px solid var(--color-border)',
                      color: m.role === 'owner' ? 'var(--color-accent)' : 'var(--color-text)'
                    }}>
                      {m.role === 'owner' ? 'Pemilik' : 'Anggota'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Migration Section */}
          <MigrateData />
        </>
      )}
    </div>
  );
}

function MigrateData() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState('');

  const handleMigrate = async () => {
    setMigrating(true);
    setResult('');

    const transactions = JSON.parse(localStorage.getItem('ruang_harta_transactions') || '[]');
    const targets = JSON.parse(localStorage.getItem('ruang_harta_targets') || '[]');

    if (transactions.length === 0 && targets.length === 0) {
      setResult('Tidak ada data di localStorage untuk dimigrasi.');
      setMigrating(false);
      return;
    }

    try {
      const res = await fetch('/api/family/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, targets }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Berhasil! ${data.results?.join(', ') || 'Data tersimpan.'}`);
      } else {
        setResult('Gagal: ' + (data.error || 'unknown'));
      }
    } catch {
      setResult('Gagal menghubungi server.');
    }
    setMigrating(false);
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
        <Database size={20} color="var(--color-accent)" />
        <h4>Migrasi Data Lokal ke Server</h4>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Pindahkan data transaksi dan target dari browser ke server agar bisa diakses bersama pasangan.
      </p>
      {result && (
        <p className="text-sm" style={{ marginBottom: 'var(--space-4)', color: result.includes('Gagal') || result.includes('tidak ada') ? 'var(--color-text)' : 'var(--color-success)' }}>
          {result}
        </p>
      )}
      <button className="btn btn-primary flex items-center gap-2" onClick={handleMigrate} disabled={migrating}>
        {migrating ? <RefreshCw size={18} className="spin" /> : <Upload size={18} />}
        {migrating ? 'Memigrasi...' : 'Migrasi Data ke Server'}
      </button>
    </div>
  );
}
