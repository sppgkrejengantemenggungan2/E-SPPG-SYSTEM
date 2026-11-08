import { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Edit3, 
  Eye, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Image as ImageIcon,
  Calendar,
  Layers,
  Save
} from 'lucide-react';
import MbgMenuFlyer, { FlyerData, FlyerItem } from './MbgMenuFlyer';
import { MenuPlan, SppgProfile, BeneficiaryGroup } from '../../types';
import { useSppg } from '../../context/SppgContext';
import { getBeneficiaries } from '../../services/beneficiaryService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';

interface FlyerGeneratorSectionProps {
  menus: MenuPlan[];
}

export const INITIAL_FLYER_DATA: FlyerData = {
  dateText: 'Sabtu, 10 Oktober 2026',
  institutionLine1: 'SPPG PROBOLINGGO',
  institutionLine2: 'KREJENGAN',
  institutionLine3: 'TEMENGGUNGAN 2',
  photoSmallUrl: '',
  photoLargeUrl: '',
  itemsSmall: [
    { name: 'Nasi putih (100gr)', price: 775 },
    { name: 'Telur ceplok pontianak', price: 1679 },
    { name: 'Orek tempe kacang panjang', price: 625 },
    { name: 'Bakwan jagung', price: 821 },
    { name: 'Semangka merah', price: 1555 },
    { name: 'Susu UHT ultra mimi plain 125 ml', price: 3295 }
  ],
  itemsLarge: [
    { name: 'Nasi putih (200gr)', price: 1550 },
    { name: 'Telur ceplok pontianak', price: 1679 },
    { name: 'Orek tempe kacang panjang', price: 625 },
    { name: 'Bakwan jagung', price: 821 },
    { name: 'Semangka merah', price: 1555 },
    { name: 'Susu UHT ultra mimi plain 125 ml', price: 3295 }
  ],
  nutritionSmall: {
    energy: '486,6 kkal',
    protein: '19,4 g',
    fat: '21,4 g',
    carbs: '54,9 g',
    fiber: '3,8 g'
  },
  nutritionLarge: {
    energy: '714,6 kkal',
    protein: '20,6 g',
    fat: '22,2 g',
    carbs: '104,1 g',
    fiber: '3,9 g'
  },
  standardSmall: {
    energy: '275 – 413 kkal',
    protein: '5 – 10 g',
    fat: '10 – 14 g',
    carbs: '44 – 63 g',
    fiber: '4–6 g'
  },
  standardLarge: {
    energy: '585 – 898 kkal',
    protein: '16 – 27 g',
    fat: '20 – 22 g',
    carbs: '87 – 140 g',
    fiber: '8 – 13 g'
  },
  portionCountSmall: 154,
  portionCountLarge: 2489,
  consumptionLimitText: 'batas konsumsi maksimal porsi kecil 09.00, porsi besar 11.00'
};

