import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';

// Template body default per kode surat
const TEMPLATE_DEFAULT = {
  SKD: 'adalah benar warga dan berdomisili di wilayah kelurahan kami. Surat keterangan domisili ini diberikan untuk keperluan yang bersangkutan sesuai permohonan.',
  SKTM: 'adalah benar warga kelurahan kami dan berdasarkan hasil verifikasi lapangan, yang bersangkutan tergolong ke dalam warga tidak mampu secara ekonomi. Surat ini diterbitkan untuk keperluan yang bersangkutan.',
  SKCK: 'adalah warga kelurahan kami yang bermaksud mengurus Surat Keterangan Catatan Kepolisian (SKCK) di Polsek/Polres setempat. Yang bersangkutan adalah warga yang baik dan tidak pernah terlibat tindak pidana berdasarkan catatan lingkungan setempat.',
  SKU: 'adalah warga kelurahan kami yang menjalankan usaha aktif di wilayah kelurahan. Surat ini dibuat untuk menerangkan keberadaan usaha yang bersangkutan sesuai dengan keadaan sebenarnya.',
  SKLH: 'adalah warga kelurahan kami. Surat ini menerangkan bahwa telah lahir seorang anak yang merupakan anggota keluarga yang bersangkutan, sebagaimana data yang tertera.',
  SKM: 'adalah warga kelurahan kami. Surat ini menerangkan bahwa telah terjadi peristiwa kematian dalam keluarga yang bersangkutan. Surat ini dibuat untuk keperluan pelaporan resmi sesuai ketentuan yang berlaku.',
  SKBM: 'adalah warga kelurahan kami. Berdasarkan data kependudukan dan hasil verifikasi, yang bersangkutan hingga saat ini berstatus belum pernah menikah. Surat ini dibuat untuk keperluan yang bersangkutan.',
  SPP: 'adalah warga kelurahan kami yang bermaksud melakukan pindah domisili. Surat pengantar ini dibuat untuk mempermudah proses administrasi kependudukan yang bersangkutan di tempat tujuan.',
};

/**
 * Helper: Parse base64 image data URL ke buffer
 */
function parseBase64Image(dataStr) {
  if (!dataStr) return null;
  try {
    if (dataStr.startsWith('data:image')) {
      const base64Data = dataStr.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }
    if (fs.existsSync(dataStr)) {
      return fs.readFileSync(dataStr);
    }
  } catch (err) {
    console.error('[PDF] Gagal membaca data gambar tanda tangan / logo:', err.message);
  }
  return null;
}

/**
 * Buat PDF surat keterangan resmi kelurahan dengan Kop & TTD Dinamis.
 *
 * @param {object} opts
 * @param {string} opts.nomor       - Nomor surat
 * @param {string} opts.jenis       - Nama jenis surat
 * @param {string} opts.kode        - Kode jenis surat (SKD, SKTM, SKCK, ...)
 * @param {string} opts.template    - Template body dari database
 * @param {Array}  opts.fields      - Array form fields [{name, label}]
 * @param {object} opts.data        - Data form yang diisi warga
 * @param {object} opts.warga       - Data warga
 * @param {object} opts.kop         - Data Kop Profil Desa dinamis
 * @param {string} opts.lurah       - Nama lurah penandatangan
 * @param {string} opts.nip         - NIP lurah penandatangan
 * @param {string} opts.jabatan     - Jabatan lurah penandatangan
 * @param {string} opts.tanda_tangan- Base64 data URL tanda tangan unik lurah
 * @param {string} opts.url         - URL verifikasi QR
 * @param {string} opts.tanggal     - Tanggal terbit dalam format Indonesia
 * @param {string} file             - Path file output PDF
 */
