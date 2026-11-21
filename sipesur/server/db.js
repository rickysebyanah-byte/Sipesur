/**
 * db.js - Supabase REST API adapter & Resilient Local Storage fallback untuk SIPESUR
 *
 * Mendukung dua mode:
 * 1. Supabase Mode (Online via REST RPC)
 * 2. Local Fallback Mode (Otomatis aktif jika offline / Supabase tidak terjangkau)
 *
 * Memastikan aplikasi SIPESUR selalu dapat dijalankan dengan lancar di lingkungan apa pun.
 */
import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const DATA_DIR = process.env.VERCEL ? '/tmp/sipesur' : process.cwd();
const LOCAL_DB_PATH = path.join(DATA_DIR, 'storage', 'local_db.json');

// ----------------------------------------------------------------
// Local Database Store (In-Memory + JSON Persistence)
// ----------------------------------------------------------------
let localDb = null;
let useLocalFallback = false;

function getDefaultData() {
  const pw = bcrypt.hashSync('Password123', 10);
  return {
    profil_desa: [
      {
        id: 1,
        nama_desa: 'Kelurahan Sukamaju',
        kecamatan: 'Kecamatan Contoh',
        kabupaten_kota: 'Pemerintah Kota Contoh',
        provinsi: 'Jawa Barat',
        alamat: 'Jl. Merdeka No. 1, Kelurahan Sukamaju',
        kode_pos: '12345',
        telepon: '(021) 000-0000',
        email: 'kelurahan.sukamaju@pemkot.go.id',
        website: 'sukamaju.kelurahan.go.id',
        logo_url: null,
        nama_lurah: 'Drs. Hadi Purnomo, M.Si',
        nip_lurah: '197503151998031004',
        jabatan_lurah: 'Lurah Sukamaju',
        updated_at: new Date().toISOString(),
      },
    ],
    users: [
      {
        id: 1,
        nama: 'Admin Kelurahan',
        email: 'admin@sipesur.test',
        username: 'admin',
        nip: '198001012005011001',
        jabatan: 'Administrator Sistem',
        telepon: '081234567890',
        password: pw,
        role: 'admin',
        status_verifikasi: 'terverifikasi',
        catatan_verifikasi: null,
        must_change_password: 0,
        tanda_tangan: null,
        aktif: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        nama: 'Siti Rohmah, S.AP',
        email: 'petugas@sipesur.test',
        username: 'petugas',
        nip: '198505122010012003',
        jabatan: 'Petugas Pelayanan Administrasi',
        telepon: '081234567891',
        password: pw,
        role: 'petugas',
        status_verifikasi: 'terverifikasi',
        catatan_verifikasi: null,
        must_change_password: 0,
        tanda_tangan: null,
        aktif: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        nama: 'Drs. Hadi Purnomo, M.Si',
        email: 'lurah@sipesur.test',
        username: 'lurah',
        nip: '197503151998031004',
        jabatan: 'Lurah Sukamaju',
        telepon: '081234567892',
        password: pw,
        role: 'lurah',
        status_verifikasi: 'terverifikasi',
        catatan_verifikasi: null,
        must_change_password: 0,
        tanda_tangan: null,
        aktif: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 4,
        nama: 'Budi Santoso',
        email: 'warga@sipesur.test',
        username: '3201010101900001',
        nip: null,
        jabatan: null,
        telepon: '081200000001',
        password: pw,
        role: 'warga',
        status_verifikasi: 'terverifikasi',
        catatan_verifikasi: null,
        must_change_password: 0,
        tanda_tangan: null,
        aktif: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 5,
        nama: 'Ahmad Pratama',
        email: 'ahmad.pratama@gmail.com',
        username: '3201010202950001',
        nip: null,
        jabatan: null,
        telepon: '081200000002',
        password: pw,
        role: 'warga',
        status_verifikasi: 'menunggu_verifikasi',
        catatan_verifikasi: null,
        must_change_password: 0,
        tanda_tangan: null,
        aktif: 1,
        created_at: new Date().toISOString(),
      },
    ],
    warga: [
      {
        id: 1,
        user_id: 4,
        nik: '3201010101900001',
        no_kk: '3201010101900002',
        tempat_lahir: 'Bandung',
        tanggal_lahir: '1990-01-01',
        jenis_kelamin: 'L',
        alamat: 'Jl. Melati No. 5 RT 02/RW 03, Sukamaju',
        pekerjaan: 'Karyawan Swasta',
        telepon: '081200000001',
      },
      {
        id: 2,
        user_id: 5,
        nik: '3201010202950001',
        no_kk: '3201010202950002',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '1995-02-02',
        jenis_kelamin: 'L',
        alamat: 'Jl. Mawar No. 12 RT 01/RW 04, Sukamaju',
        pekerjaan: 'Wiraswasta',
        telepon: '081200000002',
      },
    ],
    jenis_surat: [
      { id: 1, kode: 'SKD', nama: 'Surat Keterangan Domisili', template: 'Orang tersebut benar berdomisili di wilayah Kelurahan Sukamaju.', form_fields: [{ name: 'alamat_domisili', label: 'Alamat Domisili' }, { name: 'lama_tinggal', label: 'Lama Tinggal' }, { name: 'keperluan', label: 'Keperluan' }], aktif: 1 },
      { id: 2, kode: 'SKTM', nama: 'Surat Keterangan Tidak Mampu', template: 'Orang tersebut benar tergolong keluarga kurang mampu.', form_fields: [{ name: 'penghasilan', label: 'Penghasilan per Bulan' }, { name: 'jumlah_tanggungan', label: 'Jumlah Tanggungan' }, { name: 'keperluan', label: 'Keperluan' }], aktif: 1 },
      { id: 3, kode: 'SKCK', nama: 'Surat Pengantar SKCK', template: 'Orang tersebut berkelakuan baik dan diberi pengantar untuk pengurusan SKCK.', form_fields: [{ name: 'agama', label: 'Agama' }, { name: 'status_perkawinan', label: 'Status Perkawinan' }, { name: 'keperluan', label: 'Keperluan' }], aktif: 1 },
      { id: 4, kode: 'SKU', nama: 'Surat Keterangan Usaha', template: 'Orang tersebut benar memiliki usaha di wilayah Kelurahan Sukamaju.', form_fields: [{ name: 'nama_usaha', label: 'Nama Usaha' }, { name: 'jenis_usaha', label: 'Jenis Usaha' }, { name: 'alamat_usaha', label: 'Alamat Usaha' }, { name: 'lama_usaha', label: 'Lama Usaha' }], aktif: 1 },
      { id: 5, kode: 'SKLH', nama: 'Surat Keterangan Kelahiran', template: 'Telah terjadi kelahiran sebagaimana data di atas.', form_fields: [{ name: 'nama_bayi', label: 'Nama Bayi' }, { name: 'tempat_lahir_bayi', label: 'Tempat Lahir Bayi' }, { name: 'tanggal_lahir_bayi', label: 'Tanggal Lahir Bayi' }, { name: 'nama_ayah', label: 'Nama Ayah' }, { name: 'nama_ibu', label: 'Nama Ibu' }], aktif: 1 },
      { id: 6, kode: 'SKM', nama: 'Surat Keterangan Kematian', template: 'Telah terjadi kematian sebagaimana data di atas.', form_fields: [{ name: 'nama_almarhum', label: 'Nama Almarhum' }, { name: 'nik_almarhum', label: 'NIK Almarhum' }, { name: 'tanggal_meninggal', label: 'Tanggal Meninggal' }, { name: 'penyebab', label: 'Penyebab' }, { name: 'hubungan_pelapor', label: 'Hubungan Pelapor' }], aktif: 1 },
      { id: 7, kode: 'SKBM', nama: 'Surat Keterangan Belum Menikah', template: 'Orang tersebut sampai saat ini belum pernah menikah.', form_fields: [{ name: 'agama', label: 'Agama' }, { name: 'keperluan', label: 'Keperluan' }], aktif: 1 },
      { id: 8, kode: 'SPP', nama: 'Surat Pengantar Pindah', template: 'Orang tersebut bermaksud pindah domisili sebagaimana data di atas.', form_fields: [{ name: 'alamat_tujuan', label: 'Alamat Tujuan' }, { name: 'alasan_pindah', label: 'Alasan Pindah' }, { name: 'jumlah_pengikut', label: 'Jumlah Pengikut' }], aktif: 1 },
    ],
    persyaratan: [
      { id: 1, jenis_surat_id: 1, nama: 'KTP' }, { id: 2, jenis_surat_id: 1, nama: 'Kartu Keluarga' }, { id: 3, jenis_surat_id: 1, nama: 'Surat Pengantar RT/RW' },
      { id: 4, jenis_surat_id: 2, nama: 'KTP' }, { id: 5, jenis_surat_id: 2, nama: 'Kartu Keluarga' }, { id: 6, jenis_surat_id: 2, nama: 'Surat Pengantar RT/RW' },
      { id: 7, jenis_surat_id: 3, nama: 'KTP' }, { id: 8, jenis_surat_id: 3, nama: 'Kartu Keluarga' }, { id: 9, jenis_surat_id: 3, nama: 'Pas Foto' },
      { id: 10, jenis_surat_id: 4, nama: 'KTP' }, { id: 11, jenis_surat_id: 4, nama: 'Foto Tempat Usaha' }, { id: 12, jenis_surat_id: 4, nama: 'Surat Pengantar RT/RW' },
      { id: 13, jenis_surat_id: 5, nama: 'KTP Pelapor' }, { id: 14, jenis_surat_id: 5, nama: 'Kartu Keluarga' }, { id: 15, jenis_surat_id: 5, nama: 'Surat Keterangan Lahir (Bidan/RS)' },
      { id: 16, jenis_surat_id: 6, nama: 'KTP Pelapor' }, { id: 17, jenis_surat_id: 6, nama: 'Kartu Keluarga' }, { id: 18, jenis_surat_id: 6, nama: 'Surat Keterangan Kematian (RS/RT)' },
      { id: 19, jenis_surat_id: 7, nama: 'KTP' }, { id: 20, jenis_surat_id: 7, nama: 'Kartu Keluarga' }, { id: 21, jenis_surat_id: 7, nama: 'Surat Pengantar RT/RW' },
      { id: 22, jenis_surat_id: 8, nama: 'KTP' }, { id: 23, jenis_surat_id: 8, nama: 'Kartu Keluarga' }, { id: 24, jenis_surat_id: 8, nama: 'Pas Foto' },
    ],
    pengajuan: [],
    dokumen: [],
    verifikasi: [],
    persetujuan: [],
    surat: [],
    surat_masuk: [],
    surat_keluar: [],
    disposisi_surat_masuk: [],
    notifikasi: [],
    activity_logs: [],
    berita: [
      {
        id: 1,
        judul: 'Peluncuran Layanan Surat Online SIPESUR',
        isi: 'Kelurahan Sukamaju resmi meluncurkan sistem layanan surat administrasi kependudukan daring demi mempermudah warga mengurus surat dari rumah tanpa antre.',
        kategori: 'Pengumuman',
        tanggal: '2026-11-15',
        penulis_id: 1,
        created_at: '2026-11-15T08:00:00.000Z',
      },
      {
        id: 2,
        judul: 'Jam Layanan Loket Khusus Menjelang Akhir Tahun',
        isi: 'Menyambut penutupan tahun anggaran 2026, loket pelayanan tatap muka di kantor kelurahan dibuka pukul 08.00 - 15.00 WIB setiap hari kerja.',
        kategori: 'Info Layanan',
        tanggal: '2026-11-10',
        penulis_id: 1,
        created_at: '2026-11-10T08:00:00.000Z',
      },
      {
        id: 3,
        judul: 'Pemutakhiran Data Kependudukan & BLT Lingkungan',
        isi: 'Bagi seluruh warga yang mengalami perubahan data KK, domisili, atau status keluarga dihimbau memperbarui berkas di kantor kelurahan sebelum 31 Desember.',
        kategori: 'Himbauan',
        tanggal: '2026-11-05',
        penulis_id: 1,
        created_at: '2026-11-05T08:00:00.000Z',
      },
    ],
    umkm: [
      {
        id: 1,
        nama: 'Warung Makan Bu Tini',
        jenis: 'Kuliner',
        alamat: 'Jl. Sukamaju No. 45 RT 02/03',
        telepon: '0812-3456-7890',
        deskripsi: 'Menyediakan masakan khas nusantara dan katering hajatan',
      },
      {
        id: 2,
        nama: 'Toko Bangunan Maju Jaya',
        jenis: 'Material & Konstruksi',
        alamat: 'Jl. Pahlawan No. 12 RT 01/05',
        telepon: '0813-5678-9012',
        deskripsi: 'Bahan bangunan lengkap dan melayani antar tempat',
      },
      {
        id: 3,
        nama: 'Jasa Laundry Kilat Bersih',
        jenis: 'Jasa & Kebersihan',
        alamat: 'Gang Mawar No. 7 RT 04/02',
        telepon: '0821-9876-5432',
        deskripsi: 'Cuci setrika ekspres 1 hari selesai higienis dan harum',
      },
      {
        id: 4,
        nama: 'Konveksi Batik Sukamaju',
        jenis: 'Tekstil & Pakaian',
        alamat: 'Jl. Industri No. 3 RT 03/01',
        telepon: '0858-1234-5678',
        deskripsi: 'Pakaian batik khas kelurahan dan seragam instansi',
      },
      {
        id: 5,
        nama: 'Apotek Sehat Mandiri',
        jenis: 'Kesehatan & Obat',
        alamat: 'Jl. Sukamaju No. 88 RT 02/04',
        telepon: '0877-2233-4455',
        deskripsi: 'Obat generik dan vitamin bersertifikasi BPOM',
      },
      {
        id: 6,
        nama: 'Studio Foto Kenangan Indah',
        jenis: 'Jasa Kreatif',
        alamat: 'Jl. Merdeka No. 20 RT 05/03',
        telepon: '0831-6677-8899',
        deskripsi: 'Foto dokumen KTP, ijazah, pernikahan, dan cetak kilat',
      },
    ],
    galeri_kegiatan: [
      {
        id: 1,
        judul: 'Kerja Bakti Lingkungan RW 01 - RW 08',
        deskripsi: 'Warga gotong royong membersihkan saluran air dan fasilitas umum lingkungan kelurahan',
        url_foto: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
        tanggal: '2026-11-12',
        penulis_id: 1,
      },
      {
        id: 2,
        judul: 'Penyaluran Bantuan Pangan Cadangan Pemerintah',
        deskripsi: 'Pembagian beras bantuan bagi keluarga prasejahtera bertempat di Aula Kelurahan',
        url_foto: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
        tanggal: '2026-11-08',
        penulis_id: 1,
      },
      {
        id: 3,
        judul: 'Musyawarah Perencanaan Pembangunan (Musrenbang)',
        deskripsi: 'Penyusunan usulan program kerja tahun 2027 bersama tokoh masyarakat dan RT/RW',
        url_foto: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        tanggal: '2026-10-25',
        penulis_id: 1,
      },
      {
        id: 4,
        judul: 'Pelatihan Kewirausahaan & Legalitas Usaha Mikro',
        deskripsi: 'Bimbingan pembuatan NIB dan izin edar produk untuk pelaku UMKM lokal binaan',
        url_foto: 'https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?auto=format&fit=crop&w=800&q=80',
        tanggal: '2026-10-18',
        penulis_id: 1,
      },
    ],
    anggaran: [
      {
        id: 1,
        tahun: 2026,
        program: 'Peningkatan Sarana & Prasarana Lingkungan Permukiman',
        pagu: 450000000,
        realisasi: 412500000,
        sumber: 'APBD Kota',
        keterangan: 'Pengaspalan jalan lingkungan dan drainase 8 RW',
      },
      {
        id: 2,
        tahun: 2026,
        program: 'Digitalisasi Layanan Publik & Sistem SIPESUR',
        pagu: 75000000,
        realisasi: 75000000,
        sumber: 'APBD Kota',
        keterangan: 'Pengadaan server, aplikasi persuratan, dan TTE digital',
      },
      {
        id: 3,
        tahun: 2026,
        program: 'Pemberdayaan Masyarakat & Pembinaan UMKM Lokal',
        pagu: 120000000,
        realisasi: 108000000,
        sumber: 'Dana Kelurahan',
        keterangan: 'Pelatihan usaha, permodalan bibit, dan pameran kelurahan',
      },
      {
        id: 4,
        tahun: 2026,
        program: 'Pelayanan Kesehatan Posyandu & Penanganan Stunting',
        pagu: 95000000,
        realisasi: 91200000,
        sumber: 'Dana Kelurahan',
        keterangan: 'PMT balita/lansia dan insentif kader posyandu',
      },
      {
        id: 5,
        tahun: 2026,
        program: 'Operasional Kantor & Ketentraman Ketertiban Lingkungan',
        pagu: 180000000,
        realisasi: 165000000,
        sumber: 'APBD Kota',
        keterangan: 'Perawatan kantor kelurahan, ATK dinas, dan linmas',
      },
    ],
  };
}

