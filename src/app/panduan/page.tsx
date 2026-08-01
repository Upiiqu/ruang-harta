"use client";

import React from 'react';
import { BookOpen, Camera, Mic, MessageSquare, LineChart, Target, Bot, ReceiptText } from 'lucide-react';

export default function PanduanPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      
      {/* Header */}
      <header className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen color="var(--color-accent)" size={32} />
          Panduan Penggunaan
        </h1>
        <p className="text-muted text-lg">Pelajari cara memaksimalkan fitur-fitur di Ruang Harta untuk mengelola keuangan Anda lebih cerdas.</p>
      </header>

      <div className="grid grid-cols-1 md-grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        
        {/* Fitur 1: Pencatatan Instan via WhatsApp */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-primary-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <MessageSquare color="var(--color-primary)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">1. Pencatatan via WhatsApp Bot</h2>
          </div>
          <p className="text-muted mb-4">Tidak perlu repot membuka aplikasi untuk mencatat pengeluaran. Cukup chat ke bot WhatsApp kami!</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span className="text-accent">💡</span> <b>Teks:</b> "Beli kopi kenangan 28rb pakai gopay"</li>
            <li className="flex gap-2"><span className="text-accent">🎙️</span> <b>Voice Note:</b> Bicara saja "Dapat gaji bulan ini 5 juta"</li>
            <li className="flex gap-2"><span className="text-accent">📷</span> <b>Foto Struk:</b> Kirimkan foto struk belanja minimarket Anda, AI akan membaca otomatis rinciannya.</li>
            <li className="flex gap-2 mt-2"><span className="text-primary font-bold">👉</span> <i>Syarat: Hubungkan (Pairing) nomor Anda di menu WhatsApp Bot.</i></li>
          </ul>
        </div>

        {/* Fitur 2: Dashboard & Scan Struk Web */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-accent-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <Camera color="var(--color-accent)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">2. Scanner Cerdas di Dashboard</h2>
          </div>
          <p className="text-muted mb-4">Jika Anda memiliki dokumen tagihan dalam bentuk foto atau PDF, Anda bisa langsung mengunggahnya di Dashboard.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span className="text-accent">📄</span> <b>Scan Struk Belanja:</b> Upload foto struk, AI akan membaca total dan mengkategorikannya sebagai Pengeluaran.</li>
            <li className="flex gap-2"><span className="text-accent">📈</span> <b>Scan Bukti Transfer:</b> Upload bukti transfer masuk untuk mencatat Pemasukan.</li>
            <li className="flex gap-2"><span className="text-accent">📋</span> <b>Scan Tagihan PDF:</b> Upload e-statement kartu kredit atau tagihan PDF untuk menganalisis hutang Anda.</li>
          </ul>
        </div>

        {/* Fitur 3: Daftar Transaksi */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-success-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <ReceiptText color="var(--color-success)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">3. Kelola Transaksi</h2>
          </div>
          <p className="text-muted mb-4">Semua data yang dikumpulkan (dari WhatsApp maupun Web) akan tersentralisasi di halaman <b>Transaksi</b>.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span className="text-accent">✏️</span> <b>Edit Cepat:</b> Klik ikon pensil untuk memperbaiki nominal, tanggal, atau kategori yang mungkin salah dibaca oleh AI.</li>
            <li className="flex gap-2"><span className="text-accent">🗑️</span> <b>Hapus Data:</b> Jika Anda membatalkan transaksi, Anda dapat menghapusnya dan sistem (termasuk database) akan otomatis diperbarui.</li>
          </ul>
        </div>

        {/* Fitur 4: Target & Tabungan */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-warning-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <Target color="var(--color-warning)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">4. Target & Tabungan</h2>
          </div>
          <p className="text-muted mb-4">Wujudkan impian finansial Anda dengan membuat sistem target (Sinking Funds) yang jelas dan terukur.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span className="text-accent">🎯</span> <b>Buat Target:</b> Masukkan nama impian (Misal: "Beli Laptop"), nominal yang dibutuhkan, dan target waktu (Misal: Desember 2026).</li>
            <li className="flex gap-2"><span className="text-accent">📊</span> <b>Progress Bar:</b> Sistem akan mengalkulasi berapa banyak yang harus ditabung setiap bulannya dan memantau kemajuan Anda.</li>
          </ul>
        </div>

        {/* Fitur 5: AI Insights */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-primary-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <Bot color="var(--color-primary)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">5. Analisis AI (AI Insights)</h2>
          </div>
          <p className="text-muted mb-4">Ruang Harta bukan sekadar pencatat, tapi **Penasihat Keuangan Pribadi** Anda. Di halaman AI Insights, kecerdasan buatan akan menganalisis pola keuangan Anda secara menyeluruh.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span className="text-accent">🧐</span> <b>Deteksi Pemborosan:</b> AI akan memberi tahu jika ada pengeluaran kategori tertentu yang terlalu bengkak bulan ini.</li>
            <li className="flex gap-2"><span className="text-accent">💡</span> <b>Langkah Konkret:</b> Anda tidak hanya diberi grafik, tapi juga poin saran *actionable* yang bisa langsung diterapkan.</li>
          </ul>
        </div>

        {/* Fitur 6: Fitur Dashboard Baru */}
        <div className="glass-panel" style={{ padding: 'var(--space-6)', gridColumn: '1 / -1' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ background: 'var(--color-accent-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <LineChart color="var(--color-accent)" size={24} />
            </div>
            <h2 className="text-xl font-bold m-0">6. AI Budget Planner, Pasar Terkini & Privasi Layar</h2>
          </div>
          <p className="text-muted mb-4">Dashboard kini dilengkapi berbagai fitur pintar untuk melacak portofolio dan merencanakan masa depan dengan lebih baik.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
              <li className="flex gap-2"><span className="text-accent">🥧</span> <b>AI Budget Planner:</b> Bandingkan pengeluaran "Aktual" Anda dengan rasio "Ideal" (50/30/20) yang disarankan oleh AI dalam bentuk Pie Chart bersebelahan.</li>
              <li className="flex gap-2"><span className="text-accent">👁️</span> <b>Sembunyikan Saldo (Hide Balance):</b> Klik ikon mata pada total saldo untuk menyensor nominal uang dengan bintang (`Rp *****`), sangat aman saat dibuka di tempat umum.</li>
            </ul>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-2 text-sm">
              <li className="flex gap-2"><span className="text-accent">📊</span> <b>Pasar Terkini (Market Snapshot):</b> Pantau pergerakan harga instrumen investasi populer seperti Reksa Dana, Saham (IDX), Emas, dan Bitcoin langsung dari Dashboard secara real-time.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
