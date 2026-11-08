import { Printer, X, UtensilsCrossed, CheckCircle2, Calendar, Clock, Layers, Users } from 'lucide-react';
import Modal from '../common/Modal';
import KopSurat from '../common/KopSurat';
import { MenuPlan, SppgProfile } from '../../types';

interface MenuPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu: MenuPlan | null;
  profile: SppgProfile;
}

export default function MenuPreviewModal({
  isOpen,
  onClose,
  menu,
  profile
}: MenuPreviewModalProps) {
  if (!menu) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatIDR = (val?: number) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Resmi Lembar Menu MBG"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Printable Paper Canvas */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm print-container">
          <KopSurat
            documentTitle="LEMBAR PERENCANAAN & SPESIFIKASI MENU HARIAN"
            documentNumber={`MENU/SPPG-KRJ2/${menu.date.replace(/-/g, '')}/${menu.mealTime.toUpperCase()}`}
            date={`Tanggal Distribusi: ${menu.date}`}
          />

          {/* Meta Info Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs mb-5 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hari & Tanggal:</span>
                <strong className="text-slate-900 font-bold">{menu.dayName || 'Hari'}, {menu.date}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Makan:</span>
                <strong className="text-sky-900 font-bold">{menu.mealTime}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Periode Menu:</span>
                <strong className="text-slate-900 font-bold">{menu.menuPeriod || 'Mingguan'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Verifikasi:</span>
                <span className="inline-block px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {menu.status}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Menu Utama:</span>
                <h3 className="text-sm font-black text-sky-950">{menu.name}</h3>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelompok Penerima:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(menu.targetGroups || ['Siswa SD/MI', 'Siswa SMP/MTs']).map((grp, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                      {grp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Structured Dish Items Table */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-sky-600" />
              Daftar Komponen & Item Hidangan yang Disajikan
            </h4>
            
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="p-2.5 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="p-2.5 border-r border-slate-300 w-36">Komponen Menu</th>
                    <th className="p-2.5 border-r border-slate-300">Nama Item Hidangan</th>
                    <th className="p-2.5 text-center w-24">Porsi / Gramasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {menu.dishItems && menu.dishItems.length > 0 ? (
                    menu.dishItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-sky-900">{item.category}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">{item.dishName}</td>
                        <td className="p-2 text-center font-mono text-slate-600">
                          {item.gramasi ? `${item.gramasi} g` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    (menu.components || []).map((comp, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-sky-900">Komponen MBG</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{comp}</td>
                        <td className="p-2 text-center text-slate-500">Standar</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portions & Nutrition Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-sky-800 uppercase block">Rincian Sasaran Produksi:</span>
              <div className="flex justify-between">
                <span>Porsi Kecil (Balita / SD 1-3):</span>
                <strong>{menu.smallPortions} Porsi</strong>
              </div>
              <div className="flex justify-between">
                <span>Porsi Besar (SD 4-6 / SMP / Guru):</span>
                <strong>{menu.largePortions} Porsi</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-sky-200 text-sky-950 font-black">
                <span>Total Distribusi Hari Ini:</span>
                <span>{menu.totalPortions} Porsi</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Estimasi Kandungan Gizi & Biaya:</span>
              <div className="flex justify-between">
                <span>Energi / Kalori Per Porsi:</span>
                <strong>{menu.totalEnergyKcal || 807} kkal (AKG 35%)</strong>
              </div>
              <div className="flex justify-between">
                <span>Protein Per Porsi:</span>
                <strong>{menu.totalProteinG || 29.9} g</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200 text-emerald-950 font-black">
                <span>Estimasi Food Cost / Porsi:</span>
                <span>{formatIDR(menu.foodCostSmall || 6500)} - {formatIDR(menu.foodCostLarge || 8500)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {menu.notes && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900 mb-6">
              <strong className="block text-[10px] uppercase font-bold text-amber-800 mb-0.5">Catatan & Petunjuk Dapur:</strong>
              {menu.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala SPPG Krejengan 2</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">{profile.headName}</p>
              <p className="text-[10px] text-slate-500">{profile.headNip ? `NIP. ${profile.headNip}` : 'Kepala Satuan Pelayanan'}</p>
            </div>
            <div>
              <p>Probolinggo, {menu.date}</p>
              <p className="font-bold text-slate-900">Petugas PLOG / Ahli Gizi</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">{profile.nutritionistName}</p>
              <p className="text-[10px] text-slate-500">{profile.nutritionistStr ? `No. STR: ${profile.nutritionistStr}` : 'Nutrisionis SPPG'}</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (No Print) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar Menu (A4 / PDF)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
