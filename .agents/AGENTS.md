<!-- Project Notes: Ruang Harta - Sync Architecture -->

# Sync Architecture Notes

## Penting: Format ID Transaksi

- Kolom `id` di tabel `transactions` Supabase bertipe **UUID**.
- Client **WAJIB** menggunakan `crypto.randomUUID()` untuk membuat ID transaksi baru.
- **JANGAN** gunakan `Date.now().toString()` atau format lainnya — Supabase akan menolak upsert karena bukan UUID valid.

## Alur Sinkronisasi (Server-First)

1. **Server (Supabase) adalah sumber kebenaran utama** (*single source of truth*).
2. Polling tiap 5 detik di Dashboard (`page.tsx`) dan Halaman Transaksi (`transaksi/page.tsx`).
3. Saat polling:
   - Ambil semua transaksi dari server → jadikan basis utama.
   - Cek transaksi lokal yang belum ada di server → push ke server via `save-all`.
   - Transaksi yang sudah dihapus di server **tidak boleh dipertahankan di lokal**.
4. Saat user edit/hapus/tambah transaksi:
   - Simpan ke `localStorage` → lalu panggil `syncTransactionsToServer()` yang menggunakan aksi `replace-all`.

## Backend API Actions (`/api/transactions/sync`)

| Action | Behavior |
|---|---|
| `save-all` | Upsert saja (tidak hapus). Untuk push transaksi baru ke server. |
| `replace-all` | Upsert + hapus transaksi server yang tidak ada di daftar klien. Untuk full sync. |
| `delete` | Hapus satu transaksi berdasarkan ID. |

## UUID Validation di Backend

- `sanitizeTransaction()` hanya menyertakan `id` jika formatnya UUID valid.
- ID non-UUID (warisan lama) akan di-insert sebagai row baru dengan UUID dari Supabase.

## WhatsApp Webhook

- Transaksi dari WhatsApp **harus** menyertakan `family_id` agar muncul di query web yang filter berdasarkan keluarga.
- Gunakan `getUserFamily(user.id)` sebelum insert.

## localStorage Key

- Transaksi: `ruang_harta_transactions`
- Hide balance: `ruang_harta_hide_balance`
- User name: `ruang_harta_user_name`
- User phone: `ruang_harta_phone`
- Financial cycle/payday date: `ruang_harta_cycle_date` (1-31, used in Dashboard to filter "Bulan Ini" data)
- Theme: `ruang_harta_theme` (ocean | emerald | sunset | royal | rose, sets data-theme on html)

## UI & Logic Notes

- **Siklus Keuangan (Financial Cycle)**: 
  - Saldo "Bulan Ini" (Pemasukan, Pengeluaran, Hutang) di-filter menggunakan `ruang_harta_cycle_date`.
  - Jika diset ke `25`, maka Pemasukan/Pengeluaran akan dihitung dari tanggal 25 bulan sebelumnya/sekarang, ke tanggal 24 bulan berikutnya.
  - "Total Saldo" tetap menjumlahkan keseluruhan (all-time) terlepas dari pengaturan siklus.
- **Tema Visual**: 
  - Tema diset lewat atribut `data-theme` pada tag `<html>`. CSS ada di `globals.css`.
  - Inisialisasi tema dilakukan di `layout.tsx` lewat sebuah script inline untuk mencegah flicker.

## AI Budget Planner (Dashboard)
- Grafik alokasi anggaran (Pie Chart) di Dashboard menggunakan porsi ideal yang berlandaskan prinsip Islam (memasukkan unsur Zakat/Sedekah):
  - Kebutuhan Pokok: 50%
  - Maksimal Hutang / Cicilan: 20%
  - Hiburan & Keinginan: 17.5%
  - Tabungan & Investasi: 10%
  - Zakat & Sedekah: 2.5%
- UI Chart harus selalu menggunakan format teks yang rapi dan angka desimal yang benar (misal: 2.5%, jangan dibulatkan menjadi 3%).
