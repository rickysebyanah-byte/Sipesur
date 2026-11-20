# SIPESUR

Sistem Informasi Pelayanan Surat Kelurahan. Warga mengajukan surat keterangan, petugas memeriksa, lurah mengesahkan, dan surat terbit sebagai PDF dengan kode QR.

Satu repositori berisi semuanya:

```
api/        pintu masuk fungsi Vercel (memanggil server/)
server/     Express: rute API, PDF, akses database
src/        React: halaman dan komponen
database/   skema SQL dan data awal
```

Stack: React + Vite + Tailwind CSS, Express, Supabase (PostgreSQL), JWT, PDFKit.

## Menjalankan di komputer (Windows)

```
copy .env.example .env
npm install
npm run dev
```

Isi `.env` dulu (lihat bagian berikutnya). Aplikasi terbuka di http://localhost:5173, API berjalan di port 5000.

## Menyiapkan database (sekali saja)

1. Buka Supabase, masuk ke SQL Editor, jalankan isi `database/setup_supabase.sql`.
2. Isi `SUPABASE_URL` dan `SUPABASE_KEY` di `.env`.
3. Jalankan `npm run setup:db` untuk membuat tabel dan akun uji coba.

## Deploy ke GitHub dan Vercel

```
git add .
git commit -m "Gabungkan frontend dan backend"
git push
```

Di Vercel, impor repositori ini. Biarkan Root Directory kosong dan Framework Preset `Vite`. Isi Environment Variables:

| Nama | Isi |
|---|---|
| `JWT_SECRET` | string acak panjang |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_KEY` | API key Supabase |

`CLIENT_URL` tidak perlu diisi di Vercel; tautan QR memakai domain produksi otomatis.

Berkas di Vercel tidak permanen: lampiran yang diunggah warga dan PDF disimpan di folder sementara. PDF surat dibuat ulang otomatis saat diunduh, tetapi lampiran tidak bisa dipulihkan. Untuk penggunaan sungguhan, pindahkan penyimpanan lampiran ke Supabase Storage.

## Akun uji coba

Password semua akun: `Password123`

| Peran | Login |
|---|---|
| Admin | `admin` |
| Petugas | `petugas` atau `198505122010012003` |
| Lurah | `lurah` atau `197503151998031004` |
| Warga terverifikasi | `3201010101900001` |
| Warga menunggu verifikasi | `3201010202950001` |

## Peran

- Warga: daftar, mengajukan surat, memantau status, mengunduh surat terbit.
- Petugas: memverifikasi akun warga, memeriksa pengajuan, mengelola surat masuk dan keluar.
- Lurah: menyetujui atau menolak surat, membuat surat keluar, disposisi.
- Admin: kelola pengguna, jenis surat, dan lihat log aktivitas. Akun kedinasan hanya dibuat admin.
