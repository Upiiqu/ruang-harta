# Catatan Proyek: Ruang Harta (AI Financial Planner)

**Tanggal Pembaruan Terakhir:** 21 Juli 2026

## Ringkasan Fitur yang Telah Diselesaikan (Sesi Hari Ini)

1. **Desain UI/UX Premium (Glassmorphism)**
   - Tampilan *dashboard* elegan, responsif untuk *desktop* dan *mobile*.
   - *Summary cards* menggunakan tata letak *grid* 2x2 yang rapi di layar HP.
   - **Fitur Privasi Saldo 👁️:** Tombol ikon Mata Terbuka/Tertutup untuk menyembunyikan/menampilkan nominal saldo dengan bintang-bintang (`Rp ••••••••`). Status tersimpan di browser (`localStorage`).
   - Sapaan personal berdasarkan waktu (Pagi/Siang/Sore/Malam) dan nama pengguna.
   - *Top bar* khusus untuk pengguna *mobile*.

2. **Sistem Autentikasi (SaaS Style)**
   - Sistem *login* dan *sign up* dengan kode akses rahasia (`FINANSIAL`).
   - Keamanan tingkat tinggi: Menggunakan *cookies* `HttpOnly`, `Secure`, dan `SameSite=Strict` via *server-side API* (`/api/auth`).
   - *Middleware* Next.js memproteksi semua halaman UI dan jalur API dari akses tanpa izin (401 Unauthorized).

3. **Fitur AI Scanner (Menggunakan Gemini 2.5/3.5 Flash)**
   - **Pemindai Struk (Pengeluaran):** Mengekstrak nama toko, tanggal, item, dan total harga.
   - **Pemindai Pemasukan & Mutasi Rekening:** Mendukung file gambar (JPG/PNG) dan **PDF** (mutasi rekening bank). Mengekstrak **daftar seluruh transaksi kredit/pemasukan**, mendukung **pilihan centang (checkbox)** item yang mau disimpan, serta **kategorisasi kustom** (Gaji, Transfer Masuk, Freelance, Investasi/Bunga, Lainnya).
   - **Pemindai Hutang/Tagihan:** Mengekstrak data tagihan dan memberikan **Analisis Risiko (Lampu Hijau/Merah)** jika cicilan melebihi 30% dari total pemasukan.
   - *Fleksibilitas:* Pengguna dapat mengedit/mengubah tanggal, sumber, nominal, dan kategori secara manual sebelum menyimpan data hasil *scan* AI.

4. **Market Snapshot (Pantauan Pasar Terkini)**
   - Menggantikan kotak AI Assistant lama di *Dashboard*.
   - Menarik harga **Bitcoin (BTC)** secara *real-time* dari Binance.
   - Menarik kurs **USD/IDR** dan saham unggulan **(BBCA, BBRI, BMRI)** dari Yahoo Finance (dengan *delay* wajar 15 menit sesuai aturan IDX).

5. **Keamanan Aplikasi (Security Audit Passed 🛡️)**
   - Batas ukuran unggahan *file* maksimum 10MB untuk mencegah serangan DoS.
   - Validasi MIME type ketat (hanya memproses gambar dan PDF).
   - *Header* Keamanan HTTP aktif di `next.config.ts` (termasuk *Content-Security-Policy*, HSTS, pencegahan *Clickjacking* & *MIME sniffing*).

## Rencana Selanjutnya (Untuk Sesi Berikutnya)
- Melanjutkan pengembangan halaman **Transaksi** (untuk melihat riwayat lengkap).
- Melanjutkan pengembangan halaman **Target & Tabungan** (skema tabungan yang disarankan AI).
- Melanjutkan pengembangan halaman **AI Insights** (halaman penuh untuk analisis portofolio keuangan mendalam).
- Persiapan untuk proses *deployment* (hosting) aplikasi agar benar-benar bisa diakses secara *online* oleh publik.

---
*Catatan ini disimpan agar kita bisa langsung melanjutkan pengembangan di sesi berikutnya tanpa kehilangan konteks.*
