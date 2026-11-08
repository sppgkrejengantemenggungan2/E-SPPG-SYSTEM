import React from 'react';
import { AlertTriangle, Camera, Upload, Trash2, RotateCcw } from 'lucide-react';
import { SppgProfile } from '../../types';

export interface FlyerItem {
  name: string;
  price: number;
}

export interface FlyerNutrition {
  energy: string; // e.g. "486,6 kkal"
  protein: string; // e.g. "19,4 g"
  fat: string; // e.g. "21,4 g"
  carbs: string; // e.g. "54,9 g"
  fiber: string; // e.g. "3,8 g"
}

export interface FlyerData {
  dateText: string;
  institutionLine1: string;
  institutionLine2: string;
  institutionLine3: string;
  photoSmallUrl?: string;
  photoLargeUrl?: string;
  itemsSmall: FlyerItem[];
  itemsLarge: FlyerItem[];
  nutritionSmall: FlyerNutrition;
  nutritionLarge: FlyerNutrition;
  standardSmall: {
    energy: string;
    protein: string;
    fat: string;
    carbs: string;
    fiber: string;
  };
  standardLarge: {
    energy: string;
    protein: string;
    fat: string;
    carbs: string;
    fiber: string;
  };
  portionCountSmall: number;
  portionCountLarge: number;
  consumptionLimitText: string;
}

interface MbgMenuFlyerProps {
  data: FlyerData;
  profile: SppgProfile;
  flyerRef?: React.RefObject<HTMLDivElement | null>;
  onPhotoUploadClick?: (target: 'small' | 'large') => void;
  showPhotoUploadButtons?: boolean;
}