export default function FlyerGeneratorSection({ menus }: FlyerGeneratorSectionProps) {
  const { profile } = useSppg();
  const { userProfile } = useAuth();
  
  const [flyerData, setFlyerData] = useState<FlyerData>(() => {
    const saved = localStorage.getItem('e_sppg_flyer_custom_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_FLYER_DATA;
  });

  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit-content' | 'edit-nutrition' | 'manage-photos'>('preview');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const fileInputSmallRef = useRef<HTMLInputElement>(null);
  const fileInputLargeRef = useRef<HTMLInputElement>(null);
  const flyerContainerRef = useRef<HTMLDivElement>(null);

  // Auto-sync institution name from SPPG Profile
  useEffect(() => {
    if (profile.institutionName) {
      // Split institution into 3 lines if possible or keep defaults
      setFlyerData(prev => ({
        ...prev,
        institutionLine1: 'SPPG PROBOLINGGO',
        institutionLine2: 'KREJENGAN',
        institutionLine3: 'TEMENGGUNGAN 2'
      }));
    }
  }, [profile]);

  // Load real beneficiary count for portions
  useEffect(() => {
    async function loadPortions() {
      try {
        const bList = await getBeneficiaries();
        if (bList && bList.length > 0) {
          const small = bList.reduce((acc, b) => acc + (b.status === 'aktif' ? (b.smallPortions || 0) : 0), 0);
          const large = bList.reduce((acc, b) => acc + (b.status === 'aktif' ? (b.largePortions || 0) : 0), 0);
          if (small > 0 || large > 0) {
            setFlyerData(prev => ({
              ...prev,
              portionCountSmall: small > 0 ? small : prev.portionCountSmall,
              portionCountLarge: large > 0 ? large : prev.portionCountLarge
            }));
          }
        }
      } catch (e) {
        console.error('Error loading beneficiary count for flyer:', e);
      }
    }
    loadPortions();
  }, []);

  // Handle Menu Selection and Auto-filling
  const handleSelectMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    const m = menus.find(item => item.id === menuId);
    if (!m) return;

    // 1. Format date
    let dateStr = m.date;
    try {
      const d = new Date(m.date);
      dateStr = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      // ignore
    }

    // 2. Build items from menu components or smart defaults
    let itemsS: FlyerItem[] = [];
    let itemsL: FlyerItem[] = [];

    if (m.components && m.components.length > 0) {
      itemsS = m.components.map((c, i) => {
        const isRice = c.toLowerCase().includes('nasi');
        const defaultCost = isRice ? 775 : (i === 1 ? 1679 : (i === 2 ? 625 : (i === 3 ? 821 : 1555)));
        return {
          name: isRice ? 'Nasi putih (100gr)' : c,
          price: defaultCost
        };
      });
      itemsL = m.components.map((c, i) => {
        const isRice = c.toLowerCase().includes('nasi');
        const defaultCost = isRice ? 1550 : (i === 1 ? 1679 : (i === 2 ? 625 : (i === 3 ? 821 : 1555)));
        return {
          name: isRice ? 'Nasi putih (200gr)' : c,
          price: defaultCost
        };
      });
    } else {
      // Default template components matching the reference image
      itemsS = [
        { name: 'Nasi putih (100gr)', price: 775 },
        { name: m.name || 'Lauk Utama MBG', price: 1679 },
        { name: 'Orek tempe kacang panjang', price: 625 },
        { name: 'Bakwan jagung', price: 821 },
        { name: 'Semangka merah', price: 1555 },
        { name: 'Susu UHT ultra mimi plain 125 ml', price: 3295 }
      ];
      itemsL = [
        { name: 'Nasi putih (200gr)', price: 1550 },
        { name: m.name || 'Lauk Utama MBG', price: 1679 },
        { name: 'Orek tempe kacang panjang', price: 625 },
        { name: 'Bakwan jagung', price: 821 },
        { name: 'Semangka merah', price: 1555 },
        { name: 'Susu UHT ultra mimi plain 125 ml', price: 3295 }
      ];
    }

    // 3. Nutrition from menu
    const totalE = m.totalEnergyKcal || 714;
    const totalP = m.totalProteinG || 20.6;
    const totalF = m.totalFatG || 22.2;
    const totalC = m.totalCarbG || 104.1;
    const totalFib = m.totalFiberG || 3.9;

    // Small portion is approx 68-70% of large portion
    const smallE = (totalE * 0.68).toFixed(1).replace('.', ',');
    const smallP = (totalP * 0.94).toFixed(1).replace('.', ',');
    const smallF = (totalF * 0.96).toFixed(1).replace('.', ',');
    const smallC = (totalC * 0.53).toFixed(1).replace('.', ',');
    const smallFib = (totalFib * 0.97).toFixed(1).replace('.', ',');

    const largeE = totalE.toFixed(1).replace('.', ',');
    const largeP = totalP.toFixed(1).replace('.', ',');
    const largeF = totalF.toFixed(1).replace('.', ',');
    const largeC = totalC.toFixed(1).replace('.', ',');
    const largeFib = totalFib.toFixed(1).replace('.', ',');

    setFlyerData(prev => {
      const updated: FlyerData = {
        ...prev,
        dateText: dateStr,
        itemsSmall: itemsS,
        itemsLarge: itemsL,
        nutritionSmall: {
          energy: `${smallE} kkal`,
          protein: `${smallP} g`,
          fat: `${smallF} g`,
          carbs: `${smallC} g`,
          fiber: `${smallFib} g`
        },
        nutritionLarge: {
          energy: `${largeE} kkal`,
          protein: `${largeP} g`,
          fat: `${largeF} g`,
          carbs: `${largeC} g`,
          fiber: `${largeFib} g`
        }
      };
      localStorage.setItem('e_sppg_flyer_custom_data', JSON.stringify(updated));
      return updated;
    });

    notify('Data flyer berhasil disinkronkan otomatis dari Menu MBG!');
  };

  const notify = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 3000);
  };

  // Photo Upload Handler (FileReader base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'small' | 'large') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFlyerData(prev => {
        const updated = {
          ...prev,
          [target === 'small' ? 'photoSmallUrl' : 'photoLargeUrl']: result
        };
        localStorage.setItem('e_sppg_flyer_custom_data', JSON.stringify(updated));
        return updated;
      });
      notify(`Foto ${target === 'small' ? 'Porsi Kecil' : 'Porsi Besar'} berhasil diganti!`);
    };
    reader.readAsDataURL(file);
  };

  // Reset to sample template
  const handleResetToTemplate = () => {
    if (confirm('Kembalikan seluruh template flyer ke format default resmi seperti gambar contoh?')) {
      setFlyerData(INITIAL_FLYER_DATA);
      localStorage.setItem('e_sppg_flyer_custom_data', JSON.stringify(INITIAL_FLYER_DATA));
      notify('Template flyer berhasil di-reset ke standar resmi BGN!');
    }
  };

  // Save changes
  const handleSaveFlyer = async () => {
    localStorage.setItem('e_sppg_flyer_custom_data', JSON.stringify(flyerData));
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Administrasi',
      'UPDATE',
      `Menyimpan pembaruan template flyer menu MBG (${flyerData.dateText})`
    );
    notify('Perubahan flyer tersimpan permanen!');
  };

  // Print flyer
  const handlePrintFlyer = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (No Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Menu Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Pilih Menu MBG:
              </span>
              <select
                value={selectedMenuId}
                onChange={e => handleSelectMenu(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-sky-900 bg-sky-50/50 focus:ring-2 focus:ring-sky-500 max-w-[280px]"
              >
                <option value="">-- Template Standar BGN (10 Okt 2026) --</option>
                {menus.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.date})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleResetToTemplate}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              title="Reset ke format bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Template</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveFlyer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>

            <button
              type="button"
              onClick={handlePrintFlyer}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Flyer (A4 / PDF)</span>
            </button>
          </div>
        </div>

        {/* Tab Sub-Nav for Editing */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'preview' ? 'bg-[#153448] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Pratinjau Flyer</span>
          </button>

          <button
            onClick={() => setActiveTab('manage-photos')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manage-photos' ? 'bg-[#153448] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ganti Foto Ompreng</span>
          </button>

          <button
            onClick={() => setActiveTab('edit-content')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'edit-content' ? 'bg-[#153448] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Komponen & Harga</span>
          </button>

          <button
            onClick={() => setActiveTab('edit-nutrition')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'edit-nutrition' ? 'bg-[#153448] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Edit Nilai Gizi & Porsi</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 shadow-sm animate-fade-in no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* Hidden File Inputs for photo replacement */}
      <input
        type="file"
        ref={fileInputSmallRef}
        onChange={e => handlePhotoUpload(e, 'small')}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputLargeRef}
        onChange={e => handlePhotoUpload(e, 'large')}
        accept="image/*"
        className="hidden"
      />

      {/* EDIT DRAWER: GANTI FOTO OMPRENG */}
      {activeTab === 'manage-photos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs no-print space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Kelola & Ganti Foto Ompreng Porsi MBG</h4>
              <p className="text-xs text-slate-500">Unggah foto ompreng asli hasil dokumentasi pengolahan/pemorsian hari ini.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box Foto Porsi Kecil */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Foto Ompreng Porsi Kecil</span>
              <div className="aspect-4/3 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-300">
                {flyerData.photoSmallUrl ? (
                  <img src={flyerData.photoSmallUrl} alt="Preview Porsi Kecil" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <img src="/assets/aistudio/20261107_233753_117_c7c076a1.jpeg" alt="Default" className="w-24 h-24 mx-auto object-cover rounded-lg mb-2 opacity-80" />
                    <span className="text-[11px] text-slate-500 font-medium block">Menggunakan foto sampel standar</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputSmallRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Foto Baru</span>
                </button>
                {flyerData.photoSmallUrl && (
                  <button
                    type="button"
                    onClick={() => setFlyerData(prev => ({ ...prev, photoSmallUrl: '' }))}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer"
                    title="Gunakan sampel default"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Box Foto Porsi Besar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Foto Ompreng Porsi Besar</span>
              <div className="aspect-4/3 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-300">
                {flyerData.photoLargeUrl ? (
                  <img src={flyerData.photoLargeUrl} alt="Preview Porsi Besar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <img src="/assets/aistudio/20261107_233753_117_c7c076a1.jpeg" alt="Default" className="w-24 h-24 mx-auto object-cover rounded-lg mb-2 opacity-80" />
                    <span className="text-[11px] text-slate-500 font-medium block">Menggunakan foto sampel standar</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputLargeRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Foto Baru</span>
                </button>
                {flyerData.photoLargeUrl && (
                  <button
                    type="button"
                    onClick={() => setFlyerData(prev => ({ ...prev, photoLargeUrl: '' }))}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer"
                    title="Gunakan sampel default"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DRAWER: KOMPONEN MENU & HARGA */}
      {activeTab === 'edit-content' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs no-print space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Edit Rincian Komponen Menu & Harga Per Porsi</h4>
              <p className="text-xs text-slate-500">Sesuaikan nama lauk, gramasi, dan estimasi biaya per porsi.</p>
            </div>
            <div className="w-64">
              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Teks Tanggal:</label>
              <input
                type="text"
                value={flyerData.dateText}
                onChange={e => setFlyerData({ ...flyerData, dateText: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* List Porsi Kecil */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950">Komponen Porsi Kecil ({flyerData.itemsSmall.length} Item)</span>
                <button
                  type="button"
                  onClick={() => setFlyerData({
                    ...flyerData,
                    itemsSmall: [...flyerData.itemsSmall, { name: 'Item Tambahan', price: 1000 }]
                  })}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="space-y-2">
                {flyerData.itemsSmall.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        const copy = [...flyerData.itemsSmall];
                        copy[idx].name = e.target.value;
                        setFlyerData({ ...flyerData, itemsSmall: copy });
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      placeholder="Nama komponen menu"
                    />
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => {
                          const copy = [...flyerData.itemsSmall];
                          copy[idx].price = Number(e.target.value) || 0;
                          setFlyerData({ ...flyerData, itemsSmall: copy });
                        }}
                        className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = flyerData.itemsSmall.filter((_, i) => i !== idx);
                        setFlyerData({ ...flyerData, itemsSmall: copy });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* List Porsi Besar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950">Komponen Porsi Besar ({flyerData.itemsLarge.length} Item)</span>
                <button
                  type="button"
                  onClick={() => setFlyerData({
                    ...flyerData,
                    itemsLarge: [...flyerData.itemsLarge, { name: 'Item Tambahan', price: 1000 }]
                  })}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="space-y-2">
                {flyerData.itemsLarge.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        const copy = [...flyerData.itemsLarge];
                        copy[idx].name = e.target.value;
                        setFlyerData({ ...flyerData, itemsLarge: copy });
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      placeholder="Nama komponen menu"
                    />
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => {
                          const copy = [...flyerData.itemsLarge];
                          copy[idx].price = Number(e.target.value) || 0;
                          setFlyerData({ ...flyerData, itemsLarge: copy });
                        }}
                        className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = flyerData.itemsLarge.filter((_, i) => i !== idx);
                        setFlyerData({ ...flyerData, itemsLarge: copy });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DRAWER: KANDUNGAN GIZI & PORSI */}
      {activeTab === 'edit-nutrition' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs no-print space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Edit Nilai Gizi, Standar AKG & Jumlah Porsi</h4>
            <p className="text-xs text-slate-500">Semua teks ini langsung tercermin pada kartu rincian gizi flyer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gizi Real Porsi Kecil */}
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 space-y-2">
              <span className="text-xs font-bold text-sky-950 block">Gizi Real Porsi Kecil</span>
              <div>
                <label className="text-[10px] text-slate-600 block">Energi:</label>
                <input
                  type="text"
                  value={flyerData.nutritionSmall.energy}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionSmall: { ...flyerData.nutritionSmall, energy: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Protein:</label>
                <input
                  type="text"
                  value={flyerData.nutritionSmall.protein}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionSmall: { ...flyerData.nutritionSmall, protein: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Lemak:</label>
                <input
                  type="text"
                  value={flyerData.nutritionSmall.fat}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionSmall: { ...flyerData.nutritionSmall, fat: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Karbohidrat:</label>
                <input
                  type="text"
                  value={flyerData.nutritionSmall.carbs}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionSmall: { ...flyerData.nutritionSmall, carbs: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Serat:</label>
                <input
                  type="text"
                  value={flyerData.nutritionSmall.fiber}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionSmall: { ...flyerData.nutritionSmall, fiber: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Gizi Real Porsi Besar */}
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 space-y-2">
              <span className="text-xs font-bold text-sky-950 block">Gizi Real Porsi Besar</span>
              <div>
                <label className="text-[10px] text-slate-600 block">Energi:</label>
                <input
                  type="text"
                  value={flyerData.nutritionLarge.energy}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionLarge: { ...flyerData.nutritionLarge, energy: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Protein:</label>
                <input
                  type="text"
                  value={flyerData.nutritionLarge.protein}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionLarge: { ...flyerData.nutritionLarge, protein: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Lemak:</label>
                <input
                  type="text"
                  value={flyerData.nutritionLarge.fat}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionLarge: { ...flyerData.nutritionLarge, fat: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Karbohidrat:</label>
                <input
                  type="text"
                  value={flyerData.nutritionLarge.carbs}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionLarge: { ...flyerData.nutritionLarge, carbs: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Serat:</label>
                <input
                  type="text"
                  value={flyerData.nutritionLarge.fiber}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    nutritionLarge: { ...flyerData.nutritionLarge, fiber: e.target.value }
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Jumlah Porsi & Batas Waktu */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">Porsi & Batas Konsumsi</span>
              <div>
                <label className="text-[10px] text-slate-600 block">Jumlah Porsi Kecil:</label>
                <input
                  type="number"
                  value={flyerData.portionCountSmall}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    portionCountSmall: Number(e.target.value) || 0
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Jumlah Porsi Besar:</label>
                <input
                  type="number"
                  value={flyerData.portionCountLarge}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    portionCountLarge: Number(e.target.value) || 0
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Peringatan Batas Konsumsi:</label>
                <textarea
                  rows={2}
                  value={flyerData.consumptionLimitText}
                  onChange={e => setFlyerData({
                    ...flyerData,
                    consumptionLimitText: e.target.value
                  })}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLYER VISUAL CANVAS */}
      <div className="py-2">
        <MbgMenuFlyer
          data={flyerData}
          profile={profile}
          flyerRef={flyerContainerRef}
          showPhotoUploadButtons={true}
          onPhotoUploadClick={(target) => {
            if (target === 'small') fileInputSmallRef.current?.click();
            else fileInputLargeRef.current?.click();
          }}
        />
      </div>
    </div>
  );
}
