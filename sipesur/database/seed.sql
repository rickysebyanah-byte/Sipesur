-- ====================================================================
-- SIPESUR - Seed Data untuk Supabase SQL Editor
-- Password semua akun: Password123
-- Jalankan file ini di: Supabase Dashboard > SQL Editor > New Query
-- ====================================================================

-- Bersihkan data lama (urutan sesuai FK)
TRUNCATE TABLE activity_logs, notifikasi, surat, persetujuan, verifikasi, dokumen, pengajuan, persyaratan, jenis_surat, warga, users RESTART IDENTITY CASCADE;

-- ============================================================
-- AKUN PENGGUNA
-- password: Password123 (bcrypt hash)
-- ============================================================
INSERT INTO users (nama, email, username, nip, jabatan, telepon, password, role, status_verifikasi, must_change_password, aktif) VALUES
(
  'Admin Kelurahan',
  'admin@sipesur.test',
  'admin',
  '198001012005011001',
  'Administrator Sistem',
  '081234567890',
  '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W',
  'admin',
  'terverifikasi',
  0,
  1
),
(
  'Siti Rohmah, S.AP',
  'petugas@sipesur.test',
  'petugas',
  '198505122010012003',
  'Petugas Pelayanan Administrasi',
  '081234567891',
  '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W',
  'petugas',
  'terverifikasi',
  0,
  1
),
(
  'Drs. Hadi Purnomo, M.Si',
  'lurah@sipesur.test',
  'lurah',
  '197503151998031004',
  'Lurah Sukamaju',
  '081234567892',
  '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W',
  'lurah',
  'terverifikasi',
  0,
  1
),
(
  'Budi Santoso',
  'warga@sipesur.test',
  '3201010101900001',
  NULL,
  NULL,
  '081200000001',
  '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W',
  'warga',
  'terverifikasi',
  0,
  1
),
(
  'Ahmad Pratama',
  'ahmad.pratama@gmail.com',
  '3201010202950001',
  NULL,
  NULL,
  '081200000002',
  '$2a$10$fop9mOwiRNzSlxn31y5Hf.edXRoDUndD9IhVf5OhC8X3215F5QU2W',
  'warga',
  'menunggu_verifikasi',
  0,
  1
);

-- ============================================================
-- DATA WARGA
-- ============================================================
INSERT INTO warga (user_id, nik, no_kk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, pekerjaan, telepon)
SELECT id, '3201010101900001', '3201010101900002', 'Bandung', '1990-01-01', 'L',
  'Jl. Melati No. 5 RT 02/RW 03, Sukamaju', 'Karyawan Swasta', '081200000001'
FROM users WHERE username = '3201010101900001';

INSERT INTO warga (user_id, nik, no_kk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, pekerjaan, telepon)
SELECT id, '3201010202950001', '3201010202950002', 'Jakarta', '1995-02-02', 'L',
  'Jl. Mawar No. 12 RT 01/RW 04, Sukamaju', 'Wiraswasta', '081200000002'
FROM users WHERE username = '3201010202950001';

-- ============================================================
-- JENIS SURAT & PERSYARATAN
-- ============================================================

-- SKD: Surat Keterangan Domisili
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKD', 'Surat Keterangan Domisili',
 'Orang tersebut benar berdomisili di wilayah Kelurahan Sukamaju.',
 '[{"name":"alamat_domisili","label":"Alamat Domisili"},{"name":"lama_tinggal","label":"Lama Tinggal"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKD'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKD'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKD'), 'Surat Pengantar RT/RW');

-- SKTM: Surat Keterangan Tidak Mampu
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKTM', 'Surat Keterangan Tidak Mampu',
 'Orang tersebut benar tergolong keluarga kurang mampu.',
 '[{"name":"penghasilan","label":"Penghasilan per Bulan"},{"name":"jumlah_tanggungan","label":"Jumlah Tanggungan"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKTM'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKTM'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKTM'), 'Surat Pengantar RT/RW');

