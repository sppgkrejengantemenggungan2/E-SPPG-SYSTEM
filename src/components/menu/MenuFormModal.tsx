import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Users,
  UtensilsCrossed,
  Layers,
  Sparkles
} from 'lucide-react';
import Modal from '../common/Modal';
import { MenuPlan, MenuItemDish, DishComponentCategory, MenuStatus } from '../../types';
import { getDayNameFromDate } from '../../services/menuService';

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menuData: Partial<MenuPlan>) => Promise<void>;
  initialMenu?: Partial<MenuPlan> | null;
  allMenus: MenuPlan[];
}

const DISH_CATEGORIES: { category: DishComponentCategory; color: string; example: string }[] = [
  { category: 'Karbohidrat', color: 'bg-amber-50 text-amber-800 border-amber-300', example: 'Nasi putih, Kentang rebus, Jagung' },
  { category: 'Protein Hewani', color: 'bg-rose-50 text-rose-800 border-rose-300', example: 'Ayam kecap, Telur balado, Ikan crispy' },
  { category: 'Protein Nabati', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', example: 'Tempe mendoan, Tahu goreng, Orek tempe' },
  { category: 'Sayur', color: 'bg-green-50 text-green-800 border-green-300', example: 'Tumis buncis, Sayur bening bayam, Sop sayur' },
  { category: 'Buah', color: 'bg-orange-50 text-orange-800 border-orange-300', example: 'Semangka potong, Pisang ambon, Melon' },
  { category: 'Susu', color: 'bg-sky-50 text-sky-800 border-sky-300', example: 'Susu UHT Ultra Mimi 125ml, Susu segar' },
  { category: 'Tambahan', color: 'bg-purple-50 text-purple-800 border-purple-300', example: 'Kerupuk udang, Sambal manis, Saus' },
];

const TARGET_GROUP_OPTIONS = [
  'Balita',
  'Bumil',
  'Busui',
  'Siswa SD/MI',
  'Siswa SMP/MTs',
  'Siswa SMA/MA',
  'Santri',
  'Lainnya'
];

export default function MenuFormModal({
  isOpen,
  onClose,
  onSave,
  initialMenu,
  allMenus
}: MenuFormModalProps) {
  const [date, setDate] = useState<string>('');
  const [dayName, setDayName] = useState<string>('');
  const [menuPeriod, setMenuPeriod] = useState<string>('Mingguan');
  const [targetGroups, setTargetGroups] = useState<string[]>(['Siswa SD/MI', 'Siswa SMP/MTs']);
  const [mealTime, setMealTime] = useState<'Pagi' | 'Siang' | 'Sore'>('Siang');
  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<MenuStatus>('Draft');
  
  // Dish Items
  const [dishItems, setDishItems] = useState<MenuItemDish[]>([]);
  
  // Quick item input state
  const [newCategory, setNewCategory] = useState<DishComponentCategory>('Karbohidrat');
  const [newDishName, setNewDishName] = useState<string>('');
  const [newGramasi, setNewGramasi] = useState<string>('');

  const [smallPortions, setSmallPortions] = useState<number>(154);
  const [largePortions, setLargePortions] = useState<number>(2489);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMenu && isOpen) {
      const initDate = initialMenu.date || new Date().toISOString().split('T')[0];
      setDate(initDate);
      setDayName(initialMenu.dayName || getDayNameFromDate(initDate));
      setMenuPeriod(initialMenu.menuPeriod || 'Mingguan');
      setTargetGroups(initialMenu.targetGroups || ['Siswa SD/MI', 'Siswa SMP/MTs']);
      setMealTime(initialMenu.mealTime || 'Siang');
      setName(initialMenu.name || '');
      setNotes(initialMenu.notes || '');
      setStatus((initialMenu.status as MenuStatus) || 'Draft');
      setSmallPortions(initialMenu.smallPortions ?? 154);
      setLargePortions(initialMenu.largePortions ?? 2489);

      // Populate dish items from initialMenu.dishItems or build from components
      if (initialMenu.dishItems && initialMenu.dishItems.length > 0) {
        setDishItems(initialMenu.dishItems);
      } else if (initialMenu.components && initialMenu.components.length > 0) {
        // Fallback: convert components string array to dish items
        const generated: MenuItemDish[] = initialMenu.components.map((comp, idx) => {
          let cat: DishComponentCategory = 'Tambahan';
          const lower = comp.toLowerCase();
          if (lower.includes('nasi') || lower.includes('kentang') || lower.includes('beras')) cat = 'Karbohidrat';
          else if (lower.includes('ayam') || lower.includes('daging') || lower.includes('ikan') || lower.includes('telur')) cat = 'Protein Hewani';
          else if (lower.includes('tempe') || lower.includes('tahu')) cat = 'Protein Nabati';
          else if (lower.includes('sayur') || lower.includes('bayam') || lower.includes('sop') || lower.includes('buncis')) cat = 'Sayur';
          else if (lower.includes('pisang') || lower.includes('semangka') || lower.includes('melon') || lower.includes('buah')) cat = 'Buah';
          else if (lower.includes('susu')) cat = 'Susu';

          return {
            id: `dish-${Date.now()}-${idx}`,
            category: cat,
            dishName: comp,
            gramasi: cat === 'Karbohidrat' ? 120 : (cat === 'Protein Hewani' ? 65 : 50)
          };
        });
        setDishItems(generated);
      } else {
        // Default standard MBG dishes
        setDishItems([
          { id: 'd-1', category: 'Karbohidrat', dishName: 'Nasi putih pulen', gramasi: 120 },
          { id: 'd-2', category: 'Protein Hewani', dishName: 'Ayam kecap manis gurih', gramasi: 65 },
          { id: 'd-3', category: 'Protein Nabati', dishName: 'Orek tempe kedelai', gramasi: 40 },
          { id: 'd-4', category: 'Sayur', dishName: 'Tumis buncis wortel segar', gramasi: 75 },
          { id: 'd-5', category: 'Buah', dishName: 'Pisang ambon / Semangka merah', gramasi: 90 },
          { id: 'd-6', category: 'Susu', dishName: 'Susu UHT Ultra Mimi plain 125 ml', gramasi: 125 }
        ]);
      }
    } else if (isOpen) {
      // Create new
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDayName(getDayNameFromDate(today));
      setMenuPeriod('Mingguan');
      setTargetGroups(['Siswa SD/MI', 'Siswa SMP/MTs']);
      setMealTime('Siang');
      setName('');
      setNotes('Menu disajikan higienis berstandar AKG 35% kebutuhan gizi harian.');
      setStatus('Draft');
      setSmallPortions(154);
      setLargePortions(2489);
      setDishItems([
        { id: 'd-1', category: 'Karbohidrat', dishName: 'Nasi putih', gramasi: 120 },
        { id: 'd-2', category: 'Protein Hewani', dishName: 'Ayam kecap', gramasi: 65 },
        { id: 'd-3', category: 'Protein Nabati', dishName: 'Tempe mendoan', gramasi: 40 },
        { id: 'd-4', category: 'Sayur', dishName: 'Sayur bening bayam', gramasi: 75 },
        { id: 'd-5', category: 'Buah', dishName: 'Pisang ambon', gramasi: 90 },
        { id: 'd-6', category: 'Susu', dishName: 'Susu UHT plain 125 ml', gramasi: 125 }
      ]);
    }
  }, [initialMenu, isOpen]);

  // When date changes, automatically update dayName
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const computedDay = getDayNameFromDate(newDate);
    setDayName(computedDay);
  };

  // Toggle Target Group
  const toggleTargetGroup = (group: string) => {
    setTargetGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Add new dish item
  const handleAddDishItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDishName.trim()) return;

    const newItem: MenuItemDish = {
      id: `dish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: newCategory,
      dishName: newDishName.trim(),
      gramasi: newGramasi ? Number(newGramasi) : undefined
    };

    setDishItems(prev => [...prev, newItem]);
    setNewDishName('');
    setNewGramasi('');
  };

  // Remove dish item
  const handleRemoveDishItem = (id: string) => {
    setDishItems(prev => prev.filter(d => d.id !== id));
  };

  // SALIN MENU HARI SEBELUMNYA
  const handleCopyPreviousDay = () => {
    if (!allMenus || allMenus.length === 0) {
      alert('Belum ada menu tersimpan untuk disalin.');
      return;
    }

    // Try to find menu of previous day: date - 1 day
    let previousMenu: MenuPlan | undefined;
    if (date) {
      const cur = new Date(date);
      cur.setDate(cur.getDate() - 1);
      const prevDateStr = cur.toISOString().split('T')[0];
      previousMenu = allMenus.find(m => m.date === prevDateStr);
    }

    // Fallback: take latest menu that is not current menu
    if (!previousMenu) {
      const candidates = allMenus.filter(m => m.id !== initialMenu?.id);
      if (candidates.length > 0) {
        // Sort descending by date
        candidates.sort((a, b) => b.date.localeCompare(a.date));
        previousMenu = candidates[0];
      }
    }

    if (!previousMenu) {
      alert('Tidak ditemukan menu hari sebelumnya untuk disalin.');
      return;
    }

    // Copy components and fields
    setName(`Paket Bergizi: ${previousMenu.name.replace(/\s*\(Duplikat\)/g, '')}`);
    setMealTime(previousMenu.mealTime || 'Siang');
    setMenuPeriod(previousMenu.menuPeriod || 'Mingguan');
    setTargetGroups(previousMenu.targetGroups || ['Siswa SD/MI', 'Siswa SMP/MTs']);
    setNotes(previousMenu.notes || '');
    
    if (previousMenu.dishItems && previousMenu.dishItems.length > 0) {
      setDishItems(previousMenu.dishItems.map(d => ({
        ...d,
        id: `dish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      })));
    } else if (previousMenu.components) {
      const converted: MenuItemDish[] = previousMenu.components.map((c, i) => ({
        id: `dish-${Date.now()}-${i}`,
        category: i === 0 ? 'Karbohidrat' : (i === 1 ? 'Protein Hewani' : (i === 2 ? 'Protein Nabati' : (i === 3 ? 'Sayur' : 'Buah'))),
        dishName: c
      }));
      setDishItems(converted);
    }

    setCopyNotification(`Berhasil menyalin data dari menu tanggal ${previousMenu.date} (${previousMenu.name})!`);
    setTimeout(() => setCopyNotification(null), 4000);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama menu utama wajib diisi.');
      return;
    }
    if (dishItems.length === 0) {
      alert('Harap tambahkan minimal 1 item hidangan pada menu.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build summary components string list
      const summaryComponents = dishItems.map(d => `${d.dishName}`);

      const total = Number(smallPortions) + Number(largePortions);

      const menuData: Partial<MenuPlan> = {
        ...initialMenu,
        name: name.trim(),
        date: date || new Date().toISOString().split('T')[0],
        dayName: dayName || getDayNameFromDate(date),
        menuPeriod,
        targetGroups,
        mealTime,
        components: summaryComponents,
        dishItems,
        notes: notes.trim(),
        status,
        smallPortions: Number(smallPortions),
        largePortions: Number(largePortions),
        totalPortions: total
      };

      await onSave(menuData);
      onClose();
    } catch (err) {
      console.error('Error saving menu form:', err);
      alert('Gagal menyimpan menu. Periksa koneksi ke Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMenu?.id ? 'Edit Data Nama & Item Menu MBG' : 'Form Input Nama & Menu Item MBG'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quick Toolbar: Salin Menu Hari Sebelumnya */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-2xl border border-sky-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-bold text-sky-950">
              Form Standar Siklus Pemenuhan Gizi (SPPG BGN RI)
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyPreviousDay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-800 rounded-xl text-xs font-bold border border-sky-300 shadow-2xs transition-colors cursor-pointer"
            title="Salin komponen & resep dari menu kemarin"
          >
            <Copy className="w-3.5 h-3.5 text-sky-600" />
            <span>Salin Menu Hari Sebelumnya</span>
          </button>
        </div>

        {copyNotification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{copyNotification}</span>
          </div>
        )}

        {/* 1. TANGGAL DISTRIBUSI, HARI (OTOMATIS), PERIODE MENU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tanggal Distribusi *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-sky-950 bg-white focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Tanggal menu disajikan</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
              <span>Hari</span>
              <span className="text-[10px] text-sky-600 font-semibold bg-sky-100 px-1.5 py-0.2 rounded">Otomatis</span>
            </label>
            <div className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-sky-900 bg-sky-50/70 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>{dayName || 'Pilih tanggal'}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Dihitung otomatis dari tanggal</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Periode Menu *
            </label>
            <select
              value={menuPeriod}
              onChange={e => setMenuPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-sky-500"
            >
              <option value="Mingguan">Mingguan</option>
              <option value="Bulanan">Bulanan</option>
              <option value="Siklus 10 Hari">Siklus 10 Hari</option>
              <option value="Siklus 20 Hari">Siklus 20 Hari</option>
              <option value="Siklus">Siklus</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Siklus perputaran menu</span>
          </div>
        </div>

        {/* 2. WAKTU MAKAN & STATUS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Waktu Makan *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Pagi', 'Siang', 'Sore'] as const).map(wt => (
                <button
                  key={wt}
                  type="button"
                  onClick={() => setMealTime(wt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    mealTime === wt
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {wt === 'Pagi' ? 'Pagi (Sarapan)' : (wt === 'Siang' ? 'Siang (Utama)' : 'Sore')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Status Menu *
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MenuStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-sky-500"
            >
              <option value="Draft">Draft (Konsep)</option>
              <option value="Diajukan">Diajukan (Menunggu Pengawas Gizi)</option>
              <option value="Disetujui">Disetujui (Siap Masak & Distribusi)</option>
              <option value="Ditolak">Ditolak (Perlu Revisi Bahan/Gizi)</option>
              <option value="Dipublikasikan">Dipublikasikan (Bisa Dilihat Sekolah/Flyer)</option>
            </select>
          </div>
        </div>

        {/* 3. KELOMPOK PENERIMA (MULTI-SELECT) */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
            <span>Kelompok Penerima Manfaat *</span>
            <span className="text-[11px] text-slate-400 font-normal">Pilih satu atau lebih</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_GROUP_OPTIONS.map(grp => {
              const active = targetGroups.includes(grp);
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => toggleTargetGroup(grp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                  }`}
                >
                  {active ? `✓ ${grp}` : `+ ${grp}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. NAMA MENU UTAMA */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Nama Menu Utama *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
            placeholder="Contoh: Nasi Ayam Kecap Manis & Sayur Bening Bayam Wortel"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Nama paket sajian lengkap yang akan ditampilkan di jadwal menu, flyer MBG, dan BAST.
          </span>
        </div>

        {/* 5. KOMPONEN MENU & NAMA ITEM HIDANGAN (BAGIAN UTAMA FORM) */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-sky-600" />
                Komponen Menu & Nama Item Hidangan
              </h4>
              <p className="text-[11px] text-slate-500">
                Standar 7 komponen: Karbohidrat, Protein Hewani, Protein Nabati, Sayur, Buah, Susu, Tambahan.
              </p>
            </div>
            <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
              {dishItems.length} Item
            </span>
          </div>

          {/* Form Mini: Tambah Item Hidangan */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">Tambah Item Hidangan:</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as DishComponentCategory)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  {DISH_CATEGORIES.map(c => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={newDishName}
                  onChange={e => setNewDishName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDishItem();
                    }
                  }}
                  placeholder="Nama item hidangan (misal: Nasi putih)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-1.5">
                <input
                  type="number"
                  value={newGramasi}
                  onChange={e => setNewGramasi(e.target.value)}
                  placeholder="Gram (120g)"
                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAddDishItem()}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* List of Dish Items added */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {dishItems.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                Belum ada item hidangan. Gunakan form di atas untuk menambahkan.
              </div>
            ) : (
              dishItems.map((item, idx) => {
                const catDef = DISH_CATEGORIES.find(c => c.category === item.category) || DISH_CATEGORIES[0];
                return (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catDef.color}`}>
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {item.dishName}
                      </span>
                      {item.gramasi && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.gramasi}g/porsi
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDishItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Hapus item hidangan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 6. TARGET PORSI MBG */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Target Porsi Kecil (Balita & SD Kelas 1-3)
            </label>
            <input
              type="number"
              min="0"
              value={smallPortions}
              onChange={e => setSmallPortions(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Target Porsi Besar (SD 4-6, SMP & Guru)
            </label>
            <input
              type="number"
              min="0"
              value={largePortions}
              onChange={e => setLargePortions(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
            />
          </div>
        </div>

        {/* 7. CATATAN KETERANGAN MENU */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Catatan / Keterangan Menu
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-sky-500"
            placeholder="Informasi alergen, suhu penyajian, petunjuk pengolahan khusus..."
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data Menu'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