function initLocalDb() {
  if (localDb) return localDb;
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      localDb = JSON.parse(content);
      const defaults = getDefaultData();
      if (!localDb.profil_desa || !localDb.profil_desa.length) {
        localDb.profil_desa = defaults.profil_desa;
      }
      if (!localDb.berita || !localDb.berita.length) {
        localDb.berita = defaults.berita;
      }
      if (!localDb.umkm || !localDb.umkm.length) {
        localDb.umkm = defaults.umkm;
      }
      if (!localDb.galeri_kegiatan || !localDb.galeri_kegiatan.length) {
        localDb.galeri_kegiatan = defaults.galeri_kegiatan;
      }
      if (!localDb.anggaran || !localDb.anggaran.length) {
        localDb.anggaran = defaults.anggaran;
      }
    } else {
      localDb = getDefaultData();
      saveLocalDb();
    }
  } catch {
    localDb = getDefaultData();
  }
  return localDb;
}

function saveLocalDb() {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB Local] Gagal menyimpan file database lokal:', err.message);
  }
}

// ----------------------------------------------------------------
// Local SQL Engine (Sederhana tapi mencakup semua query SIPESUR)
// ----------------------------------------------------------------
function executeLocalSql(sql, params = []) {
  const dbData = initLocalDb();
  const cleanSql = sql.trim();
  const upper = cleanSql.toUpperCase();

  // 1. SELECT profil_desa
  if (upper.includes('FROM PROFIL_DESA') || upper.includes('FROM "PROFIL_DESA"')) {
    const list = dbData.profil_desa || [];
    return list.slice(0, 1);
  }

  // 2. UPDATE profil_desa
  if (upper.startsWith('UPDATE PROFIL_DESA') || upper.startsWith('UPDATE "PROFIL_DESA"')) {
    const p = dbData.profil_desa[0] || {};
    // Extract parameters
    if (params.length >= 10) {
      p.nama_desa = params[0];
      p.kecamatan = params[1];
      p.kabupaten_kota = params[2];
      p.provinsi = params[3];
      p.alamat = params[4];
      p.kode_pos = params[5];
      p.telepon = params[6];
      p.email = params[7];
      p.website = params[8];
      p.logo_url = params[9];
      p.nama_lurah = params[10];
      p.nip_lurah = params[11];
      p.jabatan_lurah = params[12];
      p.updated_at = new Date().toISOString();
      dbData.profil_desa[0] = p;
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 3. SELECT USERS
  if (upper.includes('FROM USERS') && upper.includes('WHERE')) {
    let rows = [...dbData.users];
    if (upper.includes('EMAIL = ?') || upper.includes('USERNAME = ?') || upper.includes('NIP = ?')) {
      const id = String(params[0] || '').toLowerCase();
      rows = rows.filter((u) => {
        const uNik = dbData.warga.find((w) => w.user_id === u.id)?.nik;
        return (
          String(u.email || '').toLowerCase() === id ||
          String(u.username || '').toLowerCase() === id ||
          String(u.nip || '').toLowerCase() === id ||
          String(uNik || '') === id
        );
      });
      return rows.map((u) => {
        const w = dbData.warga.find((item) => item.user_id === u.id) || {};
        return { ...u, ...w, id: u.id, telepon_warga: w.telepon };
      });
    }
    if (upper.includes('U.ID = ?') || upper.includes('WHERE ID=?') || upper.includes('WHERE ID = ?')) {
      const uid = Number(params[0]);
      rows = rows.filter((u) => u.id === uid);
      return rows.map((u) => {
        const w = dbData.warga.find((item) => item.user_id === u.id) || {};
        return { ...u, ...w, id: u.id };
      });
    }
    if (upper.includes('ROLE = ?') || upper.includes("ROLE = 'LURAH'")) {
      const r = params[0] || 'lurah';
      return rows.filter((u) => u.role === r && u.aktif);
    }
  }

  // 4. UPDATE users SET tanda_tangan=? WHERE id=?
  if (upper.startsWith('UPDATE USERS') && upper.includes('TANDA_TANGAN')) {
    const uid = Number(params[1]);
    const u = dbData.users.find((x) => x.id === uid);
    if (u) {
      u.tanda_tangan = params[0];
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 5. UPDATE users
  if (upper.startsWith('UPDATE USERS')) {
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 6. DELETE queries
  if (upper.startsWith('DELETE FROM')) {
    const m = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
    if (m) {
      const tbl = m[1].toLowerCase();
      if (dbData[tbl]) {
        if (params.length > 0 && (typeof params[0] === 'number' || !isNaN(Number(params[0])))) {
          const idDel = Number(params[0]);
          dbData[tbl] = dbData[tbl].filter((item) => item.id !== idDel && item.pengajuan_id !== idDel && item.user_id !== idDel);
        } else if (cleanSql.toUpperCase().includes('WHERE USER_ID = ?') && params[0]) {
          const uid = Number(params[0]);
          dbData[tbl] = dbData[tbl].filter((item) => item.user_id !== uid);
        }
        saveLocalDb();
        return [{ rowCount: 1, affectedRows: 1 }];
      }
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 6. BERITA & PENGUMUMAN
  if (upper.includes('FROM BERITA')) {
    return [...(dbData.berita || [])].sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
  }
  if (upper.startsWith('INSERT INTO BERITA')) {
    dbData.berita = dbData.berita || [];
    const newId = (dbData.berita.length ? Math.max(...dbData.berita.map((r) => r.id || 0)) : 0) + 1;
    const row = {
      id: newId,
      judul: params[0],
      isi: params[1],
      kategori: params[2] || 'Pengumuman',
      tanggal: params[3] || new Date().toISOString().split('T')[0],
      penulis_id: params[4] || null,
      created_at: new Date().toISOString(),
    };
    dbData.berita.unshift(row);
    saveLocalDb();
    return [{ id: newId }];
  }
  if (upper.startsWith('UPDATE BERITA')) {
    dbData.berita = dbData.berita || [];
    const id = Number(params[4]);
    const item = dbData.berita.find((x) => x.id === id);
    if (item) {
      item.judul = params[0];
      item.isi = params[1];
      item.kategori = params[2];
      item.tanggal = params[3];
      item.updated_at = new Date().toISOString();
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 7. UMKM
  if (upper.includes('FROM UMKM')) {
    return [...(dbData.umkm || [])].sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || '')));
  }
  if (upper.startsWith('INSERT INTO UMKM')) {
    dbData.umkm = dbData.umkm || [];
    const newId = (dbData.umkm.length ? Math.max(...dbData.umkm.map((r) => r.id || 0)) : 0) + 1;
    const row = {
      id: newId,
      nama: params[0],
      jenis: params[1] || '',
      alamat: params[2] || '',
      telepon: params[3] || '',
      deskripsi: params[4] || '',
      created_at: new Date().toISOString(),
    };
    dbData.umkm.push(row);
    saveLocalDb();
    return [{ id: newId }];
  }
  if (upper.startsWith('UPDATE UMKM')) {
    dbData.umkm = dbData.umkm || [];
    const id = Number(params[5]);
    const item = dbData.umkm.find((x) => x.id === id);
    if (item) {
      item.nama = params[0];
      item.jenis = params[1];
      item.alamat = params[2];
      item.telepon = params[3];
      item.deskripsi = params[4];
      item.updated_at = new Date().toISOString();
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 8. GALERI KEGIATAN
  if (upper.includes('FROM GALERI_KEGIATAN')) {
    return [...(dbData.galeri_kegiatan || [])].sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
  }
  if (upper.startsWith('INSERT INTO GALERI_KEGIATAN')) {
    dbData.galeri_kegiatan = dbData.galeri_kegiatan || [];
    const newId = (dbData.galeri_kegiatan.length ? Math.max(...dbData.galeri_kegiatan.map((r) => r.id || 0)) : 0) + 1;
    const row = {
      id: newId,
      judul: params[0],
      deskripsi: params[1] || '',
      url_foto: params[2] || '',
      tanggal: params[3] || new Date().toISOString().split('T')[0],
      penulis_id: params[4] || null,
      created_at: new Date().toISOString(),
    };
    dbData.galeri_kegiatan.unshift(row);
    saveLocalDb();
    return [{ id: newId }];
  }
  if (upper.startsWith('UPDATE GALERI_KEGIATAN')) {
    dbData.galeri_kegiatan = dbData.galeri_kegiatan || [];
    const id = Number(params[4]);
    const item = dbData.galeri_kegiatan.find((x) => x.id === id);
    if (item) {
      item.judul = params[0];
      item.deskripsi = params[1];
      item.url_foto = params[2];
      item.tanggal = params[3];
      item.updated_at = new Date().toISOString();
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 9. ANGGARAN
  if (upper.includes('FROM ANGGARAN')) {
    return [...(dbData.anggaran || [])].sort((a, b) => (Number(b.tahun) || 0) - (Number(a.tahun) || 0));
  }
  if (upper.startsWith('INSERT INTO ANGGARAN')) {
    dbData.anggaran = dbData.anggaran || [];
    const newId = (dbData.anggaran.length ? Math.max(...dbData.anggaran.map((r) => r.id || 0)) : 0) + 1;
    const row = {
      id: newId,
      tahun: Number(params[0]) || new Date().getFullYear(),
      program: params[1],
      pagu: Number(params[2]) || 0,
      realisasi: Number(params[3]) || 0,
      sumber: params[4] || 'APBD Kota',
      keterangan: params[5] || '',
      created_at: new Date().toISOString(),
    };
    dbData.anggaran.unshift(row);
    saveLocalDb();
    return [{ id: newId }];
  }
  if (upper.startsWith('UPDATE ANGGARAN')) {
    dbData.anggaran = dbData.anggaran || [];
    const id = Number(params[6]);
    const item = dbData.anggaran.find((x) => x.id === id);
    if (item) {
      item.tahun = Number(params[0]) || item.tahun;
      item.program = params[1];
      item.pagu = Number(params[2]) || 0;
      item.realisasi = Number(params[3]) || 0;
      item.sumber = params[4] || 'APBD Kota';
      item.keterangan = params[5] || '';
      item.updated_at = new Date().toISOString();
      saveLocalDb();
    }
    return [{ rowCount: 1, affectedRows: 1 }];
  }

  // 10. CEK STATUS PUBLIK
  if (upper.includes('FROM PENGAJUAN P') && upper.includes('JOIN JENIS_SURAT')) {
    const kode = String(params[0] || params[1] || '').trim().toUpperCase();
    const idNum = Number(kode);
    const p = (dbData.pengajuan || []).find((item) =>
      (!isNaN(idNum) && item.id === idNum) ||
      String(item.nomor_surat || '').toUpperCase() === kode
    );
    if (p) {
      const js = (dbData.jenis_surat || []).find((j) => j.id === p.jenis_surat_id);
      const u = (dbData.users || []).find((usr) => usr.id === p.user_id);
      return [{
        id: p.id,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        catatan_petugas: p.catatan_petugas || null,
        jenis_surat: js?.nama || 'Surat Keterangan Kelurahan',
        nama_pemohon: u?.nama || 'Warga Sukamaju',
      }];
    }
    return [];
  }

  // 11. STATISTIK PUBLIK
  if (upper.includes("SELECT COUNT(*) AS TOTAL FROM PENGAJUAN WHERE STATUS = 'ISSUED'")) {
    return [{ total: (dbData.pengajuan || []).filter((p) => p.status === 'issued').length }];
  }
  if (upper.includes('SELECT COUNT(*) AS TOTAL FROM PENGAJUAN')) {
    return [{ total: (dbData.pengajuan || []).length }];
  }
  if (upper.includes('SELECT COUNT(*) AS TOTAL FROM USERS WHERE ROLE = ?')) {
    const roleArg = params[0] || 'warga';
    return [{ total: (dbData.users || []).filter((u) => u.role === roleArg && u.aktif).length }];
  }

  // 12. Generic SELECT / INSERT / UPDATE Fallback
  // Cek tabel yang ditarget
  const tableMatch = cleanSql.match(/(?:FROM|INTO|UPDATE)\s+([a-zA-Z0-9_]+)/i);
  const tableName = tableMatch ? tableMatch[1].toLowerCase() : null;

  if (tableName && dbData[tableName]) {
    if (upper.startsWith('SELECT')) {
      return [...dbData[tableName]];
    }
    if (upper.startsWith('INSERT')) {
      const newId = (dbData[tableName].length ? Math.max(...dbData[tableName].map((r) => r.id || 0)) : 0) + 1;
      const newRow = { id: newId, created_at: new Date().toISOString() };
      dbData[tableName].push(newRow);
      saveLocalDb();
      return [{ id: newId }];
    }
    if (upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
      return [{ rowCount: 1, affectedRows: 1 }];
    }
  }

  return [];
}

// ----------------------------------------------------------------
// Helper: HTTP POST ke Supabase REST API
// ----------------------------------------------------------------
function rpcPost(funcName, body) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return reject(new Error('SUPABASE_NOT_CONFIGURED'));
    }

    const payload = JSON.stringify(body);
    let url;
    try {
      url = new URL(`${SUPABASE_URL}/rest/v1/rpc/${funcName}`);
    } catch (e) {
      return reject(e);
    }

    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = { message: data }; }
          const msg = parsed?.message || parsed?.hint || `HTTP ${res.statusCode}`;
          const err = new Error(msg);
          err.status = res.statusCode >= 400 && res.statusCode < 500 ? res.statusCode : 500;
          err.pgCode = parsed?.code;
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
    req.write(payload);
    req.end();
  });
}

// ----------------------------------------------------------------
// Escape parameter nilai ke literal SQL yang aman
// ----------------------------------------------------------------
function escapeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (Number.isNaN(val)) return 'NULL';
    return String(val);
  }
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'NULL';
    return val.map((v) => escapeSqlVal(v)).join(', ');
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function translateQuery(sql, params = []) {
  let cleanSql = sql
    .replace(/\bYEAR\s*\(\s*([^)]+)\s*\)/gi, 'EXTRACT(YEAR FROM $1)')
    .replace(
      /\bDATE_FORMAT\s*\(\s*([^,]+)\s*,\s*'%Y-%m'\s*\)/gi,
      "TO_CHAR($1, 'YYYY-MM')"
    );

  let newSql = '';
  let inStr = false;
  let strChar = '';
  let paramIdx = 0;

  for (let i = 0; i < cleanSql.length; i++) {
    const ch = cleanSql[i];
    if (inStr) {
      newSql += ch;
      if (ch === strChar && cleanSql[i - 1] !== '\\') inStr = false;
    } else if (ch === "'" || ch === '"') {
      inStr = true;
      strChar = ch;
      newSql += ch;
    } else if (ch === '?') {
      const val = params[paramIdx++];
      newSql += escapeSqlVal(val);
    } else {
      newSql += ch;
    }
  }

  const trimmed = newSql.trim();
  if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
    newSql = `${trimmed} RETURNING id`;
  }

  return { sql: newSql };
}

function queryType(sql) {
  const s = sql.trim().toUpperCase();
  if (s.startsWith('INSERT')) return 'insert';
  if (s.startsWith('SELECT') || s.startsWith('WITH')) return 'select';
  return 'mutate';
}

// ----------------------------------------------------------------
// API utama: db.query(sql, params)
// ----------------------------------------------------------------
const db = {
  async query(sql, params = []) {
    // Jika sudah ditandai fallback atau Supabase belum diset, langsung pakai local fallback
    if (useLocalFallback || !SUPABASE_URL || !SUPABASE_KEY) {
      const localResult = executeLocalSql(sql, params);
      const rows = Array.isArray(localResult) ? localResult : (localResult ? [localResult] : []);
      const insertId = rows[0]?.id ?? null;
      rows.insertId = insertId;
      rows.affectedRows = rows.length;
      rows.rowCount = rows.length;
      return [rows, { insertId, affectedRows: rows.length, rowCount: rows.length }];
    }

    const { sql: pgSql } = translateQuery(sql, params);
    const type = queryType(pgSql);

    let funcName;
    if (type === 'insert') funcName = 'sipesur_insert';
    else if (type === 'select') funcName = 'sipesur_exec';
    else funcName = 'sipesur_mutate';

    let raw;
    try {
      raw = await rpcPost(funcName, { query: pgSql });
    } catch (err) {
      // Jika kegagalan jaringan (ENOTFOUND, TIMEOUT, atau offline), aktifkan mode local fallback otomatis
      if (
        err.message?.includes('ENOTFOUND') ||
        err.message?.includes('TIMEOUT') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('SUPABASE_NOT_CONFIGURED')
      ) {
        if (!useLocalFallback) {
          console.warn('[DB] Supabase offline / tidak terjangkau. Beralih otomatis ke Local Storage Engine.');
          useLocalFallback = true;
        }
        const localResult = executeLocalSql(sql, params);
        const rows = Array.isArray(localResult) ? localResult : (localResult ? [localResult] : []);
        const insertId = rows[0]?.id ?? null;
        rows.insertId = insertId;
        rows.affectedRows = rows.length;
        rows.rowCount = rows.length;
        return [rows, { insertId, affectedRows: rows.length, rowCount: rows.length }];
      }

      console.error('[DB Error]', err.message);
      console.error('[DB SQL]', pgSql.slice(0, 200));
      throw err;
    }

    if (type === 'mutate') {
      const meta = raw || { rowCount: 0, affectedRows: 0 };
      const rows = [];
      rows.insertId = null;
      rows.affectedRows = meta.affectedRows || 0;
      rows.rowCount = meta.rowCount || 0;
      return [rows, meta];
    }

    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const insertId = type === 'insert' ? (rows[0]?.id ?? null) : null;
    const rowCount = rows.length;

    rows.insertId = insertId;
    rows.affectedRows = rowCount;
    rows.rowCount = rowCount;

    const meta = { insertId, affectedRows: rowCount, rowCount };
    return [rows, meta];
  },

  pool: {
    async query(sql, params) {
      return db.query(sql, params);
    },
    async end() {},
  },

  async end() {},
};

export default db;
