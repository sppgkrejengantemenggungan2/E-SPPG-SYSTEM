import { useSppg } from '../../context/SppgContext';

interface KopSuratProps {
  documentTitle?: string;
  documentNumber?: string;
  date?: string;
}

export default function KopSurat({ documentTitle, documentNumber, date }: KopSuratProps) {
  const { profile } = useSppg();

  return (
    <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
      {/* Kop Header Row */}
      <div className="flex items-center justify-between gap-4 text-center">
        {/* Logo Left: Badan Gizi Nasional (BGN RI) */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center p-0.5">
          <img
            src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
            alt="Badan Gizi Nasional"
            className="w-20 h-20 object-contain drop-shadow-xs"
          />
        </div>

        {/* Institution Title Center */}
        <div className="flex-1 px-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">
            {profile.foundationName || 'YAYASAN HAFSHAWATY'}
          </h4>
          <h2 className="text-base sm:text-lg font-black uppercase text-sky-900 leading-tight">
            {profile.institutionName || 'SPPG PROBOLINGGO KREJENGAN TEMENGGUNGAN 2'}
          </h2>
          <p className="text-xs font-semibold text-slate-700">
            PROGRAM MAKAN BERGIZI GRATIS (MBG)
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-tight">
            {profile.address || 'Kecamatan Krejengan, Kabupaten Probolinggo, Jawa Timur'}
            <span className="mx-2">•</span> Telp: {profile.phone || '0812-3456-7890'}
            <span className="mx-2">•</span> Email: {profile.email}
          </p>
        </div>

        {/* Logo Right: SPPG / SLHS Standard Badge */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-xl border-2 border-emerald-700 bg-emerald-50 text-emerald-800 font-bold text-xs p-1 text-center shadow-xs">
          <div>
            <div className="text-[10px] font-black text-emerald-900">E-SPPG</div>
            <div className="text-[9px] font-bold text-slate-600">STANDAR</div>
            <div className="text-[8px] text-emerald-700 font-extrabold mt-0.5">SLHS / BNSP</div>
            <div className="text-[7px] text-slate-500 font-semibold mt-0.5">TERAKREDITASI</div>
          </div>
        </div>
      </div>

      {documentTitle && (
        <div className="mt-4 pt-2 border-t border-slate-200 text-center">
          <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900 underline decoration-2 underline-offset-4">
            {documentTitle}
          </h3>
          {documentNumber && (
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Nomor: <span className="font-semibold text-slate-900">{documentNumber}</span>
            </p>
          )}
          {date && (
            <p className="text-xs text-slate-500">
              Tanggal: {date}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
