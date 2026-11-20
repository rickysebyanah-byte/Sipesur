-- ====================================================================
-- SIPESUR (Sistem Informasi Pelayanan Surat Kelurahan)
-- Database Schema for Supabase / PostgreSQL
-- ====================================================================

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS notifikasi CASCADE;
DROP TABLE IF EXISTS surat CASCADE;
DROP TABLE IF EXISTS persetujuan CASCADE;
DROP TABLE IF EXISTS verifikasi CASCADE;
DROP TABLE IF EXISTS dokumen CASCADE;
DROP TABLE IF EXISTS pengajuan CASCADE;
DROP TABLE IF EXISTS persyaratan CASCADE;
DROP TABLE IF EXISTS jenis_surat CASCADE;
DROP TABLE IF EXISTS warga CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabel users (Akun Warga, Petugas, Lurah, Admin)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  username VARCHAR(60) UNIQUE,
  nip VARCHAR(30) UNIQUE,
  jabatan VARCHAR(100),
  telepon VARCHAR(20),
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'warga' CHECK (role IN ('warga', 'petugas', 'lurah', 'admin')),
  status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi' CHECK (status_verifikasi IN ('menunggu_verifikasi', 'terverifikasi', 'ditolak')),
  catatan_verifikasi TEXT,
  diverifikasi_oleh INT REFERENCES users(id) ON DELETE SET NULL,
  diverifikasi_at TIMESTAMPTZ,
  must_change_password SMALLINT NOT NULL DEFAULT 0,
  aktif SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel profil warga lengkap
CREATE TABLE warga (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nik VARCHAR(16) UNIQUE NOT NULL,
  no_kk VARCHAR(16) NOT NULL,
  tempat_lahir VARCHAR(60),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(5) CHECK (jenis_kelamin IN ('L', 'P')),
  alamat TEXT,
  pekerjaan VARCHAR(60),
  telepon VARCHAR(20)
);

-- 3. Tabel jenis surat kelurahan
CREATE TABLE jenis_surat (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  template TEXT,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  aktif SMALLINT NOT NULL DEFAULT 1
);

-- 4. Tabel dokumen persyaratan tiap jenis surat
CREATE TABLE persyaratan (
  id SERIAL PRIMARY KEY,
  jenis_surat_id INT NOT NULL REFERENCES jenis_surat(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL
);

-- 5. Tabel pengajuan permohonan surat
CREATE TABLE pengajuan (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id),
  jenis_surat_id INT NOT NULL REFERENCES jenis_surat(id),
  data_form JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'under_review',
    'revision_required',
    'pending_approval',
    'rejected',
    'approved',
    'issued'
  )),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger untuk update updated_at otomatis pada tabel pengajuan
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pengajuan_updated_at ON pengajuan;
CREATE TRIGGER trigger_pengajuan_updated_at
BEFORE UPDATE ON pengajuan
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 6. Tabel berkas dokumen yang diunggah pemohon
CREATE TABLE dokumen (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  persyaratan_id INT NOT NULL REFERENCES persyaratan(id),
  nama_file VARCHAR(200),
  path VARCHAR(255),
  mime VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel riwayat verifikasi berkas oleh petugas
CREATE TABLE verifikasi (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  petugas_id INT NOT NULL REFERENCES users(id),
  hasil VARCHAR(20) NOT NULL CHECK (hasil IN ('lengkap', 'revisi', 'ditolak')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel riwayat persetujuan oleh Lurah
CREATE TABLE persetujuan (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  lurah_id INT NOT NULL REFERENCES users(id),
  hasil VARCHAR(20) NOT NULL CHECK (hasil IN ('setuju', 'tolak')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel surat resmi yang telah diterbitkan
CREATE TABLE surat (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT UNIQUE NOT NULL REFERENCES pengajuan(id),
  nomor VARCHAR(60) UNIQUE NOT NULL,
  kode_verifikasi VARCHAR(40) UNIQUE NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  petugas_id INT NOT NULL REFERENCES users(id),
  terbit_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel notifikasi pengguna
CREATE TABLE notifikasi (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pesan VARCHAR(255) NOT NULL,
  dibaca SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabel log aktivitas audit sistem
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  aksi VARCHAR(60) NOT NULL,
  detail VARCHAR(255),
  ip VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indeks untuk performa query
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_nip ON users(nip);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status_verifikasi ON users(status_verifikasi);
CREATE INDEX IF NOT EXISTS idx_warga_nik ON warga(nik);
CREATE INDEX IF NOT EXISTS idx_warga_no_kk ON warga(no_kk);
CREATE INDEX IF NOT EXISTS idx_pengajuan_user ON pengajuan(user_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_status ON pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user ON notifikasi(user_id);
CREATE INDEX IF NOT EXISTS idx_surat_kode_verifikasi ON surat(kode_verifikasi);