-- SKCK: Surat Pengantar SKCK
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKCK', 'Surat Pengantar SKCK',
 'Orang tersebut berkelakuan baik dan diberi pengantar untuk pengurusan SKCK.',
 '[{"name":"agama","label":"Agama"},{"name":"status_perkawinan","label":"Status Perkawinan"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKCK'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKCK'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKCK'), 'Pas Foto');

-- SKU: Surat Keterangan Usaha
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKU', 'Surat Keterangan Usaha',
 'Orang tersebut benar memiliki usaha di wilayah Kelurahan Sukamaju.',
 '[{"name":"nama_usaha","label":"Nama Usaha"},{"name":"jenis_usaha","label":"Jenis Usaha"},{"name":"alamat_usaha","label":"Alamat Usaha"},{"name":"lama_usaha","label":"Lama Usaha"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKU'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKU'), 'Foto Tempat Usaha'),
((SELECT id FROM jenis_surat WHERE kode='SKU'), 'Surat Pengantar RT/RW');

-- SKLH: Surat Keterangan Kelahiran
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKLH', 'Surat Keterangan Kelahiran',
 'Telah terjadi kelahiran sebagaimana data di atas.',
 '[{"name":"nama_bayi","label":"Nama Bayi"},{"name":"tempat_lahir_bayi","label":"Tempat Lahir Bayi"},{"name":"tanggal_lahir_bayi","label":"Tanggal Lahir Bayi"},{"name":"nama_ayah","label":"Nama Ayah"},{"name":"nama_ibu","label":"Nama Ibu"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKLH'), 'KTP Pelapor'),
((SELECT id FROM jenis_surat WHERE kode='SKLH'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKLH'), 'Surat Keterangan Lahir (Bidan/RS)');

-- SKM: Surat Keterangan Kematian
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKM', 'Surat Keterangan Kematian',
 'Telah terjadi kematian sebagaimana data di atas.',
 '[{"name":"nama_almarhum","label":"Nama Almarhum"},{"name":"nik_almarhum","label":"NIK Almarhum"},{"name":"tanggal_meninggal","label":"Tanggal Meninggal"},{"name":"penyebab","label":"Penyebab"},{"name":"hubungan_pelapor","label":"Hubungan Pelapor"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKM'), 'KTP Pelapor'),
((SELECT id FROM jenis_surat WHERE kode='SKM'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKM'), 'Surat Keterangan Kematian (RS/RT)');

-- SKBM: Surat Keterangan Belum Menikah
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SKBM', 'Surat Keterangan Belum Menikah',
 'Orang tersebut sampai saat ini belum pernah menikah.',
 '[{"name":"agama","label":"Agama"},{"name":"keperluan","label":"Keperluan"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SKBM'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SKBM'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SKBM'), 'Surat Pengantar RT/RW');

-- SPP: Surat Pengantar Pindah
INSERT INTO jenis_surat (kode, nama, template, form_fields, aktif) VALUES
('SPP', 'Surat Pengantar Pindah',
 'Orang tersebut bermaksud pindah domisili sebagaimana data di atas.',
 '[{"name":"alamat_tujuan","label":"Alamat Tujuan"},{"name":"alasan_pindah","label":"Alasan Pindah"},{"name":"jumlah_pengikut","label":"Jumlah Pengikut"}]'::jsonb,
 1);
INSERT INTO persyaratan (jenis_surat_id, nama) VALUES
((SELECT id FROM jenis_surat WHERE kode='SPP'), 'KTP'),
((SELECT id FROM jenis_surat WHERE kode='SPP'), 'Kartu Keluarga'),
((SELECT id FROM jenis_surat WHERE kode='SPP'), 'Pas Foto');

-- ============================================================
-- VERIFIKASI HASIL
-- ============================================================
SELECT 'Seed berhasil!' AS status;
SELECT 'users' AS tabel, COUNT(*) AS jumlah FROM users
UNION ALL SELECT 'warga', COUNT(*) FROM warga
UNION ALL SELECT 'jenis_surat', COUNT(*) FROM jenis_surat
UNION ALL SELECT 'persyaratan', COUNT(*) FROM persyaratan;
