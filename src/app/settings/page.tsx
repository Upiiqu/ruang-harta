"use client";

import React, { useEffect, useState } from 'react';
import { Settings, Phone, Check, X, RefreshCw, MessageSquare, User, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [cycleDate, setCycleDate] = useState('1');
  const [savedCycleDate, setSavedCycleDate] = useState('1');
  const [cycleMessage, setCycleMessage] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('ruang_harta_user_name') || '';
    setUserName(name);

    const cDate = localStorage.getItem('ruang_harta_cycle_date') || '1';
    setCycleDate(cDate);
    setSavedCycleDate(cDate);

    fetch('/api/whatsapp/pairing')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.phoneNumber) {
          setPhoneNumber(data.phoneNumber);
          setSavedPhone(data.phoneNumber);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (!clean) {
      setMessage('Nomor WhatsApp tidak boleh kosong.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', phoneNumber: clean }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedPhone(clean);
        localStorage.setItem('ruang_harta_phone', clean);
        setMessage('Nomor WhatsApp berhasil disimpan!');
      } else {
        setMessage(data.error || 'Gagal menyimpan.');
      }
    } catch {
      setMessage('Gagal menghubungi server.');
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!confirm('Hapus nomor WhatsApp dari akun ini?')) return;

    setSaving(true);
    try {
      await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      });
      setPhoneNumber('');
      setSavedPhone('');
      localStorage.removeItem('ruang_harta_phone');
      setMessage('Nomor WhatsApp dilepas.');
    } catch {
      setMessage('Gagal menghapus.');
    }
    setSaving(false);
    setSaving(false);
  };

  const handleSaveCycle = () => {
    const num = parseInt(cycleDate);
    if (isNaN(num) || num < 1 || num > 31) {
      setCycleMessage('Tanggal harus antara 1 sampai 31.');
      return;
    }
    localStorage.setItem('ruang_harta_cycle_date', num.toString());
    setSavedCycleDate(num.toString());
    setCycleMessage('Tanggal gajian berhasil disimpan!');
    setTimeout(() => setCycleMessage(''), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
          <Settings size={28} color="var(--color-accent)" />
          Pengaturan
        </h1>
        <p className="text-muted">Kelola profil dan koneksi WhatsApp kamu.</p>
      </header>

      {/* Profile Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
          <User size={20} color="var(--color-accent)" />
          <h3>Profil</h3>
        </div>

        {userName && (
          <div className="flex items-center justify-between" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm text-muted">Nama</span>
            <span className="font-medium">{userName}</span>
          </div>
        )}
      </div>

      {/* Financial Cycle Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
          <CalendarDays size={20} color="var(--color-accent)" />
          <div>
            <h3>Siklus Keuangan</h3>
            <p className="text-sm text-muted" style={{ marginTop: '2px' }}>Tentukan tanggal gajian Anda untuk perhitungan sisa uang bulan ini.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
              Tanggal Gajian / Awal Siklus (1 - 31)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="31"
                className="input-field"
                placeholder="1"
                value={cycleDate}
                onChange={e => setCycleDate(e.target.value)}
                style={{ width: '100px' }}
              />
              <button className="btn btn-primary flex items-center gap-2" onClick={handleSaveCycle} disabled={cycleDate === savedCycleDate}>
                <Check size={16} />
                Simpan
              </button>
            </div>
          </div>

          {cycleMessage && (
            <p className="text-sm" style={{ color: cycleMessage.includes('harus') ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {cycleMessage}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}>
            <CalendarDays size={14} />
            <span>Misal: Jika diisi 25, maka Pemasukan/Pengeluaran "Bulan Ini" di Dashboard akan dihitung dari tanggal 25 hingga tanggal 24 bulan depan.</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Number Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center gap-3">
            <Phone size={20} color="var(--color-accent)" />
            <h3>Nomor WhatsApp</h3>
          </div>
          {savedPhone && (
            <span className="badge badge-success">TERHUBUNG</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 'var(--space-8)' }}>
            <RefreshCw size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Nomor WhatsApp (format internasional, tanpa +)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="tel"
                  className="input-field"
                  placeholder="6281234567890"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving || phoneNumber === savedPhone}>
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  Simpan
                </button>
              </div>
            </div>

            {message && (
              <p className="text-sm" style={{ color: message.includes('Gagal') ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {message}
              </p>
            )}

            {savedPhone ? (
              <div className="flex items-center justify-between" style={{ padding: 'var(--space-3)', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div>
                  <span className="text-xs text-muted">Nomor terdaftar:</span>
                  <p className="font-medium">+{savedPhone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/whatsapp" className="btn btn-secondary flex items-center gap-2" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
                    <MessageSquare size={14} /> Info Bot
                  </Link>
                  <button className="btn btn-secondary flex items-center gap-2" onClick={handleRemove} disabled={saving} style={{ padding: '6px 12px', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
                    <X size={14} /> Lepas
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}>
                <MessageSquare size={14} />
                <span>Nomor ini digunakan bot WhatsApp untuk mengenali akunmu. <Link href="/whatsapp" style={{ color: 'var(--color-accent)' }}>Cara kerja bot →</Link></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
