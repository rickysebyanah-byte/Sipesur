-- ====================================================================
-- SIPESUR - Setup Lengkap Supabase (Schema + Seed + RLS off + RPC)
-- Jalankan seluruh file ini di:
--   Dashboard Supabase > SQL Editor > New Query > Paste > Run All
-- ====================================================================

-- ================================================================
-- 1. SCHEMA
-- ================================================================
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

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  username VARCHAR(60) UNIQUE,
  nip VARCHAR(30) UNIQUE,
  jabatan VARCHAR(100),
  telepon VARCHAR(20),
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'warga'
    CHECK (role IN ('warga','petugas','lurah','admin')),
  status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi'
    CHECK (status_verifikasi IN ('menunggu_verifikasi','terverifikasi','ditolak')),
  catatan_verifikasi TEXT,
  diverifikasi_oleh INT REFERENCES users(id) ON DELETE SET NULL,
  diverifikasi_at TIMESTAMPTZ,
  must_change_password SMALLINT NOT NULL DEFAULT 0,
  aktif SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warga (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nik VARCHAR(16) UNIQUE NOT NULL,
  no_kk VARCHAR(16) NOT NULL,
  tempat_lahir VARCHAR(60),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(5) CHECK (jenis_kelamin IN ('L','P')),
  alamat TEXT,
  pekerjaan VARCHAR(60),
  telepon VARCHAR(20)
);

