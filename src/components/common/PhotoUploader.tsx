import { useState, useRef, ChangeEvent } from 'react';
import { Camera, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

interface PhotoUploaderProps {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  description?: string;
  maxPhotos?: number;
}

export default function PhotoUploader({
  photoUrls,
  onChange,
  label = 'Dokumentasi Foto',
  description = 'Unggah foto dokumentasi kegiatan (Maks. 5 MB per foto, format JPG/PNG)',
  maxPhotos = 6
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [...photoUrls];

    Array.from(files).forEach((file) => {
      if (newUrls.length >= maxPhotos) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newUrls.push(event.target.result as string);
          onChange([...newUrls]);
        }
      };
      reader.readAsDataURL(file);
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = photoUrls.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addSamplePhoto = (type: string) => {
    // Generate clean SVG visual sample for documentation demonstration
    const colors: Record<string, string> = {
      ompreng: '#0284c7',
      suhu: '#0d9488',
      serahTerima: '#16a34a',
      sampah: '#ea580c'
    };
    const c = colors[type] || '#475569';
    const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="${encodeURIComponent(c)}"/><text x="50%" y="45%" font-size="20" font-family="sans-serif" fill="white" font-weight="bold" text-anchor="middle">DOKUMENTASI MBG</text><text x="50%" y="60%" font-size="14" font-family="sans-serif" fill="white" text-anchor="middle">SPPG KREJENGAN 2 (${type.toUpperCase()})</text></svg>`;
    onChange([...photoUrls, svg]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          {label} ({photoUrls.length}/{maxPhotos})
        </label>
        <span className="text-[11px] text-slate-400">
          {description}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photoUrls.map((url, idx) => (
          <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-4/3 shadow-2xs">
            <img 
              src={url} 
              alt={`Dokumentasi ${idx + 1}`} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                title="Hapus foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <span className="absolute bottom-1 left-1.5 bg-slate-900/70 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
              Foto #{idx + 1}
            </span>
          </div>
        ))}

        {photoUrls.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50 transition-colors aspect-4/3 text-sky-700 p-2 cursor-pointer"
          >
            <Camera className="w-6 h-6 mb-1 text-sky-600" />
            <span className="text-xs font-medium">Unggah Foto</span>
            <span className="text-[10px] text-slate-400">atau ambil kamera</span>
          </button>
        )}
      </div>

      {photoUrls.length < maxPhotos && (
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
          <span>Contoh cepat:</span>
          <button
            type="button"
            onClick={() => addSamplePhoto('ompreng')}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px]"
          >
            + Foto Ompreng
          </button>
          <button
            type="button"
            onClick={() => addSamplePhoto('suhu')}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px]"
          >
            + Foto Suhu
          </button>
          <button
            type="button"
            onClick={() => addSamplePhoto('serahTerima')}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px]"
          >
            + Foto Serah Terima
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
}
