"use client";

import React, { useState } from 'react';
import { Wallet, UserPlus, Lock, ArrowLeft, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', name, email, password, secretCode, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal mendaftar.');
        return;
      }

      localStorage.setItem('ruang_harta_user_name', data.name);
      if (data.phoneNumber) {
        localStorage.setItem('ruang_harta_phone', data.phoneNumber);
      }
      // Clear previous financial data for fresh start
      localStorage.removeItem('ruang_harta_transactions');
      localStorage.removeItem('ruang_harta_targets');

      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-4)', backgroundColor: 'var(--color-bg)' }}>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)', position: 'relative' }}>
        
        <Link href="/login" style={{ position: 'absolute', top: 'var(--space-6)', left: 'var(--space-6)', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Kembali
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)', marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--color-accent)', borderRadius: '12px', marginBottom: 'var(--space-4)' }}>
            <Wallet size={24} color="var(--color-paper)" />
          </div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Daftar Akses</h1>
          <p className="text-muted">Aplikasi dalam masa *Private Beta*</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger, #ef4444)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', border: '1px solid var(--color-danger, #ef4444)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Lock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Nama Panggilan</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Misal: Luthfi" 
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Email Baru</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="nama@email.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Password Baru</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Min. 8 karakter, huruf besar, kecil, dan angka" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Konfirmasi Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Ketik ulang password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium flex items-center gap-1">
              <Phone size={14} /> Nomor WhatsApp (untuk Bot)
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="6281234567890"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <span className="text-xs text-muted">Gunakan format internasional tanpa +/spasi. Nomor ini akan digunakan bot WhatsApp untuk mengenali akunmu.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
            <label className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Kode Akses Khusus (Wajib)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Masukkan kode..." 
              value={secretCode}
              onChange={e => setSecretCode(e.target.value)}
              style={{ borderColor: 'var(--color-accent)' }}
            />
            <span className="text-xs text-muted">Hanya pengguna yang memiliki kode undangan yang dapat mendaftar.</span>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: 'var(--space-4)', padding: '12px', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
            <UserPlus size={18} /> {isLoading ? 'Mendaftarkan...' : 'Buat Akun'}
          </button>
        </form>
      </div>
      
    </div>
  );
}
