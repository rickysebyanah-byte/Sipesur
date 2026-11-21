import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api, { downloadPdf } from '../api';

/* =====================================================================
   MODAL CETAK SURAT RESMI
   – Warga: HANYA LIHAT & CETAK/UNDUH (TIDAK BISA EDIT ISI SURAT)
   – Petugas / Lurah / Admin (Yang Berwenang): BISA EDIT ISI & SIMPAN
   ===================================================================== */

export default function ModalCetakSurat({ data, onClose, onUpdated, userRole }) {
  const [qrUrl, setQrUrl] = useState('');
  const [savingRedaksi, setSavingRedaksi] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  if (!data) return null;

  const { p = {}, surat = {}, kop = {} } = data;
  const verifKode = surat?.kode_verifikasi || p.kode || '';
  const verifyLink = `${window.location.origin}/verifikasi/${verifKode}`;

  // ── ATURAN HAK AKSES (RULES) ──
  // Warga TIDAK BERHAK mengubah isi/redaksi naskah resmi!
  // Hanya Petugas, Lurah, atau Admin yang berhak menyunting isi surat.
  const role = userRole || (p.user_id ? 'warga' : 'petugas');
  const canEdit = ['petugas', 'lurah', 'admin'].includes(userRole);

  const [tab, setTab] = useState(canEdit ? 'editor' : 'preview');

  // ── Data kop surat & sanitasi nilai mock lama ──
  const isOld = (s) => !s || /merdeka|contoh|sukamaju(?!\.medan)|\(021\)|12345/i.test(String(s));
  const pemkab     = (!isOld(kop.kabupaten_kota) ? kop.kabupaten_kota : 'PEMERINTAH KOTA MEDAN').toUpperCase();
  const namaDesa   = (!isOld(kop.nama_desa) ? kop.nama_desa : 'KELURAHAN SUKA MAJU').toUpperCase();
  const namaKec    = (!isOld(kop.kecamatan) ? kop.kecamatan : 'KECAMATAN MEDAN JOHOR').toUpperCase();
  const alamatDesa = !isOld(kop.alamat) ? kop.alamat : 'Jl. STM No. 40, Kelurahan Suka Maju';
  const telpDesa   = !isOld(kop.telepon) ? kop.telepon : '0823-4123-5734';
  const kodePosDesa= !isOld(kop.kode_pos) ? kop.kode_pos : '20146';
  const alamatKop  = `${alamatDesa}, Telp. ${telpDesa} • Kode Pos: ${kodePosDesa}`;
  const kontakKop  = [
    (!isOld(kop.email) ? kop.email : 'kelurahan@pemkomedan.go.id') && `Email: ${!isOld(kop.email) ? kop.email : 'kelurahan@pemkomedan.go.id'}`,
    (!isOld(kop.website) ? kop.website : 'sukamaju.medan.go.id') && `Website: ${!isOld(kop.website) ? kop.website : 'sukamaju.medan.go.id'}`
  ].filter(Boolean).join(' • ');

  // ── Data penandatangan ──
  const lurahNama    = (!isOld(surat.lurah_nama) && surat.lurah_nama) || (!isOld(kop.nama_lurah) && kop.nama_lurah) || 'Muhammad Iqbal Samosir, S.E., M.A.P.';
  const lurahNip     = (!isOld(surat.lurah_nip) && surat.lurah_nip) || (!isOld(kop.nip_lurah) && kop.nip_lurah) || '198506122010011005';
  const lurahJabatan = kop.jabatan_lurah || 'Lurah Suka Maju';
  const lurahTtd     = surat.tanda_tangan || null;

  // ── Tanggal & lokasi ──
  const tanggalTerbit = surat.terbit_at
    ? new Date(surat.terbit_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const namaLokasi = namaDesa ? namaDesa.replace(/^(KELURAHAN|DESA)\s+/i, '') : 'Suka Maju';
  const lokasiTgl = `${namaLokasi}, ${tanggalTerbit}`;

  // ── Form fields ──
  const formFields = Array.isArray(p.form_fields) ? p.form_fields : [];
  const formData   = typeof p.data_form === 'object' && p.data_form ? p.data_form : {};

  // ── Template default dari database ──
  const templateDefault = p.template && p.template.trim()
    ? p.template.trim()
    : `adalah benar warga ${kop.nama_desa || 'Kelurahan Suka Maju'} dan terdaftar dalam catatan kependudukan kelurahan. Surat keterangan ini diberikan untuk keperluan yang bersangkutan sesuai dengan permohonan yang telah diajukan.`;

  // ── STATE ISI SURAT ──
  const [isiSurat, setIsiSurat]       = useState(formData?.redaksi_kustom || templateDefault);
  const [pembuka, setPembuka]         = useState(
    formData?.pembuka_kustom ||
    `Yang bertanda tangan di bawah ini, ${lurahJabatan} ${kop.nama_desa || 'Kelurahan Suka Maju'}, ${kop.kecamatan || 'Kecamatan Medan Johor'}, ${kop.kabupaten_kota || 'Kota Medan'}, dengan ini menerangkan bahwa:`
  );
  const [penutup, setPenutup]         = useState(
    formData?.penutup_kustom ||
    'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'
  );
  const [nomorSurat, setNomorSurat]   = useState(surat.nomor || '');
  const [judulSurat, setJudulSurat]   = useState(p.jenis || 'SURAT KETERANGAN');
  const [perihal, setPerihal]         = useState('');

  useEffect(() => {
    QRCode.toDataURL(verifyLink, { width: 140, margin: 1 })
      .then(setQrUrl)
      .catch(() => {});
  }, [verifyLink]);

  const handlePrint = () => {
    window.print();
  };

  const handleSimpanRedaksi = async () => {
    if (!canEdit) {
      alert('Akses ditolak: Anda tidak memiliki wewenang untuk mengubah isi surat kedinasan.');
      return;
    }
    setSavingRedaksi(true);
    setSaveMsg(null);
    try {
      await api.put(`/pengajuan/${p.id}/redaksi`, {
        redaksi: isiSurat,
        pembuka,
        penutup,
        nomor: nomorSurat,
      });
      setSaveMsg({ ok: true, text: '✓ Perubahan isi surat berhasil disimpan & berkas resmi diperbarui!' });
      if (onUpdated) onUpdated();
    } catch (err) {
      setSaveMsg({ ok: false, text: err.response?.data?.message || 'Gagal menyimpan perubahan isi surat.' });
    } finally {
      setSavingRedaksi(false);
    }
  };

  const handleUnduhPdf = async () => {
    if (canEdit) {
      try {
        await api.put(`/pengajuan/${p.id}/redaksi`, {
          redaksi: isiSurat,
          pembuka,
          penutup,
          nomor: nomorSurat,
        });
      } catch (e) {
        console.warn('Auto save before download ignored:', e.message);
      }
    }
    downloadPdf(`/pengajuan/${p.id}/surat`, `Surat-${(nomorSurat || surat.nomor || p.kode || 'surat').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);
  };

  // ── PRATINJAU SURAT A4 RESMI (PAS 1 LEMBAR A4) ──
  const SuratA4 = () => (
    <div
      id="sipesur-print-area"
      className="printable-document mx-auto w-full max-w-[210mm] min-h-0 rounded-sm bg-white p-6 sm:p-8 text-slate-950 shadow-lg border border-slate-300 font-serif text-[10pt] leading-snug"
    >
      {/* 1. KOP SURAT */}
      <div className="relative border-b-[3px] border-double border-slate-900 pb-2 mb-3">
        <div className="flex items-center gap-4">
          {kop.logo_url && (
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <img src={kop.logo_url} alt="Logo Daerah" className="max-h-16 max-w-16 object-contain" />
            </div>
          )}
          <div className={`flex-1 text-center ${!kop.logo_url ? 'w-full' : ''}`}>
            <div className="font-sans text-[11pt] font-bold tracking-wider leading-tight">{pemkab}</div>
            <div className="font-sans text-[13pt] font-extrabold tracking-wider leading-tight">{namaDesa}</div>
            <div className="font-sans text-[10pt] font-bold tracking-wider leading-tight">{namaKec}</div>
            <div className="font-sans text-[8.5pt] font-normal leading-tight mt-0.5 text-slate-800">{alamatKop}</div>
            {kontakKop && <div className="font-sans text-[8pt] text-slate-700 leading-tight mt-0.5">{kontakKop}</div>}
          </div>
        </div>
      </div>

      {/* 2. JUDUL & NOMOR */}
      <div className="text-center my-3">
        <h2 className="font-serif text-[12pt] font-bold uppercase underline tracking-wide">{judulSurat}</h2>
        <div className="font-sans text-[9.5pt] font-medium text-slate-800 mt-0.5">
          Nomor: {nomorSurat || '---/---/---/---'}
        </div>
        {perihal && (
          <div className="font-sans text-[9pt] text-slate-700 mt-0.5">
            Perihal: {perihal}
          </div>
        )}
      </div>

      {/* 3. PEMBUKA */}
      <p className="text-justify my-2.5 text-[9.5pt] leading-normal">{pembuka}</p>

      {/* 4. TABEL IDENTITAS WARGA PEMOHON */}
      <table className="w-full my-3 font-sans text-[10pt] leading-normal">
        <tbody>
          <tr>
            <td className="w-48 py-1 text-slate-800 align-top">Nama Lengkap</td>
            <td className="w-4 py-1 text-center align-top">:</td>
            <td className="py-1 font-bold text-slate-950 uppercase">{p.pemohon || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800">NIK</td>
            <td className="py-1 text-center">:</td>
            <td className="py-1 font-mono font-semibold">{p.nik || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800">Tempat / Tgl. Lahir</td>
            <td className="py-1 text-center">:</td>
            <td className="py-1">{p.tempat_lahir || '-'}, {p.tanggal_lahir || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800">Jenis Kelamin</td>
            <td className="py-1 text-center">:</td>
            <td className="py-1">{p.jenis_kelamin === 'L' ? 'Laki-laki' : p.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800 align-top">Alamat Domisili</td>
            <td className="py-1 text-center align-top">:</td>
            <td className="py-1 text-justify align-top">{p.alamat || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800">Pekerjaan</td>
            <td className="py-1 text-center">:</td>
            <td className="py-1">{p.pekerjaan || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-800">Nomor Telepon / WA</td>
            <td className="py-1 text-center">:</td>
            <td className="py-1">{p.telepon || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* 5. KETERANGAN FORM TAMBAHAN */}
      {formFields.length > 0 && Object.keys(formData).length > 0 && (
        <div className="my-3">
          <div className="font-sans font-bold text-[10pt] text-slate-900 mb-1">Keterangan Tambahan:</div>
          <table className="w-full font-sans text-[10pt] leading-normal">
            <tbody>
              {formFields.map((f) => {
                const val = formData[f.name];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <tr key={f.name}>
                    <td className="w-48 py-1 text-slate-800">{f.label || f.name}</td>
                    <td className="w-4 py-1 text-center">:</td>
                    <td className="py-1 font-medium">{String(val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. ISI / REDAKSI SURAT */}
      <p className="text-justify my-2.5 text-[9.5pt] leading-normal">
        Demikian bahwa yang bersangkutan {isiSurat}
      </p>

      {/* 7. PENUTUP */}
      <p className="text-justify my-2 text-[9.5pt] leading-normal">{penutup}</p>

      {/* 8. TANDA TANGAN, CAP & QR CODE */}
      <div className="mt-4 pt-2 flex items-end justify-between gap-6">
        {/* QR CODE */}
        <div className="text-center w-36 flex flex-col items-center">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Validasi" className="w-20 h-20 border border-slate-300 p-1 bg-white shadow-sm" />
          ) : (
            <div className="w-20 h-20 border border-slate-300 flex items-center justify-center text-xs text-slate-400">QR</div>
          )}
          <div className="font-sans text-[7pt] text-slate-600 mt-1 leading-tight">Pindai QR untuk verifikasi keaslian surat</div>
          <div className="font-mono text-[6.5pt] text-slate-400 mt-0.5">{verifKode}</div>
        </div>

        {/* TTD LURAH & CAP */}
        <div className="text-center w-64 relative font-sans text-[9.5pt]">
          <div className="text-slate-800">{lokasiTgl}</div>
          <div className="font-bold text-slate-900 mt-0.5">{lurahJabatan} {namaDesa}</div>
          <div className="relative h-20 flex items-center justify-center my-0.5">
            {lurahTtd ? (
              <img src={lurahTtd} alt="Tanda Tangan Lurah" className="max-h-16 max-w-40 object-contain z-10 filter drop-shadow-sm" />
            ) : (
              <div className="h-14 flex items-center justify-center text-xs text-slate-400 italic font-serif">(Tanda Tangan Basah)</div>
            )}
            {/* Stempel */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-18 h-18 rounded-full border-2 border-indigo-700/60 p-1 flex items-center justify-center pointer-events-none rotate-[-12deg] z-0 select-none">
              <div className="w-full h-full rounded-full border border-dashed border-indigo-600/60 flex flex-col items-center justify-center text-indigo-700/70 font-sans font-bold text-[5.5pt] text-center uppercase tracking-tighter leading-none">
                <span>PEMERINTAH KOTA</span>
                <span className="text-[4.5pt] my-0.5">★ KELURAHAN ★</span>
                <span>TERVERIFIKASI</span>
              </div>
            </div>
          </div>
          <div className="font-bold underline text-slate-950 uppercase tracking-wide">{lurahNama}</div>
          <div className="text-[8.5pt] text-slate-700 mt-0.5">NIP. {lurahNip}</div>
        </div>
      </div>

      {/* 9. FOOTER RESMI (Pas 1 Lembar) */}
      <div className="mt-4 pt-2 border-t border-slate-300 text-center font-sans text-[7.5pt] text-slate-500 leading-tight">
        <div>{namaDesa} • {alamatKop}</div>
        <div className="text-slate-400 mt-0.5">Dokumen ini diterbitkan secara sah dan tersimpan dalam Sistem Informasi Pelayanan Surat (SIPESUR).</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm overflow-hidden">

      {/* ── BAR ATAS (tidak ikut cetak) ── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white text-lg shadow-sm">🖨️</span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              {canEdit ? 'Pratinjau & Cetak Surat (Mode Pejabat Berwenang)' : 'Cetak & Unduh Surat Resmi'}
            </h3>
            <p className="text-xs text-slate-500">
              {canEdit ? 'Anda berwenang mengedit isi naskah sebelum dicetak' : 'Dokumen resmi kependudukan siap cetak (Format A4)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* TAB MOBILE JIKA PEJABAT BERWENANG */}
          {canEdit && (
            <div className="flex sm:hidden rounded-lg border border-slate-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setTab('editor')}
                className={`px-3 py-2 font-semibold transition-colors ${tab === 'editor' ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                ✏️ Editor Isi
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`px-3 py-2 font-semibold transition-colors ${tab === 'preview' ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                👁️ Pratinjau A4
              </button>
            </div>
          )}

          {/* Tombol Simpan (HANYA MUNCUL UNTUK PETUGAS/LURAH/ADMIN) */}
          {canEdit && (
            <button
              type="button"
              onClick={handleSimpanRedaksi}
              disabled={savingRedaksi}
              className="btn btn-p py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              title="Simpan perubahan naskah ke database"
            >
              <span>{savingRedaksi ? '💾 Menyimpan…' : '💾 Simpan Isi Surat'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="btn bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak Dokumen</span>
          </button>

          <button
            type="button"
            onClick={handleUnduhPdf}
            className="btn btn-o py-2 px-3 text-xs font-semibold"
          >
            ⬇ Unduh PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-o py-2 px-3 text-xs font-semibold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
          >
            ✕ Tutup
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className={`no-print px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
          saveMsg.ok ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <span>{saveMsg.text}</span>
          <button type="button" onClick={() => setSaveMsg(null)} className="text-xs hover:underline">Tutup</button>
        </div>
      )}

      {/* ── BODY: SPLIT PANEL (Jika Pejabat) ATAU FULL PREVIEW (Jika Warga) ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ════ PANEL KIRI: EDITOR ISI SURAT (HANYA TAMPIL UNTUK PEJABAT BERWENANG) ════ */}
        {canEdit && (
          <div
            className={`no-print flex flex-col border-r border-slate-200 bg-white overflow-y-auto
              ${tab === 'preview' ? 'hidden sm:flex' : 'flex'}
              w-full sm:w-80 md:w-96 flex-shrink-0`}
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-brand-700 to-indigo-600 px-4 py-3">
              <div className="font-bold text-white text-sm flex items-center justify-between">
                <span>✏️ Sesuaikan Isi Surat (Wewenang Pejabat)</span>
              </div>
              <div className="text-[11px] text-brand-100 mt-0.5">Warga tidak dapat mengedit bagian ini</div>
            </div>

            <div className="p-4 space-y-5 flex-1">

              {/* Kepala Surat */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                  📄 Kepala Surat
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Judul / Jenis Surat</span>
                  <input
                    type="text"
                    className="inp text-sm"
                    value={judulSurat}
                    onChange={(e) => setJudulSurat(e.target.value.toUpperCase())}
                    placeholder="SURAT KETERANGAN DOMISILI"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Nomor Registrasi Surat</span>
                  <input
                    type="text"
                    className="inp text-sm font-mono"
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    placeholder="470/012/Kel.SKM/XI/2026"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Perihal <span className="font-normal text-slate-400">(opsional)</span></span>
                  <input
                    type="text"
                    className="inp text-sm"
                    value={perihal}
                    onChange={(e) => setPerihal(e.target.value)}
                    placeholder="Contoh: Keterangan Domisili Tempat Tinggal"
                  />
                </label>
              </div>

              {/* Pembuka */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                  📝 Kalimat Pembuka
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Paragraf Pembuka</span>
                  <textarea
                    rows={3}
                    className="inp text-xs leading-relaxed"
                    value={pembuka}
                    onChange={(e) => setPembuka(e.target.value)}
                    placeholder="Yang bertanda tangan di bawah ini..."
                  />
                </label>
              </div>

              {/* ISI / REDAKSI SURAT */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span>📋 Bagian Dalam / Isi Naskah <span className="text-brand-700 font-bold">*</span></span>
                  <button
                    type="button"
                    onClick={() => setIsiSurat(templateDefault)}
                    className="text-[10px] text-brand-700 font-semibold hover:underline"
                  >
                    ↩ Reset ke template
                  </button>
                </div>

                <div className="rounded-xl bg-brand-50 border border-brand-200 p-3 text-xs text-brand-900 leading-relaxed">
                  <strong>💡 Bagian Dalam Surat:</strong> Warga diterangkan mengenai apa? Teks ini tampil setelah kata "<em>Demikian bahwa yang bersangkutan…</em>".
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Isi Surat (Klausul &amp; Keperluan):
                  </span>
                  <textarea
                    rows={7}
                    className="inp text-sm leading-relaxed"
                    value={isiSurat}
                    onChange={(e) => setIsiSurat(e.target.value)}
                    placeholder="adalah benar warga kelurahan kami yang berdomisili di alamat tersebut dan surat keterangan ini dibuat untuk keperluan..."
                  />
                  <span className="text-[11px] text-slate-400">{isiSurat.length} karakter</span>
                </label>

                {/* Template Cepat */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">🚀 Pilihan Redaksi Cepat:</div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      ['Domisili', `adalah benar warga yang bertempat tinggal dan berdomisili di wilayah ${kop.nama_desa || 'Kelurahan Suka Maju'}. Surat keterangan ini diberikan untuk keperluan administrasi kependudukan sesuai permohonan yang bersangkutan.`],
                      ['Usaha Aktif', `adalah benar warga kami yang memiliki dan menjalankan usaha aktif di wilayah ${kop.nama_desa || 'Kelurahan Suka Maju'}. Surat keterangan ini dibuat untuk menerangkan keberadaan usaha tersebut sesuai dengan keadaan sebenarnya.`],
                      ['Tidak Mampu', `adalah benar warga kelurahan kami yang berdasarkan hasil verifikasi lapangan tergolong ke dalam keluarga tidak mampu secara ekonomi. Surat keterangan ini diterbitkan untuk pengajuan bantuan / beasiswa.`],
                      ['Belum Menikah', `adalah warga kelurahan kami yang berdasarkan data kependudukan hingga saat ini berstatus belum pernah menikah (lajang). Surat ini dibuat untuk memenuhi kelengkapan berkas administrasi pernikahan.`],
                      ['Kelakuan Baik / SKCK', `adalah warga kelurahan kami yang berkelakuan baik dan tidak pernah terlibat tindak kriminal. Surat pengantar ini diberikan untuk keperluan penerbitan Surat Keterangan Catatan Kepolisian (SKCK).`],
                    ].map(([label, teks]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setIsiSurat(teks)}
                        className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-700 hover:text-brand-900 transition-all leading-snug"
                      >
                        <span className="font-semibold text-brand-700">{label}:</span>{' '}
                        <span className="text-slate-500 line-clamp-1">{teks.substring(0, 55)}…</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Penutup */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                  🔚 Kalimat Penutup
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Paragraf Penutup</span>
                  <textarea
                    rows={2}
                    className="inp text-xs leading-relaxed"
                    value={penutup}
                    onChange={(e) => setPenutup(e.target.value)}
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimpanRedaksi}
                  disabled={savingRedaksi}
                  className="btn btn-p w-full py-2.5 font-bold text-xs shadow-md"
                >
                  {savingRedaksi ? '💾 Menyimpan…' : '💾 Simpan & Terapkan Isi Surat Ini'}
                </button>
              </div>

              <div className="pb-4" />
            </div>
          </div>
        )}

        {/* ════ PANEL KANAN: PRATINJAU A4 RESMI (TAMPIL UNTUK SEMUA ROLE) ════ */}
        <div
          className={`flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-8
            ${canEdit && tab === 'editor' ? 'hidden sm:block' : 'block'}`}
        >
          <SuratA4 />
        </div>
      </div>

      {/* ── CSS KHUSUS CETAK DOKUMEN RESMI A4 (ANTI-BLANK PAGE & PAS 1 LEMBAR) ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
          }
          /* Sembunyikan seluruh UI luar */
          body * {
            visibility: hidden !important;
          }
          #sipesur-print-area,
          #sipesur-print-area * {
            visibility: visible !important;
          }
          #sipesur-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            max-height: 280mm !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
