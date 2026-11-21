import { useState, useRef, useEffect } from 'react';

export default function SignaturePad({ value, onChange, onClear, height = 140, label = 'Tanda Tangan Digital' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a'); // Biru kedinasan
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;

    if (value && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value, penColor]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev.slice(-9), canvas.toDataURL('image/png')]);
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    saveState();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = penColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    if (onChange) onChange(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    if (onChange) onChange(null);
    if (onClear) onClear();
  };

  const undo = () => {
    if (!history.length) return clearCanvas();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (onChange) onChange(canvas.toDataURL('image/png'));
    };
    img.src = prev;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype || file.type)) {
      alert('File harus berupa gambar PNG / JPG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
        if (onChange) onChange(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-normal">Tinta:</span>
          <button
            type="button"
            onClick={() => setPenColor('#1e3a8a')}
            className={`w-4 h-4 rounded-full border ${penColor === '#1e3a8a' ? 'ring-2 ring-brand-500 ring-offset-1 border-blue-900 bg-blue-900' : 'bg-blue-800 border-blue-900'}`}
            title="Tinta Biru Resmi"
          />
          <button
            type="button"
            onClick={() => setPenColor('#0f172a')}
            className={`w-4 h-4 rounded-full border ${penColor === '#0f172a' ? 'ring-2 ring-brand-500 ring-offset-1 border-slate-900 bg-slate-950' : 'bg-slate-900 border-slate-900'}`}
            title="Tinta Hitam"
          />
        </div>
      </div>

      <div className="relative border-2 border-dashed border-brand-300 rounded-xl bg-slate-50/60 overflow-hidden shadow-inner group hover:border-brand-400 transition-colors">
        <canvas
          ref={canvasRef}
          width={500}
          height={height}
          className="w-full touch-none cursor-crosshair bg-transparent"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
            Goreskan tanda tangan Anda di sini (Mouse / Touchscreen / Stylus)
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="btn btn-o py-1 px-2.5 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            ✕ Hapus
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!history.length}
            className="btn btn-o py-1 px-2.5 text-xs text-slate-700 disabled:opacity-40"
          >
            ↩ Undo
          </button>
        </div>

        <label className="inline-flex items-center gap-1.5 cursor-pointer text-brand-700 hover:text-brand-900 font-medium">
          <input type="file" accept="image/png,image/jpeg" onChange={handleFileUpload} className="hidden" />
          <span>📁 Unggah Foto TTD (PNG)</span>
        </label>
      </div>
    </div>
  );
}