export async function buatPdf(opts, file) {
  const {
    nomor,
    jenis,
    kode,
    template,
    fields = [],
    data = {},
    warga = {},
    kop = {},
    lurah = 'Muhammad Iqbal Samosir, S.E., M.A.P.',
    nip = '198506122010011005',
    jabatan = 'Lurah Suka Maju',
    tanda_tangan = null,
    url,
    tanggal,
  } = opts;

  // Nama daerah dinamis dari Profil Desa
  const pemkab = (kop.kabupaten_kota || 'Pemerintah Kota Medan').toUpperCase();
  const namaDesa = (kop.nama_desa || 'Kelurahan Suka Maju').toUpperCase();
  const namaKec = (kop.kecamatan || 'Kecamatan Medan Johor').toUpperCase();
  const alamatLengkap = `${kop.alamat || 'Jl. STM No. 40, Medan Johor'}, Telp. ${kop.telepon || '0823-4123-5734'} • Kode Pos: ${kop.kode_pos || '20146'}`;
  const infoKontak = [
    kop.email ? `Email: ${kop.email}` : '',
    kop.website ? `Website: ${kop.website}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  // Buat QR code sebagai buffer gambar
  const qrBuffer = await QRCode.toBuffer(url || 'https://sipesur.id', {
    margin: 1,
    width: 130,
  });

  const sigBuffer = parseBase64Image(tanda_tangan);
  const logoBuffer = parseBase64Image(kop.logo_url);

  // Inisialisasi dokumen PDF
  const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  const L = 60;   // margin kiri
  const R = 535;  // margin kanan (lebar isi = 475)
  const W = 475;  // lebar konten

  // ----------------------------------------------------------------
  // KOP SURAT DINAMIS
  // ----------------------------------------------------------------
  const kopStartY = doc.y;

  // Jika ada logo desa, gambar di sebelah kiri
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, L, kopStartY, { width: 60, height: 60, fit: [60, 60] });
    } catch (e) {
      console.warn('[PDF] Logo tidak dapat dimuat, dilewati:', e.message);
    }
  }

  doc.font('Helvetica-Bold').fontSize(12).text(pemkab, L, doc.y, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(13).text(namaDesa, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(11).text(namaKec, { align: 'center', width: W });
  doc.font('Helvetica').fontSize(9).text(alamatLengkap, { align: 'center', width: W });
  if (infoKontak) {
    doc.font('Helvetica').fontSize(8.5).text(infoKontak, { align: 'center', width: W });
  }

  // Garis pembatas tebal ganda standar resmi pemerintah
  doc.moveDown(0.5);
  doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(2.5).stroke();
  doc.moveTo(L, doc.y + 2).lineTo(R, doc.y + 2).lineWidth(0.5).stroke();
  doc.lineWidth(1); // reset

  // ----------------------------------------------------------------
  // JUDUL & NOMOR SURAT
  // ----------------------------------------------------------------
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(12.5).text(jenis.toUpperCase(), L, doc.y, {
    align: 'center',
    width: W,
    underline: true,
  });
  doc.font('Helvetica').fontSize(10).text(`Nomor: ${nomor}`, L, doc.y + 4, { align: 'center', width: W });

  // ----------------------------------------------------------------
  // KALIMAT PEMBUKA
  // ----------------------------------------------------------------
  doc.moveDown(1.5);
  doc.font('Helvetica').fontSize(10.5).text(
    `Yang bertanda tangan di bawah ini, ${jabatan} ${kop.nama_desa || 'Kelurahan Suka Maju'}, ${kop.kecamatan || 'Kecamatan Medan Johor'}, ${kop.kabupaten_kota || 'Kota Medan'}, dengan ini menerangkan bahwa:`,
    L,
    doc.y,
    { width: W, align: 'justify' }
  );

  // ----------------------------------------------------------------
  // DATA IDENTITAS WARGA (Tabel)
  // ----------------------------------------------------------------
  doc.moveDown(0.8);

  const identitasRows = [
    ['Nama Lengkap', warga.nama],
    ['NIK', warga.nik],
    ['Tempat / Tgl. Lahir', `${warga.tempat_lahir || '-'}, ${warga.tanggal_lahir || '-'}`],
    ['Jenis Kelamin', warga.jenis_kelamin || '-'],
    ['Alamat', warga.alamat],
    ['Pekerjaan', warga.pekerjaan || '-'],
    ['No. Telepon', warga.telepon || '-'],
  ];

  const colKey = L + 10;
  const colSep = L + 165;
  const colVal = L + 175;
  const valWidth = R - colVal;

  doc.font('Helvetica').fontSize(10.5);
  for (const [key, val] of identitasRows) {
    const startY = doc.y;
    const textHeight = doc.heightOfString(String(val || '-'), { width: valWidth });
    const rowH = Math.max(textHeight, 14) + 2;

    doc.text(key, colKey, startY, { width: 150 });
    doc.text(':', colSep, startY, { width: 10 });
    doc.text(String(val || '-'), colVal, startY, { width: valWidth });

    doc.y = startY + rowH;
  }

  // ----------------------------------------------------------------
  // DATA FORM TAMBAHAN (Keterangan Tambahan)
  // ----------------------------------------------------------------
  const dataEntries = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (dataEntries.length > 0 && fields.length > 0) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(10.5).text('Keterangan Tambahan:', colKey, doc.y, { width: W - 10 });
    doc.font('Helvetica').fontSize(10.5);

    for (const f of fields) {
      const val = data[f.name];
      if (val === null || val === undefined || val === '') continue;
      const startY = doc.y;
      const textHeight = doc.heightOfString(String(val), { width: valWidth });
      const rowH = Math.max(textHeight, 14) + 2;
      doc.text(f.label || f.name, colKey, startY, { width: 150 });
      doc.text(':', colSep, startY, { width: 10 });
      doc.text(String(val), colVal, startY, { width: valWidth });
      doc.y = startY + rowH;
    }
  }

  // ----------------------------------------------------------------
  // BODY / ISI SURAT
  // ----------------------------------------------------------------
  doc.moveDown(1);

  const bodyText = (template && template.trim())
    ? template.trim()
    : (TEMPLATE_DEFAULT[kode] || `adalah benar warga ${kop.nama_desa || 'Kelurahan Suka Maju'}.`);

  doc.font('Helvetica').fontSize(10.5).text(
    `Demikian bahwa yang bersangkutan ${bodyText}`,
    L,
    doc.y,
    { width: W, align: 'justify' }
  );

  // ----------------------------------------------------------------
  // KALIMAT PENUTUP
  // ----------------------------------------------------------------
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(10.5).text(
    'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
    L,
    doc.y,
    { width: W, align: 'justify' }
  );

  // ----------------------------------------------------------------
  // TANDA TANGAN, CAP KELURAHAN & QR CODE
  // ----------------------------------------------------------------
  doc.moveDown(1.5);

  if (doc.y > 640) {
    doc.addPage();
  }

  const sigY = doc.y;

  // QR Code (kiri bawah)
  doc.image(qrBuffer, L, sigY, { width: 85 });
  doc.font('Helvetica').fontSize(7.5).fillColor('#333333').text(
    'Pindai QR untuk verifikasi\nkeaslian dokumen resmi',
    L,
    sigY + 90,
    { width: 95, align: 'center' }
  );

  // Area tanda tangan (kanan bawah)
  const sigX = 330;
  const sigW = 205;
  const lokasiTgl = `${kop.nama_desa ? kop.nama_desa.replace(/^(kelurahan|desa)\s+/i, '') : 'Suka Maju'}, ${tanggal}`;

  doc.font('Helvetica').fontSize(10.5).fillColor('#000000').text(lokasiTgl, sigX, sigY, { width: sigW, align: 'center' });
  doc.font('Helvetica').fontSize(10.5).text(`${jabatan} ${kop.nama_desa || 'Kelurahan Suka Maju'}`, sigX, doc.y + 2, { width: sigW, align: 'center' });

  // TANDA TANGAN ASLI LURAH (Beda orang beda tanda tangan)
  const ttdTopY = doc.y + 4;

  if (sigBuffer) {
    try {
      // Sematkan tanda tangan digital asli milik Lurah yang menyetujui
      doc.image(sigBuffer, sigX + 35, ttdTopY, { width: 135, height: 50, fit: [135, 50] });
    } catch (sigErr) {
      console.warn('[PDF] Gagal menyematkan tanda tangan gambar:', sigErr.message);
    }
  }

  // Stempel Digital Resmi Kelurahan (Cap basah ungu/merah transparan yang menimpa sebagian tanda tangan)
  try {
    const stampRadius = 26;
    const stampCenterX = sigX + 45;
    const stampCenterY = ttdTopY + 25;

    doc.save();
    doc.opacity(0.45);
    doc.lineWidth(1.2);
    doc.circle(stampCenterX, stampCenterY, stampRadius).stroke('#4f5b93');
    doc.circle(stampCenterX, stampCenterY, stampRadius - 3).stroke('#4f5b93');
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#4f5b93');
    doc.text('PEMERINTAH KOTA', stampCenterX - 25, stampCenterY - 14, { width: 50, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(5.5).text('★ KELURAHAN ★', stampCenterX - 25, stampCenterY - 2, { width: 50, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(6).text('RESMI TERVERIFIKASI', stampCenterX - 25, stampCenterY + 8, { width: 50, align: 'center' });
    doc.restore();
  } catch (stampErr) {
    // Ignore stempel error if any
  }

  doc.y = ttdTopY + 54;
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#000000').text(lurah, sigX, doc.y, {
    width: sigW,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica').fontSize(9).text(`NIP. ${nip || '-'}`, sigX, doc.y + 2, { width: sigW, align: 'center' });

  // ----------------------------------------------------------------
  // FOOTER RESMI
  // ----------------------------------------------------------------
  const footerY = doc.page.height - 40;
  doc.moveTo(L, footerY - 6).lineTo(R, footerY - 6).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
    `${kop.nama_desa || 'Kelurahan Suka Maju'} • ${alamatLengkap}`,
    L,
    footerY,
    { width: W, align: 'center' }
  );

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Buat PDF Surat Dinas / Balasan Resmi Kelurahan dengan Kop Dinamis & TTD Lurah
 */
export async function buatPdfSuratDinas(opts, file) {
  const {
    nomor,
    tujuan,
    perihal,
    isi,
    tanggal,
    kop = {},
    lurah = 'Muhammad Iqbal Samosir, S.E., M.A.P.',
    nip = '198506122010011005',
    jabatan = 'Lurah Suka Maju',
    tanda_tangan = null,
  } = opts;

  const pemkab = (kop.kabupaten_kota || 'Pemerintah Kota Medan').toUpperCase();
  const namaDesa = (kop.nama_desa || 'Kelurahan Suka Maju').toUpperCase();
  const namaKec = (kop.kecamatan || 'Kecamatan Medan Johor').toUpperCase();
  const alamatLengkap = `${kop.alamat || 'Jl. STM No. 40, Medan Johor'}, Telp. ${kop.telepon || '0823-4123-5734'} • Kode Pos: ${kop.kode_pos || '20146'}`;

  const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  const L = 60;
  const R = 535;
  const W = 475;

  // KOP SURAT DINAMIS
  const logoBuffer = parseBase64Image(kop.logo_url);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, L, doc.y, { width: 55, height: 55, fit: [55, 55] });
    } catch (e) { }
  }

  doc.font('Helvetica-Bold').fontSize(12).text(pemkab, L, doc.y, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(13).text(namaDesa, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(11).text(namaKec, { align: 'center', width: W });
  doc.font('Helvetica').fontSize(9).text(alamatLengkap, { align: 'center', width: W });

  doc.moveDown(0.5);
  doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(2.5).stroke();
  doc.moveTo(L, doc.y + 2).lineTo(R, doc.y + 2).lineWidth(0.5).stroke();
  doc.lineWidth(1);

  // Tanggal & Nomor Surat
  doc.moveDown(1.5);
  const startY = doc.y;
  const lokasiTgl = `${kop.nama_desa ? kop.nama_desa.replace(/^(kelurahan|desa)\s+/i, '') : 'Suka Maju'}, ${tanggal}`;

  doc.font('Helvetica').fontSize(10);
  doc.text(`Nomor     : ${nomor}`, L, startY);
  doc.text('Sifat        : Penting', L, doc.y + 2);
  doc.text('Lampiran : -', L, doc.y + 2);
  doc.text(`Perihal    : ${perihal}`, L, doc.y + 2);

  doc.text(lokasiTgl, 330, startY, { width: 200, align: 'right' });
  doc.text('Kepada Yth.', 330, doc.y + 8, { width: 200, align: 'left' });
  doc.font('Helvetica-Bold').text(tujuan, 330, doc.y + 2, { width: 200, align: 'left' });
  doc.font('Helvetica').text('di -', 330, doc.y + 2, { width: 200, align: 'left' });
  doc.text('    Tempat', 330, doc.y + 2, { width: 200, align: 'left' });

  // Isi Surat
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(10.5).text('Dengan hormat,', L, doc.y, { width: W });
  doc.moveDown(0.8);
  doc.text(isi, L, doc.y, { width: W, align: 'justify', lineGap: 3 });

  doc.moveDown(1.2);
  doc.text(
    'Demikian surat ini kami sampaikan untuk menjadi perhatian dan tindak lanjut sebagaimana mestinya. Atas perhatian dan kerja samanya kami ucapkan terima kasih.',
    L,
    doc.y,
    { width: W, align: 'justify' }
  );

  // Tanda Tangan
  doc.moveDown(2);
  if (doc.y > 640) doc.addPage();
  const sigX = 330;
  const sigW = 205;
  doc.text(`${jabatan} ${kop.nama_desa || 'Kelurahan Suka Maju'},`, sigX, doc.y, { width: sigW, align: 'center' });

  const sigBuffer = parseBase64Image(tanda_tangan);
  const ttdTopY = doc.y + 4;
  if (sigBuffer) {
    try {
      doc.image(sigBuffer, sigX + 35, ttdTopY, { width: 135, height: 50, fit: [135, 50] });
    } catch (e) { }
  }

  doc.y = ttdTopY + 54;
  doc.font('Helvetica-Bold').text(lurah, sigX, doc.y, { width: sigW, align: 'center', underline: true });
  doc.font('Helvetica').fontSize(9).text(`NIP. ${nip}`, sigX, doc.y + 2, { width: sigW, align: 'center' });

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
