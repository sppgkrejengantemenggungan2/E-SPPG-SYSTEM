import { useState, useRef, ChangeEvent } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Maximize2, 
  X, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { compressAndWatermarkImage } from '../../utils/imageWatermark';

interface WatermarkedPhotoUploaderProps {
  photoUrl?: string;
  onChange: (url: string) => void;
  label: string;
  subLabel?: string;
  watermarkTag: string; // e.g. "Bahan Rusak (Sayur)", "Suhu Nasi", "Ompreng Porsi Kecil"
  institutionName?: string;
  required?: boolean;
}

export default function WatermarkedPhotoUploader({
  photoUrl,
  onChange,
  label,
  subLabel = 'Mendukung kamera langsung & unggah berkas (otomatis kompresi & watermark)',
  watermarkTag,
  institutionName = 'SPPG HAFSHAWATY 2',
  required = false
}: WatermarkedPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (JPG, PNG, WEBP).');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const watermarkedDataUrl = await compressAndWatermarkImage(file, {
        subModuleTag: watermarkTag,
        institutionName
      });
      onChange(watermarkedDataUrl);
    } catch (err) {
      console.error('Error processing image watermark:', err);
      setErrorMsg('Gagal memproses watermark pada gambar.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {photoUrl && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Watermark Terverifikasi</span>
          </span>
        )}
      </div>

      {subLabel && (
        <p className="text-[11px] text-slate-500 leading-tight">
          {subLabel}
        </p>
      )}

      {/* Uploaded Thumbnail View or Empty Uploader */}
      {photoUrl ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-slate-900 group aspect-video sm:aspect-16/10 shadow-sm max-w-md">
          <img
            src={photoUrl}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102 cursor-pointer"
            onClick={() => setIsLightboxOpen(true)}
          />

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3 no-print">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              title="Perbesar Pratinjau (Lightbox)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Perbesar</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              title="Ganti Foto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ganti</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              title="Hapus Foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Bukti Audit Siap</span>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-4 bg-sky-50/30 hover:bg-sky-50/60 transition-colors text-center space-y-3 max-w-md">
          {isProcessing ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-sky-800">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <span className="text-xs font-bold">Sedang Mengompresi & Membubuhkan Watermark...</span>
              <span className="text-[10px] text-slate-500 font-mono">SPPG HAFSHAWATY 2 • {watermarkTag}</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white border border-sky-200 shadow-2xs mx-auto flex items-center justify-center text-sky-600">
                <Camera className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Unggah Bukti Fisik: {watermarkTag}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Format JPG/PNG/WEBP • Otomatis kompresi hemat ruang & cap audit
                </span>
              </div>

              {/* Action Buttons: Kamera Langsung & File Picker */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 no-print">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Pilih Berkas</span>
                </button>
              </div>
            </>
          )}

          {errorMsg && (
            <p className="text-[11px] font-bold text-rose-600">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Hidden Inputs */}
      {/* 1. Camera Direct (Environment/Belakang) */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* 2. File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* LIGHTBOX MODAL (PERBESAR PRATINJAU FULLSCREEN) */}
      {isLightboxOpen && photoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in no-print"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold">{label}</h3>
                <p className="text-[11px] text-slate-400">Cap Audit: {watermarkTag} • {institutionName}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-4xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black" onClick={e => e.stopPropagation()}>
            <img
              src={photoUrl}
              alt={label}
              className="w-full h-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
