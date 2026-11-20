import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';

// Template body default per kode surat
const TEMPLATE_DEFAULT = {
  SKD: 'adalah benar warga dan berdomisili di wilayah Kelurahan Sukamaju. Surat keterangan domisili ini diberikan untuk keperluan yang bersangkutan sesuai permohonan.',
  SKTM: 'adalah benar warga Kelurahan Sukamaju dan berdasarkan hasil verifikasi lapangan, yang bersangkutan tergolong ke dalam warga tidak mampu secara ekonomi. Surat ini diterbitkan untuk keperluan yang bersangkutan.',
  SKCK: 'adalah warga Kelurahan Sukamaju yang bermaksud mengurus Surat Keterangan Catatan Kepolisian (SKCK) di Polsek/Polres setempat. Yang bersangkutan adalah warga yang baik dan tidak pernah terlibat tindak pidana berdasarkan catatan lingkungan setempat.',
  SKU: 'adalah warga Kelurahan Sukamaju yang menjalankan usaha aktif di wilayah kelurahan. Surat ini dibuat untuk menerangkan keberadaan usaha yang bersangkutan sesuai dengan keadaan sebenarnya.',
  SKLH: 'adalah warga Kelurahan Sukamaju. Surat ini menerangkan bahwa telah lahir seorang anak yang merupakan anggota keluarga yang bersangkutan, sebagaimana data yang tertera.',
  SKM: 'adalah warga Kelurahan Sukamaju. Surat ini menerangkan bahwa telah terjadi peristiwa kematian dalam keluarga yang bersangkutan. Surat ini dibuat untuk keperluan pelaporan resmi sesuai ketentuan yang berlaku.',
  SKBM: 'adalah warga Kelurahan Sukamaju. Berdasarkan data kependudukan dan hasil verifikasi, yang bersangkutan hingga saat ini berstatus belum pernah menikah. Surat ini dibuat untuk keperluan yang bersangkutan.',
  SPP: 'adalah warga Kelurahan Sukamaju yang bermaksud melakukan pindah domisili. Surat pengantar ini dibuat untuk mempermudah proses administrasi kependudukan yang bersangkutan di tempat tujuan.',
};

/**
 * Buat PDF surat keterangan resmi kelurahan.
 *
 * @param {object} opts
 * @param {string} opts.nomor       - Nomor surat
 * @param {string} opts.jenis       - Nama jenis surat
 * @param {string} opts.kode        - Kode jenis surat (SKD, SKTM, SKCK, ...)
 * @param {string} opts.template    - Template body dari database (boleh kosong)
 * @param {Array}  opts.fields      - Array form fields [{name, label}]
 * @param {object} opts.data        - Data form yang diisi warga
 * @param {object} opts.warga       - Data warga {nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, pekerjaan, telepon}
 * @param {string} opts.lurah       - Nama lurah
 * @param {string} opts.url         - URL verifikasi QR
 * @param {string} opts.tanggal     - Tanggal terbit dalam format Indonesia
 * @param {string} file             - Path file output PDF
 */
