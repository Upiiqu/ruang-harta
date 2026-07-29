"use client";

import React, { useState } from 'react';
import { Wallet, LogIn, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal masuk.');
        return;
      }
      // Clear previous data before setting new session data
      localStorage.removeItem('ruang_harta_transactions');
      localStorage.removeItem('ruang_harta_targets');
      localStorage.removeItem('ruang_harta_hide_balance');
      if (data.name) {
        localStorage.setItem('ruang_harta_user_name', data.name);
      }
      if (data.phoneNumber) {
        localStorage.setItem('ruang_harta_phone', data.phoneNumber);
      }
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
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--color-accent)', borderRadius: '12px', marginBottom: 'var(--space-4)' }}>
            <Wallet size={24} color="var(--color-paper)" />
          </div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Ruang Harta</h1>
          <p className="text-muted">Masuk untuk mengelola kekayaan Anda</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger, #ef4444)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', border: '1px solid var(--color-danger, #ef4444)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="nama@email.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-sm font-medium">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: 'var(--space-4)', padding: '12px', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
            <LogIn size={18} /> {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-8)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-6)' }}>
          <p className="text-muted text-sm">
            Belum memiliki akun? <br/>
            <Link href="/signup" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
              Daftar Akses Khusus <ArrowRight size={14} />
            </Link>
          </p>
        </div>
      </div>
      
    </div>
  );
}