export default function MbgMenuFlyer({
  data,
  profile,
  flyerRef,
  onPhotoUploadClick,
  showPhotoUploadButtons = false
}: MbgMenuFlyerProps) {
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div
      ref={flyerRef}
      className="w-full max-w-[760px] mx-auto bg-[#fafaf9] rounded-3xl p-6 sm:p-8 text-slate-900 shadow-xl border border-slate-200/80 font-sans relative overflow-hidden print-flyer-canvas"
      style={{
        backgroundImage: `radial-gradient(#e2e8f0 0.75px, transparent 0.75px), radial-gradient(#f1f5f9 0.75px, #fafaf9 0.75px)`,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 12px 12px'
      }}
    >
      {/* 1. TOP HEADER: BGN Logo + Institution Text (Left) & BNSP + SLHS Badges (Right) */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Left: BGN Logo & SPPG Name */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center p-0.5">
            <img
              src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
              alt="Badan Gizi Nasional"
              className="w-full h-full object-contain drop-shadow-xs"
            />
          </div>
          <div className="text-[#102a43] leading-tight">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight">
              {data.institutionLine1 || 'SPPG PROBOLINGGO'}
            </h3>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight">
              {data.institutionLine2 || 'KREJENGAN'}
            </h3>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight">
              {data.institutionLine3 || 'TEMENGGUNGAN 2'}
            </h3>
          </div>
        </div>

        {/* Right: BNSP & SLHS Badges in rounded cyan container */}
        <div className="flex items-center gap-2.5 bg-[#cffafe] border border-sky-300 rounded-full px-3.5 py-1.5 shadow-2xs">
          {/* BNSP */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-2xs border border-slate-200">
              <span className="text-rose-600 font-black text-xs leading-none">★</span>
            </div>
            <div className="leading-none text-left">
              <span className="font-black text-xs tracking-tight text-slate-900 block">BNSP</span>
              <span className="text-[7px] font-bold text-slate-700 tracking-tighter uppercase block">
                BADAN NASIONAL SERTIFIKASI PROFESI
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-sky-300/80 mx-0.5" />

          {/* SLHS */}
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center text-white text-[8px] font-black shadow-2xs">
              SLHS
            </div>
          </div>
        </div>
      </div>

      {/* 2. DATE BANNER */}
      <div className="bg-[#153448] text-white rounded-2xl py-2.5 px-6 text-center shadow-sm mb-6">
        <h2 className="text-lg sm:text-xl font-bold tracking-wide">
          {data.dateText || 'Sabtu, 10 Oktober 2026'}
        </h2>
      </div>

      {/* 3. PORTION COLUMNS: Porsi Kecil & Porsi Besar */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-7">
        {/* === KOLOM 1: PORSI KECIL === */}
        <div className="flex flex-col items-center">
          {/* Header Pill */}
          <div className="bg-[#153448] text-white font-bold text-xs sm:text-sm px-6 py-1 rounded-full shadow-xs mb-3 text-center">
            Porsi Kecil
          </div>

          {/* Tray Image Frame */}
          <div className="w-full aspect-4/3 rounded-3xl bg-slate-200 border-2 border-slate-300 shadow-sm overflow-hidden relative group mb-3 flex items-center justify-center">
            {data.photoSmallUrl ? (
              <img
                src={data.photoSmallUrl}
                alt="Ompreng Porsi Kecil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 text-center">
                <img
                  src="/assets/aistudio/20261107_233753_117_c7c076a1.jpeg"
                  alt="Sampel Porsi Kecil"
                  className="w-full h-full object-cover rounded-2xl opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            )}

            {/* Quick Upload Button on hover/touch */}
            {showPhotoUploadButtons && onPhotoUploadClick && (
              <button
                type="button"
                onClick={() => onPhotoUploadClick('small')}
                className="absolute inset-0 bg-black/40 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer no-print backdrop-blur-2xs"
              >
                <Upload className="w-6 h-6 text-amber-300" />
                <span>Ganti Foto Porsi Kecil</span>
              </button>
            )}
          </div>

          {/* Ingredients & Price List */}
          <ul className="w-full text-left space-y-1 text-[11px] sm:text-xs text-slate-800 font-medium pl-1">
            {data.itemsSmall.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-1.5 text-slate-900 font-bold">•</span>
                <span>
                  {item.name} <strong className="text-slate-900 font-bold">Rp. {formatIDR(item.price)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* === KOLOM 2: PORSI BESAR === */}
        <div className="flex flex-col items-center">
          {/* Header Pill */}
          <div className="bg-[#153448] text-white font-bold text-xs sm:text-sm px-6 py-1 rounded-full shadow-xs mb-3 text-center">
            Porsi besar
          </div>

          {/* Tray Image Frame */}
          <div className="w-full aspect-4/3 rounded-3xl bg-slate-200 border-2 border-slate-300 shadow-sm overflow-hidden relative group mb-3 flex items-center justify-center">
            {data.photoLargeUrl ? (
              <img
                src={data.photoLargeUrl}
                alt="Ompreng Porsi Besar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 text-center">
                <img
                  src="/assets/aistudio/20261107_233753_117_c7c076a1.jpeg"
                  alt="Sampel Porsi Besar"
                  className="w-full h-full object-cover rounded-2xl opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            )}

            {/* Quick Upload Button on hover/touch */}
            {showPhotoUploadButtons && onPhotoUploadClick && (
              <button
                type="button"
                onClick={() => onPhotoUploadClick('large')}
                className="absolute inset-0 bg-black/40 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer no-print backdrop-blur-2xs"
              >
                <Upload className="w-6 h-6 text-amber-300" />
                <span>Ganti Foto Porsi Besar</span>
              </button>
            )}
          </div>

          {/* Ingredients & Price List */}
          <ul className="w-full text-left space-y-1 text-[11px] sm:text-xs text-slate-800 font-medium pl-1">
            {data.itemsLarge.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-1.5 text-slate-900 font-bold">•</span>
                <span>
                  {item.name} <strong className="text-slate-900 font-bold">Rp. {formatIDR(item.price)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. KANDUNGAN GIZI SECTION */}
      <div className="mb-6">
        <h3 className="text-center font-black text-xl sm:text-2xl text-[#153448] tracking-wider uppercase mb-5">
          KANDUNGAN GIZI
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {/* Card 1: Porsi Kecil */}
          <div className="relative pt-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#153448] text-white text-[11px] font-bold px-4 py-0.5 rounded-full z-10 shadow-xs whitespace-nowrap">
              Porsi Kecil
            </div>
            <div className="border-2 border-[#153448] bg-[#dbeafe]/30 rounded-3xl p-4 pt-5 font-bold text-xs sm:text-sm text-slate-900 space-y-1 shadow-xs">
              <p>Energi : {data.nutritionSmall.energy}</p>
              <p>protein : {data.nutritionSmall.protein}</p>
              <p>lemak : {data.nutritionSmall.fat}</p>
              <p>karbohidrat : {data.nutritionSmall.carbs}</p>
              <p>serat : {data.nutritionSmall.fiber}</p>
            </div>
          </div>

          {/* Card 2: Porsi Besar */}
          <div className="relative pt-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#153448] text-white text-[11px] font-bold px-4 py-0.5 rounded-full z-10 shadow-xs whitespace-nowrap">
              Porsi Besar
            </div>
            <div className="border-2 border-[#153448] bg-[#dbeafe]/30 rounded-3xl p-4 pt-5 font-bold text-xs sm:text-sm text-slate-900 space-y-1 shadow-xs">
              <p>Energi : {data.nutritionLarge.energy}</p>
              <p>protein : {data.nutritionLarge.protein}</p>
              <p>lemak : {data.nutritionLarge.fat}</p>
              <p>karbohidrat : {data.nutritionLarge.carbs}</p>
              <p>serat : {data.nutritionLarge.fiber}</p>
            </div>
          </div>

          {/* Card 3: Standar gizi AKG */}
          <div className="relative pt-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#153448] text-white text-[11px] font-bold px-4 py-0.5 rounded-full z-10 shadow-xs whitespace-nowrap">
              Standar gizi AKG
            </div>
            <div className="border-2 border-[#153448] bg-[#dbeafe]/30 rounded-3xl p-3.5 pt-5 font-bold text-[11px] sm:text-xs text-slate-900 space-y-1 shadow-xs">
              <div className="text-slate-900">
                <span className="block font-black text-sky-950 mb-0.5">Porsi kecil</span>
                <p>Energi : {data.standardSmall.energy}</p>
                <p>protein : {data.standardSmall.protein}</p>
                <p>lemak : {data.standardSmall.fat}</p>
                <p>karbohidrat : {data.standardSmall.carbs}</p>
                <p>serat : {data.standardSmall.fiber}</p>
              </div>

              <div className="pt-2 border-t border-sky-300/60 mt-2">
                <span className="block font-black text-sky-950 mb-0.5">Porsi besar</span>
                <p>Energi : {data.standardLarge.energy}</p>
                <p>protein : {data.standardLarge.protein}</p>
                <p>lemak : {data.standardLarge.fat}</p>
                <p>karbohidrat : {data.standardLarge.carbs}</p>
                <p>serat : {data.standardLarge.fiber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. PORTION COUNT BANNER */}
      <div className="mb-4">
        <div className="bg-[#153448] text-white rounded-2xl py-2 px-5 font-bold text-xs sm:text-sm inline-block shadow-sm">
          <p>Porsi kecil : {formatIDR(data.portionCountSmall)} porsi</p>
          <p>Porsi besar : {formatIDR(data.portionCountLarge)} porsi</p>
        </div>
      </div>

      {/* 6. WARNING RIBBON: BATAS KONSUMSI MAKSIMAL */}
      <div className="bg-[#cffafe] border border-sky-300 rounded-2xl p-3 px-4 flex items-center justify-center gap-3 shadow-2xs">
        <div className="w-6 h-6 rounded-md bg-white border border-rose-500 text-rose-600 flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs">
          ⚠️
        </div>
        <p className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight text-center">
          {data.consumptionLimitText || 'batas konsumsi maksimal porsi kecil 09.00, porsi besar 11.00'}
        </p>
      </div>
    </div>
  );
}