export async function buatPdf(opts, file) {
  const { nomor, jenis, kode, template, fields = [], data = {}, warga, lurah, url, tanggal } = opts;

  // Buat QR code sebagai buffer gambar
  const qrBuffer = await QRCode.toBuffer(url || 'https://sipesur.example.com', {
    margin: 1,
    width: 130,
  });

  // Inisialisasi dokumen PDF
  const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  const L = 60;   // margin kiri
  const R = 535;  // margin kanan (lebar isi = 475)
  const W = 475;  // lebar konten

  // ----------------------------------------------------------------
  // KOP SURAT
  // ----------------------------------------------------------------
  doc.font('Helvetica-Bold').fontSize(13).text('PEMERINTAH KOTA CONTOH', L, doc.y, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(12).text('KELURAHAN SUKAMAJU', { align: 'center', width: W });
  doc.font('Helvetica').fontSize(10).text('KECAMATAN CONTOH', { align: 'center', width: W });
  doc.font('Helvetica').fontSize(9).text('Jl. Merdeka No. 1, Telp. (021) 000-0000', { align: 'center', width: W });
  doc.font('Helvetica').fontSize(9).text('Kode Pos: 12345', { align: 'center', width: W });

  // Garis pembatas tebal
  doc.moveDown(0.5);
  doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(2.5).stroke();
  doc.moveTo(L, doc.y + 2).lineTo(R, doc.y + 2).lineWidth(0.5).stroke();
  doc.lineWidth(1); // reset

  // ----------------------------------------------------------------
  // JUDUL & NOMOR SURAT
  // ----------------------------------------------------------------
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(13).text(jenis.toUpperCase(), L, doc.y, {
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
    'Yang bertanda tangan di bawah ini, Lurah Kelurahan Sukamaju, Kecamatan Contoh, Kota Contoh, dengan ini menerangkan bahwa:',
    L,
    doc.y,
    { width: W, align: 'justify' }
  );

  // ----------------------------------------------------------------
  // DATA IDENTITAS WARGA (tabel)
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
    // Hitung tinggi baris berdasarkan nilai (bisa multiline)
    const textHeight = doc.heightOfString(String(val || '-'), { width: valWidth });
    const rowH = Math.max(textHeight, 14) + 2;

    doc.text(key, colKey, startY, { width: 150 });
    doc.text(':', colSep, startY, { width: 10 });
    doc.text(String(val || '-'), colVal, startY, { width: valWidth });

    // Pindah ke bawah baris ini
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

  // Gunakan template dari DB jika ada, fallback ke default per kode
  const bodyText = (template && template.trim())
    ? template.trim()
    : (TEMPLATE_DEFAULT[kode] || 'adalah benar warga Kelurahan Sukamaju.');

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
  // TANDA TANGAN & QR CODE
  // ----------------------------------------------------------------
  doc.moveDown(1.5);

  // Pastikan ada ruang cukup, jika tidak buat halaman baru
  if (doc.y > 660) {
    doc.addPage();
  }

  const sigY = doc.y;

  // QR Code (kiri bawah)
  doc.image(qrBuffer, L, sigY, { width: 90 });
  doc.font('Helvetica').fontSize(7.5).text(
    'Pindai untuk verifikasi\nkeaslian surat',
    L,
    sigY + 95,
    { width: 100, align: 'center' }
  );

  // Area tanda tangan (kanan)
  const sigX = 350;
  const sigW = 185;

  doc.font('Helvetica').fontSize(10.5).text(`Sukamaju, ${tanggal}`, sigX, sigY, { width: sigW, align: 'center' });
  doc.font('Helvetica').fontSize(10.5).text('Lurah Kelurahan Sukamaju', sigX, doc.y + 2, { width: sigW, align: 'center' });
  doc.font('Helvetica').fontSize(10.5).text('', sigX, doc.y + 55, { width: sigW });
  doc.font('Helvetica-Bold').fontSize(10.5).text(lurah || 'Lurah', sigX, doc.y, {
    width: sigW,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica').fontSize(9).text('NIP. -', sigX, doc.y + 2, { width: sigW, align: 'center' });

  // ----------------------------------------------------------------
  // FOOTER
  // ----------------------------------------------------------------
  const footerY = doc.page.height - 40;
  doc.moveTo(L, footerY - 6).lineTo(R, footerY - 6).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(8).fillColor('#555555').text(
    'Kelurahan Sukamaju | Jl. Merdeka No. 1 | Telp. (021) 000-0000 | Kode Pos: 12345',
    L,
    footerY,
    { width: W, align: 'center' }
  );

  // Selesai
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Buat PDF Surat Dinas / Balasan Resmi Kelurahan
 */
export async function buatPdfSuratDinas(opts, file) {
  const { nomor, tujuan, perihal, isi, tanggal, lurah = 'Drs. H. Ahmad Fauzi, M.Si', nip = '197508102000031002' } = opts;

  const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  const L = 60;
  const R = 535;
  const W = 475;

  // KOP SURAT
  doc.font('Helvetica-Bold').fontSize(13).text('PEMERINTAH KOTA CONTOH', L, doc.y, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(12).text('KELURAHAN SUKAMAJU', { align: 'center', width: W });
  doc.font('Helvetica').fontSize(10).text('KECAMATAN CONTOH', { align: 'center', width: W });
  doc.font('Helvetica').fontSize(9).text('Jl. Merdeka No. 1, Telp. (021) 000-0000 • Kode Pos: 12345', { align: 'center', width: W });

  // Garis pembatas tebal
  doc.moveDown(0.5);
  doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(2.5).stroke();
  doc.moveTo(L, doc.y + 2).lineTo(R, doc.y + 2).lineWidth(0.5).stroke();
  doc.lineWidth(1);

  // Tanggal & Nomor Surat
  doc.moveDown(1.5);
  const startY = doc.y;

  // Kiri: Nomor, Sifat, Lampiran, Perihal
  doc.font('Helvetica').fontSize(10);
  doc.text(`Nomor     : ${nomor}`, L, startY);
  doc.text('Sifat        : Penting', L, doc.y + 2);
  doc.text('Lampiran : -', L, doc.y + 2);
  doc.text(`Perihal    : ${perihal}`, L, doc.y + 2);

  // Kanan: Tempat & Tanggal
  doc.text(`Sukamaju, ${tanggal}`, 330, startY, { width: 200, align: 'right' });
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
  if (doc.y > 650) doc.addPage();
  const sigX = 340;
  const sigW = 195;
  doc.text('Lurah Kelurahan Sukamaju,', sigX, doc.y, { width: sigW, align: 'center' });
  doc.moveDown(4);
  doc.font('Helvetica-Bold').text(lurah, sigX, doc.y, { width: sigW, align: 'center', underline: true });
  doc.font('Helvetica').fontSize(9).text(`NIP. ${nip}`, sigX, doc.y + 2, { width: sigW, align: 'center' });

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
