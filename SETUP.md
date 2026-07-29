# 🚀 Panduan Setup Deployment — Ruang Harta

## Prasyarat

1. Akun GitHub (untuk source code)
2. Akun Netlify (untuk hosting) — https://netlify.com
3. Akun Supabase (untuk database pengguna) — https://supabase.com (GRATIS)

---

## Langkah 1: Setup Supabase (Database Pengguna)

### 1.1 Buat Proyek Supabase
1. Buka https://supabase.com dan login/daftar
2. Klik **"New Project"**
3. Isi nama proyek: `ruang-harta`
4. Pilih region terdekat (Singapore)
5. Buat password database yang kuat → **simpan password ini!**
6. Klik **"Create new project"** dan tunggu ~2 menit

### 1.2 Buat Tabel Users
1. Di dashboard Supabase, klik menu **"SQL Editor"**
2. Klik **"New Query"** dan paste SQL berikut:

```sql
-- Tabel untuk menyimpan data pengguna
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat pencarian berdasarkan email
CREATE INDEX idx_users_email ON users(email);

-- Matikan Row Level Security karena kita menggunakan service role key
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

3. Klik **"Run"**

### 1.3 Ambil Credentials
1. Klik menu **"Settings"** → **"API"**
2. Catat dua nilai ini:
   - **Project URL** → untuk `SUPABASE_URL`
   - **service_role** (secret) → untuk `SUPABASE_SERVICE_ROLE_KEY`
   
   ⚠️ **JANGAN** gunakan `anon` key! Gunakan **`service_role`** key.

---

## Langkah 2: Generate JWT Secret

Jalankan perintah ini di terminal untuk membuat JWT secret yang kuat:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Simpan hasilnya → ini untuk `JWT_SECRET`

---

## Langkah 3: Update `.env.local` (untuk development lokal)

Edit file `.env.local` dan isi semua nilai:

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Groq AI (opsional, fallback)
GROQ_API_KEY=your_groq_api_key_here

# Signup secret code (kode yang harus dimasukkan saat daftar)
SIGNUP_SECRET_CODE=FINANSIAL

# JWT Secret (wajib, generate dengan perintah di atas)
JWT_SECRET=your_64_byte_hex_string_here

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Langkah 4: Deploy ke Netlify

### 4.1 Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit - Ruang Harta"
git remote add origin https://github.com/username/ruang-harta.git
git push -u origin main
```

### 4.2 Setup di Netlify
1. Login ke https://netlify.com
2. Klik **"Add new site"** → **"Import an existing project"**
3. Pilih **GitHub** dan authorize
4. Pilih repository `ruang-harta`
5. Build settings (otomatis terdeteksi dari `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Klik **"Deploy site"**

### 4.3 Set Environment Variables di Netlify
1. Di Netlify dashboard, pergi ke **Site settings** → **Environment variables**
2. Tambahkan **semua** variable dari `.env.local`:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `SIGNUP_SECRET_CODE`
   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV` = `production`

3. Klik **"Trigger deploy"** untuk redeploy dengan env vars baru

---

---

## Setup WhatsApp Bot (Fonnte API)

Bot WhatsApp menggunakan **Fonnte** sebagai gateway. Fonnte akan meneruskan pesan dari nomor bot ke webhook aplikasi.

### 6.1 Daftar & Setup Akun Fonnte

1. Buka https://fonnte.com dan daftar akun
2. Masuk ke dashboard Fonnte
3. Beli nomor WhatsApp bot atau hubungkan nomor WhatsApp pribadi melalui **"Device"** di sidebar
4. Scan QR Code yang muncul menggunakan WhatsApp HP → **Perangkat Tertaut** → **Tautkan Perangkat**
5. Setelah terhubung, status device akan berubah menjadi **"Connected"**

### 6.2 Ambil API Token

1. Di dashboard Fonnte, klik menu **"Device"**
2. Klik device yang sudah terhubung
3. Salin **"Token"** (string panjang) — ini untuk environment variable `FONNTE_TOKEN`

### 6.3 Set Webhook di Fonnte

Setiap kali ada pesan masuk, Fonnte perlu tahu harus dikirim ke mana.

1. Di dashboard Fonnte, klik menu **"Webhook"**
2. Pada field **"Endpoint URL"**, isi dengan:
   ```
   https://domain-anda.netlify.app/api/whatsapp/webhook
   ```
   > Ganti `domain-anda.netlify.app` dengan URL Netlify kamu
   
3. Pilih metode **"POST"**
4. Klik **"Save"**

### 6.4 Test Webhook (Verifikasi)

1. Di halaman webhook Fonnte, klik **"Send Test"**
2. Aplikasi harus merespon dengan `OK`

### 6.5 Tambahkan Environment Variable

Tambahkan ke `.env.local` (development) dan Netlify env vars (production):

```env
# Fonnte WhatsApp Gateway
FONNTE_TOKEN=5Twsj1YU5xqNAVTbV18c
WHATSAPP_BOT_NUMBER=6281818655223
```

- `FONNTE_TOKEN` → Token dari dashboard Fonnte (langkah 6.2)
- `WHATSAPP_BOT_NUMBER` → Nomor WhatsApp bot (opsional, untuk tampilan di halaman status)

### 6.6 Cara Kerja

```
User WA → kirim "Beli kopi 25rb" ke nomor Bot
    ↓
Fonnte terima → kirim POST ke webhook `/api/whatsapp/webhook`
    ↓
Aplikasi cari/auto-create user berdasarkan nomor HP pengirim
    ↓
AI (Gemini/Groq) parse pesan → simpan transaksi ke database
    ↓
Kirim balasan konfirmasi via Fonnte API → user dapat reply di WA
```

**Tidak perlu pairing/daftar OTP.** Cukup daftar di web dengan nomor WA, lalu kirim pesan ke nomor bot.

---

## Langkah 7: Install Netlify Plugin

Install plugin Next.js untuk Netlify:

```bash
npm install -D @netlify/plugin-nextjs
```

File `netlify.toml` sudah dikonfigurasi untuk ini.

---

## Verifikasi Deployment

Setelah deploy berhasil:
1. ✅ Coba akses URL Netlify Anda → harus redirect ke `/login`
2. ✅ Daftar akun baru dengan kode rahasia → harus berhasil
3. ✅ Login dengan akun yang baru dibuat → harus masuk ke dashboard
4. ✅ Coba scan struk → harus berjalan normal
5. ✅ Coba akses `/api/analyze` langsung tanpa login → harus dapat `401 Unauthorized`

---

## Troubleshooting

**Error: `Missing Supabase environment variables`**
→ Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di Netlify env vars

**Error: JWT verification failed**
→ Pastikan `JWT_SECRET` sudah di-set dan tidak berubah setelah user login

**Build error di Netlify**
→ Pastikan `@netlify/plugin-nextjs` terinstall: `npm install -D @netlify/plugin-nextjs`