CREATE TABLE jenis_surat (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  template TEXT,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  aktif SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE persyaratan (
  id SERIAL PRIMARY KEY,
  jenis_surat_id INT NOT NULL REFERENCES jenis_surat(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL
);

CREATE TABLE pengajuan (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id),
  jenis_surat_id INT NOT NULL REFERENCES jenis_surat(id),
  data_form JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','revision_required',
                      'pending_approval','rejected','approved','issued')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pengajuan_updated_at ON pengajuan;
CREATE TRIGGER trg_pengajuan_updated_at
  BEFORE UPDATE ON pengajuan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE dokumen (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  persyaratan_id INT NOT NULL REFERENCES persyaratan(id),
  nama_file VARCHAR(200),
  path VARCHAR(255),
  mime VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verifikasi (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  petugas_id INT NOT NULL REFERENCES users(id),
  hasil VARCHAR(20) NOT NULL CHECK (hasil IN ('lengkap','revisi','ditolak')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE persetujuan (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  lurah_id INT NOT NULL REFERENCES users(id),
  hasil VARCHAR(20) NOT NULL CHECK (hasil IN ('setuju','tolak')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE surat (
  id SERIAL PRIMARY KEY,
  pengajuan_id INT UNIQUE NOT NULL REFERENCES pengajuan(id),
  nomor VARCHAR(60) UNIQUE NOT NULL,
  kode_verifikasi VARCHAR(40) UNIQUE NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  petugas_id INT NOT NULL REFERENCES users(id),
  terbit_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifikasi (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pesan VARCHAR(255) NOT NULL,
  dibaca SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  aksi VARCHAR(60) NOT NULL,
  detail VARCHAR(255),
  ip VARCHAR(60),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_nip ON users(nip);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status_verifikasi);
CREATE INDEX IF NOT EXISTS idx_warga_nik ON warga(nik);
CREATE INDEX IF NOT EXISTS idx_warga_no_kk ON warga(no_kk);
CREATE INDEX IF NOT EXISTS idx_pengajuan_user ON pengajuan(user_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_status ON pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user ON notifikasi(user_id);
CREATE INDEX IF NOT EXISTS idx_surat_kode ON surat(kode_verifikasi);

-- ================================================================
-- 2. NONAKTIFKAN ROW LEVEL SECURITY (agar backend bisa akses via REST)
-- ================================================================
ALTER TABLE users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE warga          DISABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_surat    DISABLE ROW LEVEL SECURITY;
ALTER TABLE persyaratan    DISABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan      DISABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen        DISABLE ROW LEVEL SECURITY;
ALTER TABLE verifikasi     DISABLE ROW LEVEL SECURITY;
ALTER TABLE persetujuan    DISABLE ROW LEVEL SECURITY;
ALTER TABLE surat          DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi     DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- 3. FUNGSI RPC: Eksekusi SQL Arbitrary via REST API
--    Digunakan oleh backend Node.js sebagai pengganti koneksi pg langsung
-- ================================================================
CREATE OR REPLACE FUNCTION sipesur_exec(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  param_array text[];
  i int;
  n int;
BEGIN
  -- Konversi params jsonb array → text array untuk EXECUTE
  n := jsonb_array_length(params);
  param_array := ARRAY[]::text[];
  FOR i IN 0..n-1 LOOP
    IF jsonb_typeof(params->i) = 'null' THEN
      param_array := array_append(param_array, NULL);
    ELSE
      param_array := array_append(param_array, (params->>i)::text);
    END IF;
  END LOOP;

  -- Jalankan query dan kembalikan hasil sebagai JSON
  BEGIN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t'
    INTO result
    USING param_array[1], param_array[2], param_array[3], param_array[4],
          param_array[5], param_array[6], param_array[7], param_array[8],
          param_array[9], param_array[10], param_array[11], param_array[12];
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL Error: % | Query: %', SQLERRM, left(query, 200);
  END;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Fungsi khusus untuk INSERT yang butuh RETURNING id
CREATE OR REPLACE FUNCTION sipesur_insert(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  param_array text[];
  i int;
  n int;
  insert_query text;
BEGIN
  n := jsonb_array_length(params);
  param_array := ARRAY[]::text[];
  FOR i IN 0..n-1 LOOP
    IF jsonb_typeof(params->i) = 'null' THEN
      param_array := array_append(param_array, NULL);
    ELSE
      param_array := array_append(param_array, (params->>i)::text);
    END IF;
  END LOOP;

  -- Tambah RETURNING id jika belum ada
  insert_query := query;
  IF position('RETURNING' IN upper(query)) = 0 THEN
    insert_query := query || ' RETURNING id';
  END IF;

  BEGIN
    EXECUTE 'WITH t AS (' || insert_query || ') SELECT jsonb_agg(row_to_json(t)) FROM t'
    INTO result
    USING param_array[1], param_array[2], param_array[3], param_array[4],
          param_array[5], param_array[6], param_array[7], param_array[8],
          param_array[9], param_array[10], param_array[11], param_array[12];
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL Error: % | Query: %', SQLERRM, left(query, 200);
  END;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Fungsi untuk UPDATE/DELETE (kembalikan rowcount)
CREATE OR REPLACE FUNCTION sipesur_mutate(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  param_array text[];
  i int;
  n int;
  rc int;
BEGIN
  n := jsonb_array_length(params);
  param_array := ARRAY[]::text[];
  FOR i IN 0..n-1 LOOP
    IF jsonb_typeof(params->i) = 'null' THEN
      param_array := array_append(param_array, NULL);
    ELSE
      param_array := array_append(param_array, (params->>i)::text);
    END IF;
  END LOOP;

  BEGIN
    EXECUTE query
    USING param_array[1], param_array[2], param_array[3], param_array[4],
          param_array[5], param_array[6], param_array[7], param_array[8],
          param_array[9], param_array[10], param_array[11], param_array[12];
    GET DIAGNOSTICS rc = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL Error: % | Query: %', SQLERRM, left(query, 200);
  END;

  RETURN jsonb_build_object('rowCount', rc, 'affectedRows', rc);
END;
$$;

-- Grant eksekusi ke anon dan authenticated role
GRANT EXECUTE ON FUNCTION sipesur_exec(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sipesur_insert(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sipesur_mutate(text, jsonb) TO anon, authenticated;

-- ================================================================
-- 4. SEED DATA (password semua akun: Password123)
-- ================================================================
INSERT INTO users (nama,email,username,nip,jabatan,telepon,password,role,status_verifikasi,must_change_password,aktif) VALUES
('Admin Kelurahan','admin@sipesur.test','admin','198001012005011001','Administrator Sistem','081234567890',
 '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W','admin','terverifikasi',0,1),
('Siti Rohmah, S.AP','petugas@sipesur.test','petugas','198505122010012003','Petugas Pelayanan Administrasi','081234567891',
 '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W','petugas','terverifikasi',0,1),
('Drs. Hadi Purnomo, M.Si','lurah@sipesur.test','lurah','197503151998031004','Lurah Sukamaju','081234567892',
 '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W','lurah','terverifikasi',0,1),
('Budi Santoso','warga@sipesur.test','3201010101900001',NULL,NULL,'081200000001',
 '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W','warga','terverifikasi',0,1),
('Ahmad Pratama','ahmad.pratama@gmail.com','3201010202950001',NULL,NULL,'081200000002',
 '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W','warga','menunggu_verifikasi',0,1);

INSERT INTO warga (user_id,nik,no_kk,tempat_lahir,tanggal_lahir,jenis_kelamin,alamat,pekerjaan,telepon)
SELECT id,'3201010101900001','3201010101900002','Bandung','1990-01-01','L',
       'Jl. Melati No. 5 RT 02/RW 03, Sukamaju','Karyawan Swasta','081200000001'
FROM users WHERE username='3201010101900001';

INSERT INTO warga (user_id,nik,no_kk,tempat_lahir,tanggal_lahir,jenis_kelamin,alamat,pekerjaan,telepon)
SELECT id,'3201010202950001','3201010202950002','Jakarta','1995-02-02','L',
       'Jl. Mawar No. 12 RT 01/RW 04, Sukamaju','Wiraswasta','081200000002'
FROM users WHERE username='3201010202950001';

INSERT INTO jenis_surat (kode,nama,template,form_fields,aktif) VALUES
('SKD','Surat Keterangan Domisili','Orang tersebut benar berdomisili di wilayah Kelurahan Sukamaju.',
 '[{"name":"alamat_domisili","label":"Alamat Domisili"},{"name":"lama_tinggal","label":"Lama Tinggal"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,1),
('SKTM','Surat Keterangan Tidak Mampu','Orang tersebut benar tergolong keluarga kurang mampu.',
 '[{"name":"penghasilan","label":"Penghasilan per Bulan"},{"name":"jumlah_tanggungan","label":"Jumlah Tanggungan"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,1),
('SKCK','Surat Pengantar SKCK','Orang tersebut berkelakuan baik dan diberi pengantar untuk pengurusan SKCK.',
 '[{"name":"agama","label":"Agama"},{"name":"status_perkawinan","label":"Status Perkawinan"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,1),
('SKU','Surat Keterangan Usaha','Orang tersebut benar memiliki usaha di wilayah Kelurahan Sukamaju.',
 '[{"name":"nama_usaha","label":"Nama Usaha"},{"name":"jenis_usaha","label":"Jenis Usaha"},{"name":"alamat_usaha","label":"Alamat Usaha"},{"name":"lama_usaha","label":"Lama Usaha"}]'::jsonb,1),
('SKLH','Surat Keterangan Kelahiran','Telah terjadi kelahiran sebagaimana data di atas.',
 '[{"name":"nama_bayi","label":"Nama Bayi"},{"name":"tempat_lahir_bayi","label":"Tempat Lahir Bayi"},{"name":"tanggal_lahir_bayi","label":"Tanggal Lahir Bayi"},{"name":"nama_ayah","label":"Nama Ayah"},{"name":"nama_ibu","label":"Nama Ibu"}]'::jsonb,1),
('SKM','Surat Keterangan Kematian','Telah terjadi kematian sebagaimana data di atas.',
 '[{"name":"nama_almarhum","label":"Nama Almarhum"},{"name":"nik_almarhum","label":"NIK Almarhum"},{"name":"tanggal_meninggal","label":"Tanggal Meninggal"},{"name":"penyebab","label":"Penyebab"},{"name":"hubungan_pelapor","label":"Hubungan Pelapor"}]'::jsonb,1),
('SKBM','Surat Keterangan Belum Menikah','Orang tersebut sampai saat ini belum pernah menikah.',
 '[{"name":"agama","label":"Agama"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,1),
('SPP','Surat Pengantar Pindah','Orang tersebut bermaksud pindah domisili sebagaimana data di atas.',
 '[{"name":"alamat_tujuan","label":"Alamat Tujuan"},{"name":"alasan_pindah","label":"Alasan Pindah"},{"name":"jumlah_pengikut","label":"Jumlah Pengikut"}]'::jsonb,1);

INSERT INTO persyaratan (jenis_surat_id,nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKD'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKD'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKD'),'Surat Pengantar RT/RW'),
((SELECT id FROM jenis_surat WHERE kode='SKTM'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKTM'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKTM'),'Surat Pengantar RT/RW'),
((SELECT id FROM jenis_surat WHERE kode='SKCK'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKCK'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKCK'),'Pas Foto'),
((SELECT id FROM jenis_surat WHERE kode='SKU'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKU'),'Foto Tempat Usaha'),
((SELECT id FROM jenis_surat WHERE kode='SKU'),'Surat Pengantar RT/RW'),
((SELECT id FROM jenis_surat WHERE kode='SKLH'),'KTP Pelapor'),
((SELECT id FROM jenis_surat WHERE kode='SKLH'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKLH'),'Surat Keterangan Lahir (Bidan/RS)'),
((SELECT id FROM jenis_surat WHERE kode='SKM'),'KTP Pelapor'),
((SELECT id FROM jenis_surat WHERE kode='SKM'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKM'),'Surat Keterangan Kematian (RS/RT)'),
((SELECT id FROM jenis_surat WHERE kode='SKBM'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKBM'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKBM'),'Surat Pengantar RT/RW'),
((SELECT id FROM jenis_surat WHERE kode='SPP'),'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SPP'),'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SPP'),'Pas Foto');

-- ================================================================
-- 5. VERIFIKASI
-- ================================================================
SELECT 'SIPESUR database siap!' AS status,
  (SELECT COUNT(*) FROM users)::int AS users,
  (SELECT COUNT(*) FROM warga)::int AS warga,
  (SELECT COUNT(*) FROM jenis_surat)::int AS jenis_surat,
  (SELECT COUNT(*) FROM persyaratan)::int AS persyaratan;
