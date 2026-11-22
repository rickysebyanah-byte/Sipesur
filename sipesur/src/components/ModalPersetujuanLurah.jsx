import { useState, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import api from '../api';

export default function ModalPersetujuanLurah({ pengajuan, user, onConfirm, onClose, loading }) {
  const [catatan, setCatatan] = useState('');
  const [signature, setSignature] = useState(null);
  const [savedSignature, setSavedSignature] = useState(null);
  const [useSaved, setUseSaved] = useState(true);
  const [fetchingSig, setFetchingSig] = useState(true);

  // ── Isi naskah surat (Lurah mengetik sebelum mengesahkan) ──
  const templateDefault = pengajuan.template && pengajuan.template.trim()
    ? pengajuan.template.trim()
    : `adalah benar warga yang bertempat tinggal dan berdomisili di wilayah Kelurahan Suka Maju. Surat keterangan ini diberikan untuk keperluan administrasi kependudukan sesuai permohonan yang bersangkutan.`;
  const [isiNaskah, setIsiNaskah] = useState(
    (pengajuan.data_form?.redaksi_kustom) || templateDefault
  );
  const [nomorSurat, setNomorSurat] = useState(pengajuan.nomor_surat || '');

  useEffect(() => {
    api.get('/users/signature')
      .then((res) => {
        if (res.data?.tanda_tangan) {
          setSavedSignature(res.data.tanda_tangan);
          setSignature(res.data.tanda_tangan);
          setUseSaved(true);
        } else {
          setUseSaved(false);
        }
      })
      .catch(() => setUseSaved(false))
      .finally(() => setFetchingSig(false));
  }, []);

  const handleApprove = () => {
    const finalSig = useSaved ? savedSignature : signature;
    onConfirm({
      hasil: 'setuju',
      catatan: catatan.trim(),
      tanda_tangan: finalSig || null,
      redaksi: isiNaskah.trim(),
      nomor: nomorSurat.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-50/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white font-bold text-sm shadow-xs">
              ✍️
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Persetujuan & Penandatanganan Surat
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pengesahan resmi berkas oleh Lurah / Pejabat yang Berwenang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* INFO PENGAJUAN */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Nomor Pengajuan:</span>
              <span className="font-mono font-bold text-slate-900">{pengajuan.kode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jenis Surat:</span>
              <span className="font-semibold text-slate-900">{pengajuan.jenis}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Pemohon:</span>
              <span className="font-bold text-slate-900">{pengajuan.pemohon}</span>
            </div>
          </div>

          {/* CATATAN DISPOSISI */}
          <label className="block">
            <span className="block text-xs font-bold text-slate-700 mb-1">
              Catatan / Instruksi Lurah (Opsional):
            </span>
            <input
              type="text"
              className="inp text-xs"
              placeholder="Contoh: Disetujui sesuai hasil verifikasi kependudukan."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </label>

          {/* ISI NASKAH SURAT — Lurah mengisi sebelum mengesahkan */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              📄 Susun Isi Naskah Surat Keterangan
              <span className="ml-1 font-normal text-brand-700 italic">(wajib diisi sebelum mengesahkan)</span>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
              💡 Teks di bawah ini akan muncul dalam surat resmi setelah kata{' '}
              <em>"Demikian bahwa yang bersangkutan…"</em>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700">Nomor Registrasi Surat:</span>
              <input
                type="text"
                className="inp text-xs font-mono"
                placeholder="Contoh: 470/012/Kel.SKM/XI/2026"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700">Isi / Redaksi Naskah Surat: <span className="text-rose-500">*</span></span>
              <textarea
                rows={5}
                className="inp text-xs leading-relaxed"
                value={isiNaskah}
                onChange={(e) => setIsiNaskah(e.target.value)}
                placeholder="adalah benar warga yang berdomisili di wilayah Kelurahan Suka Maju…"
              />
              <span className="text-[10px] text-slate-400">{isiNaskah.length} karakter</span>
            </label>

            {/* Pilihan Redaksi Cepat */}
            <div>
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5">🚀 Pilihan Redaksi Cepat:</div>
              <div className="flex flex-col gap-1.5">
                {[
                  ['Domisili', `adalah benar warga yang bertempat tinggal dan berdomisili di wilayah Kelurahan Suka Maju. Surat keterangan ini diberikan untuk keperluan administrasi kependudukan.`],
                  ['Usaha Aktif', `adalah benar warga kami yang memiliki dan menjalankan usaha aktif di wilayah Kelurahan Suka Maju. Surat keterangan ini dibuat untuk menerangkan keberadaan usaha sesuai keadaan sebenarnya.`],
                  ['Tidak Mampu', `adalah benar warga kelurahan kami yang berdasarkan hasil verifikasi lapangan tergolong ke dalam keluarga tidak mampu secara ekonomi. Surat ini diterbitkan untuk pengajuan bantuan / beasiswa.`],
                  ['Belum Menikah', `adalah warga kelurahan kami yang berdasarkan data kependudukan hingga saat ini berstatus belum pernah menikah (lajang). Surat ini dibuat untuk memenuhi kelengkapan berkas administrasi.`],
                  ['Kelakuan Baik', `adalah warga kelurahan kami yang berkelakuan baik dan tidak pernah terlibat tindak kriminal. Surat pengantar ini diberikan untuk keperluan penerbitan SKCK.`],
                ].map(([label, teks]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setIsiNaskah(teks)}
                    className="text-left text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-700 transition-all"
                  >
                    <span className="font-semibold text-brand-700">{label}:</span>{' '}
                    <span className="text-slate-500">{teks.substring(0, 55)}…</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TANDA TANGAN LURAH */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  Identitas Penandatangan:
                </span>
                <span className="text-xs font-semibold text-brand-900">
                  {user?.nama} {user?.nip ? `(NIP. ${user.nip})` : ''}
                </span>
              </div>
              <span className="badge bg-brand-100 text-brand-800 border-brand-300">
                {user?.jabatan || 'Lurah'}
              </span>
            </div>

            {fetchingSig ? (
              <p className="text-xs text-slate-500 py-2">Memuat data tanda tangan…</p>
            ) : savedSignature && useSaved ? (
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Tanda Tangan Digital Tersimpan Anda:
                  </span>
                  <img
                    src={savedSignature}
                    alt="Tanda Tangan Tersimpan"
                    className="max-h-20 max-w-44 object-contain mx-auto my-1"
                  />
                  <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setUseSaved(false)}
                      className="text-brand-700 hover:underline font-semibold"
                    >
                      ✏️ Buat / Goreskan Tanda Tangan Baru
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  label="Goreskan Tanda Tangan Anda di Bawah Ini:"
                  height={120}
                />
                {savedSignature && (
                  <button
                    type="button"
                    onClick={() => setUseSaved(true)}
                    className="text-xs text-brand-700 hover:underline font-medium block"
                  >
                    ↩ Gunakan Tanda Tangan Tersimpan ({user.nama})
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500 italic">
              Tanda tangan digital ini akan secara otomatis disematkan pada kop surat resmi, berkas PDF, serta diverifikasi via QR code. Beda orang yang menandatangani akan menghasilkan tanda tangan yang berbeda.
            </p>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-o py-2 px-4 text-xs font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="btn btn-p py-2 px-5 text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-1.5"
          >
            {loading ? 'Memproses…' : '✓ Sahkan & Terbitkan Surat Resmi'}
          </button>
        </div>
      </div>
    </div>
  );
}
