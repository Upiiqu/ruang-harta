"use client";

import React, { useState } from 'react';
import { Wallet, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LupaPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', email, password, secretCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal mereset password.');
        return;
      }
      setSuccess("Password berhasil direset!");
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    }
    setIsLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)', position: 'relative' }}>

        <Link href="/login" style={{ position: 'absolute', top: 'var(--space-6)', left: 'var(--space-6)', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Kembali
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)', marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--color-accent)', borderRadius: '12px', marginBottom: 'var(--space-4)' }}>
            <Lock size={24} color="var(--color-paper)" />
          </div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Lupa Password</h1>
          <p className="text-muted">Masukkan kode akses rahasia untuk mereset password.</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', border: '1px solid var(--color-danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Lock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <CheckCircle size={48} color="var(--color-success)" style={{ marginBottom: 'var(--space-4)' }} />
            <p style={{ color: 'var(--color-success)', fontWeight: 500 }}>{success}</p>
            <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>Mengarahkan ke halaman login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm font-medium">Email</label>
              <input type="email" className="input-field" placeholder="nama@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm font-medium">Password Baru</label>
              <input type="password" className="input-field" placeholder="Min. 8 karakter, huruf besar, kecil, dan angka" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm font-medium">Konfirmasi Password Baru</label>
              <input type="password" className="input-field" placeholder="Ketik ulang password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'var(--space-3)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
              <label className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Kode Akses Rahasia</label>
              <input type="text" className="input-field" placeholder="Masukkan kode akses..." value={secretCode} onChange={e => setSecretCode(e.target.value)} style={{ borderColor: 'var(--color-accent)' }} />
              <span className="text-xs text-muted">Gunakan kode akses yang sama saat pendaftaran.</span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '12px', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
              {isLoading ? 'Memproses...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
