import { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Calculator, 
  PieChart, 
  DollarSign, 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  Edit3, 
  FileText,
  Copy,
  Eye,
  Printer,
  Download,
  Search,
  Filter,
  Sparkles,
  Layers,
  Users,
  Clock,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getMenus, saveMenu, deleteMenu, duplicateMenu, getDayNameFromDate } from '../services/menuService';
import { getFoodIngredients } from '../services/foodIngredientService';
import { getBeneficiaries } from '../services/beneficiaryService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useSppg } from '../context/SppgContext';
import { MenuPlan, FoodIngredient, MenuIngredientItem, MenuStatus } from '../types';
import Modal from '../components/common/Modal';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';
import MenuFormModal from '../components/menu/MenuFormModal';
import MenuPreviewModal from '../components/menu/MenuPreviewModal';

interface PlogMenuPageProps {
  initialSubmodule?: string;
}

export default function PlogMenuPage({ initialSubmodule = 'menu-item' }: PlogMenuPageProps) {
  const { profile } = useSppg();
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu-item' | 'perencanaan' | 'kandungan-gizi' | 'food-cost'>('menu-item');
  const [menus, setMenus] = useState<MenuPlan[]>([]);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [mealTimeFilter, setMealTimeFilter] = useState<string>('Semua');
  const [periodFilter, setPeriodFilter] = useState<string>('Semua');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMenuData, setEditingMenuData] = useState<Partial<MenuPlan> | null>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewingMenu, setPreviewingMenu] = useState<MenuPlan | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Add Recipe Item (Tab 2)
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [weightGInput, setWeightGInput] = useState<number>(50);

  const canEdit = hasPermission('plog', 'canCreate');
  const canDelete = hasPermission('plog', 'canDelete');

  useEffect(() => {
    if (initialSubmodule === 'perencanaan') setActiveTab('perencanaan');
    else if (initialSubmodule === 'kandungan-gizi') setActiveTab('kandungan-gizi');
    else if (initialSubmodule === 'food-cost') setActiveTab('food-cost');
    else setActiveTab('menu-item');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [mList, ingList, bList] = await Promise.all([
        getMenus(),
        getFoodIngredients(),
        getBeneficiaries()
      ]);
      setMenus(mList || []);
      setIngredients(ingList || []);
      if (mList && mList.length > 0 && !selectedMenu) {
        setSelectedMenu(mList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveMenuFromModal = async (menuData: Partial<MenuPlan>) => {
    const saved = await saveMenu(menuData);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas PLOG',
      menuData.id ? 'UPDATE' : 'CREATE',
      `Menyimpan perencanaan menu: ${saved.name} (${saved.date})`
    );

    setIsFormModalOpen(false);
    await loadData();
    setSelectedMenu(saved);
    showToast(`Menu "${saved.name}" berhasil disimpan ke database!`);
  };

  const handleDuplicateMenu = async (menu: MenuPlan) => {
    try {
      const duplicated = await duplicateMenu(menu);
      await logAuditEvent(
        userProfile?.displayName || 'User',
        userProfile?.email || '',
        'Tugas PLOG',
        'CREATE',
        `Menduplikasi menu: ${menu.name} -> ${duplicated.name}`
      );
      await loadData();
      setSelectedMenu(duplicated);
      showToast(`Menu "${menu.name}" berhasil diduplikasi menjadi Draft baru!`);
    } catch (e) {
      console.error(e);
      alert('Gagal menduplikasi menu.');
    }
  };

  const handleQuickCopyPreviousDay = () => {
    if (!menus || menus.length === 0) {
      alert('Belum ada menu tersimpan untuk disalin.');
      return;
    }
    // Sort descending by date
    const sorted = [...menus].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];

    // Open form modal with cloned data for tomorrow or today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setEditingMenuData({
      ...latest,
      id: undefined,
      name: `${latest.name} (Salinan)`,
      date: tomorrowStr,
      dayName: getDayNameFromDate(tomorrowStr),
      status: 'Draft'
    });
    setIsFormModalOpen(true);
    showToast(`Data dimuat dari menu tanggal ${latest.date}. Silakan tinjau dan simpan.`);
  };

  const handleExportExcel = () => {
    if (!menus || menus.length === 0) {
      alert('Tidak ada data menu untuk diekspor.');
      return;
    }

    const rows = menus.map(m => {
      const dishDetails = m.dishItems && m.dishItems.length > 0
        ? m.dishItems.map(d => `[${d.category}] ${d.dishName}${d.gramasi ? ` (${d.gramasi}g)` : ''}`).join('; ')
        : (m.components || []).join(', ');

      return {
        'Tanggal Distribusi': m.date,
        'Hari': m.dayName || getDayNameFromDate(m.date),
        'Waktu Makan': m.mealTime,
        'Periode Menu': m.menuPeriod || 'Mingguan',
        'Nama Menu Utama': m.name,
        'Kelompok Penerima': (m.targetGroups || []).join(', ') || 'Siswa SD/MI, Siswa SMP/MTs',
        'Daftar Item Hidangan': dishDetails,
        'Porsi Kecil': m.smallPortions,
        'Porsi Besar': m.largePortions,
        'Total Porsi': m.totalPortions,
        'Status': m.status,
        'Total Energi (kkal)': m.totalEnergyKcal || 807,
        'Protein (g)': m.totalProteinG || 29.9,
        'Catatan': m.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Perencanaan Menu MBG');
    XLSX.writeFile(workbook, `Perencanaan_Menu_MBG_SPPG_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Data menu berhasil diekspor ke format Excel (.xlsx)!');
  };

  const handleAddIngredientToRecipe = async () => {
    if (!selectedMenu || !selectedIngredientId) return;
    const ing = ingredients.find(i => i.id === selectedIngredientId);
    if (!ing) return;

    const weightG = Number(weightGInput) || 10;
    const totalPortions = selectedMenu.totalPortions || 1;
    const totalNeededKg = Math.round(((weightG * totalPortions) / 1000) * 100) / 100;
    const totalCost = Math.round(totalNeededKg * ing.referencePrice);

    // Calculate nutrition per portion based on grams: (weightG / 100) * nutrition100g
    const energyKcal = Math.round(((weightG / 100) * ing.energyKcal) * 10) / 10;
    const proteinG = Math.round(((weightG / 100) * ing.proteinG) * 10) / 10;
    const fatG = Math.round(((weightG / 100) * ing.fatG) * 10) / 10;
    const carbG = Math.round(((weightG / 100) * ing.carbG) * 10) / 10;
    const fiberG = Math.round(((weightG / 100) * ing.fiberG) * 10) / 10;

    const newItem: MenuIngredientItem = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit,
      weightGPerPortion: weightG,
      unitPrice: ing.referencePrice,
      totalNeededKg,
      totalCost,
      energyKcal,
      proteinG,
      fatG,
      carbG,
      fiberG
    };

    const currentIngredients = [...(selectedMenu.ingredients || [])];
    const existingIndex = currentIngredients.findIndex(item => item.ingredientId === ing.id);
    if (existingIndex >= 0) {
      currentIngredients[existingIndex] = newItem;
    } else {
      currentIngredients.push(newItem);
    }

    const updated = await saveMenu({
      ...selectedMenu,
      ingredients: currentIngredients
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas PLOG',
      'UPDATE',
      `Menambahkan bahan resep [${ing.name}] pada menu [${selectedMenu.name}]`
    );

    setIsAddIngredientModalOpen(false);
    setSelectedMenu(updated);
    await loadData();
  };

  const handleRemoveRecipeIngredient = async (ingredientId: string) => {
    if (!selectedMenu) return;
    const filtered = (selectedMenu.ingredients || []).filter(i => i.ingredientId !== ingredientId);
    const updated = await saveMenu({
      ...selectedMenu,
      ingredients: filtered
    });
    setSelectedMenu(updated);
    await loadData();
  };

  const handleDeleteMenu = async (id: string, name: string) => {
    if (!confirm(`Hapus menu ${name}?`)) return;
    await deleteMenu(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Tugas PLOG', 'DELETE', `Menghapus menu ${name}`, id);
    setSelectedMenu(null);
    loadData();
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('menu-item')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'menu-item' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Nama & Item Menu
          </button>
          <button
            onClick={() => setActiveTab('perencanaan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'perencanaan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Perencanaan Bahan & Resep
          </button>
          <button
            onClick={() => setActiveTab('kandungan-gizi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kandungan-gizi' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Kandungan Gizi (AKG)
          </button>
          <button
            onClick={() => setActiveTab('food-cost')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'food-cost' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Input Food Cost Menu
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingMenuData(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Menu Baru</span>
              </button>

              <button
                type="button"
                onClick={handleQuickCopyPreviousDay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-300 shadow-2xs cursor-pointer transition-colors"
                title="Salin resep & komponen dari menu kemarin"
              >
                <Copy className="w-3.5 h-3.5 text-sky-600" />
                <span>Salin Menu Hari Sebelumnya</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            title="Ekspor seluruh data menu ke format Excel .xlsx"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: NAMA DAN ITEM MENU */}
      {activeTab === 'menu-item' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs no-print space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama menu, item hidangan, atau tanggal..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Status:</span>
                {['Semua', 'Draft', 'Diajukan', 'Disetujui', 'Ditolak', 'Dipublikasikan'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Waktu Makan & Periode */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Waktu Makan:</span>
                {['Semua', 'Pagi', 'Siang', 'Sore'].map(wm => (
                  <button
                    key={wm}
                    type="button"
                    onClick={() => setMealTimeFilter(wm)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      mealTimeFilter === wm
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {wm}
                  </button>
                ))}
              </div>

              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Periode:</span>
                {['Semua', 'Mingguan', 'Bulanan', 'Siklus'].map(pr => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setPeriodFilter(pr)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      periodFilter === pr
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menus Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus
              .filter(m => {
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const matchName = m.name?.toLowerCase().includes(q);
                  const matchDate = m.date?.toLowerCase().includes(q);
                  const matchDay = m.dayName?.toLowerCase().includes(q);
                  const matchDish = m.dishItems?.some(d => d.dishName?.toLowerCase().includes(q));
                  if (!matchName && !matchDate && !matchDay && !matchDish) return false;
                }
                if (statusFilter !== 'Semua' && m.status !== statusFilter) return false;
                if (mealTimeFilter !== 'Semua' && m.mealTime !== mealTimeFilter) return false;
                if (periodFilter !== 'Semua' && (m.menuPeriod || 'Mingguan') !== periodFilter) return false;
                return true;
              })
              .map((m) => {
                const isSelected = selectedMenu?.id === m.id;
                
                // Status color
                let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                if (m.status === 'Disetujui') statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                else if (m.status === 'Diajukan') statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-300';
                else if (m.status === 'Ditolak') statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
                else if (m.status === 'Dipublikasikan') statusBadgeClass = 'bg-purple-50 text-purple-800 border-purple-300';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMenu(m)}
                    className={`bg-white rounded-2xl border p-5 transition-all cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between ${
                      isSelected ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Meta: Day, Date, Time, Status */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-950">
                          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                            {m.dayName || getDayNameFromDate(m.date)}
                          </span>
                          <span>{m.date}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">{m.mealTime}</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadgeClass}`}>
                          {m.status}
                        </span>
                      </div>

                      {/* Menu Name */}
                      <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2 mb-2">
                        {m.name}
                      </h3>

                      {/* Period & Target Group Badges */}
                      <div className="flex flex-wrap items-center gap-1 mb-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {m.menuPeriod || 'Mingguan'}
                        </span>
                        {(m.targetGroups || ['Siswa SD/MI', 'Siswa SMP/MTs']).slice(0, 3).map((tg, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[9px] font-bold">
                            {tg}
                          </span>
                        ))}
                        {(m.targetGroups || []).length > 3 && (
                          <span className="text-[9px] text-slate-400 font-bold">
                            +{m.targetGroups!.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Structured Dish Items Pills */}
                      <div className="space-y-1 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Komponen & Item Hidangan:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.dishItems && m.dishItems.length > 0 ? (
                            m.dishItems.map((dish, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-800 text-[10px] rounded-md font-medium"
                                title={`Kategori: ${dish.category}`}
                              >
                                <span className="font-bold text-sky-800">{dish.category}:</span>
                                <span>{dish.dishName}</span>
                              </span>
                            ))
                          ) : (
                            (m.components || []).map((c, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium">
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Info: Portions & Energy */}
                    <div>
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs mb-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Total Porsi:</span>
                          <strong className="text-slate-900">{m.totalPortions} Porsi</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Estimasi Energi:</span>
                          <strong className="text-sky-700">{m.totalEnergyKcal || 807} kkal</strong>
                        </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between no-print">
                        {/* Pratinjau & Duplikasi */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewingMenu(m);
                              setIsPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer"
                            title="Pratinjau Menu Resmi A4"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pratinjau</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateMenu(m);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Duplikasi Menu ini"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Edit, Cetak, Hapus */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewingMenu(m);
                              setIsPreviewModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Cetak Menu"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMenuData(m);
                                setIsFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Data Menu"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMenu(m.id, m.name);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Menu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Empty State */}
          {menus.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Menu Terdaftar</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Mulai buat menu harian MBG dengan menentukan tanggal distribusi, waktu makan, komponen hidangan, dan target penerima.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingMenuData(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Menu Pertama</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERENCANAAN MENU & BAHAN (RECIPE & CALCULATOR) */}
      {activeTab === 'perencanaan' && (
        <div className="space-y-4">
          {selectedMenu ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wide">
                    Menu Terpilih: {selectedMenu.date}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    {selectedMenu.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target Produksi: <strong>{selectedMenu.totalPortions} Porsi</strong> ({selectedMenu.smallPortions} Kecil, {selectedMenu.largePortions} Besar)
                  </p>
                </div>

                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedIngredientId(ingredients[0]?.id || '');
                      setWeightGInput(60);
                      setIsAddIngredientModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Bahan Resep</span>
                  </button>
                )}
              </div>

              {/* Recipe Ingredients Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Nama Bahan</th>
                      <th className="py-2.5 px-3 text-center">Gram/Porsi</th>
                      <th className="py-2.5 px-3 text-center">Total Kebutuhan (kg)</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Biaya Bahan</th>
                      <th className="py-2.5 px-3 text-center no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMenu.ingredients && selectedMenu.ingredients.length > 0 ? (
                      selectedMenu.ingredients.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.ingredientName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                            {item.weightGPerPortion} g
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-slate-800">
                            {item.totalNeededKg} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatIDR(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                            {formatIDR(item.totalCost)}
                          </td>
                          <td className="py-2.5 px-3 text-center no-print">
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveRecipeIngredient(item.ingredientId)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Belum ada bahan dalam resep menu ini. Klik "+ Tambah Bahan Resep" di atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={2} className="py-2.5 px-3">TOTAL KEBUTUHAN BAHAN MBG</td>
                      <td className="py-2.5 px-3 text-center text-sky-800">
                        {Math.round(selectedMenu.ingredients?.reduce((s, i) => s + i.totalNeededKg, 0) || 0)} kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">Estimasi Total:</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                        {formatIDR(selectedMenu.totalCost || 0)}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Formula Explanation Callout */}
              <div className="mt-4 p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-sky-900 flex items-start gap-2">
                <Calculator className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Kalkulator Kebutuhan Bahan Resep:</strong>
                  <span>Total Kebutuhan Bahan (kg) = (Berat Bahan per Porsi (gram) × Total Porsi) / 1000. Rumus terintegrasi langsung dengan Master Bahan Pangan.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Pilih menu dari tab "Nama & Item Menu" terlebih dahulu.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INPUT KANDUNGAN GIZI */}
      {activeTab === 'kandungan-gizi' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
          <KopSurat
            documentTitle="ANALISIS KANDUNGAN GIZI MENU MAKAN BERGIZI GRATIS"
            documentNumber={`GIZI/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/01`}
            date={selectedMenu ? selectedMenu.date : new Date().toLocaleDateString('id-ID')}
          />

          {selectedMenu ? (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900">{selectedMenu.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standar AKG: <strong>35% Kebutuhan Harian Anak Sekolah & Santri</strong> • Diverifikasi oleh: <strong>Fitri Rahmawati, S.Gz., RD</strong>
                </p>
              </div>

              {/* Nutrition breakdown per ingredient */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300">Nama Bahan</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Gram/Porsi</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Energi (kkal)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Protein (g)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Lemak (g)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Karbohidrat (g)</th>
                      <th className="p-2.5 text-center">Serat (g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {selectedMenu.ingredients?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 font-semibold">{item.ingredientName}</td>
                        <td className="p-2 border-r border-slate-200 text-center">{item.weightGPerPortion} g</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">{item.energyKcal}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">{item.proteinG}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-800">{item.fatG}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-800">{item.carbG}</td>
                        <td className="p-2 text-center font-bold text-purple-800">{item.fiberG}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-sky-50 font-black text-sky-950 border-t-2 border-sky-300 text-xs">
                      <td colSpan={2} className="p-2.5 border-r border-sky-200 text-center">
                        TOTAL KANDUNGAN GIZI PER PORSI
                      </td>
                      <td className="p-2.5 border-r border-sky-200 text-center text-sm">{selectedMenu.totalEnergyKcal} kkal</td>
                      <td className="p-2.5 border-r border-sky-200 text-center text-sm">{selectedMenu.totalProteinG} g</td>
                      <td className="p-2.5 border-r border-sky-200 text-center text-sm">{selectedMenu.totalFatG} g</td>
                      <td className="p-2.5 border-r border-sky-200 text-center text-sm">{selectedMenu.totalCarbG} g</td>
                      <td className="p-2.5 text-center text-sm">{selectedMenu.totalFiberG} g</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Production Nutrition */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1">
                  Total Gizi Seluruh Produksi ({selectedMenu.totalPortions} Porsi):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-emerald-800">
                  <div>Energi Total: <strong>{(selectedMenu.totalEnergyKcal * selectedMenu.totalPortions).toLocaleString('id-ID')} kkal</strong></div>
                  <div>Protein Total: <strong>{Math.round(selectedMenu.totalProteinG * selectedMenu.totalPortions).toLocaleString('id-ID')} g</strong></div>
                  <div>Lemak Total: <strong>{Math.round(selectedMenu.totalFatG * selectedMenu.totalPortions).toLocaleString('id-ID')} g</strong></div>
                  <div>Karbohidrat: <strong>{Math.round(selectedMenu.totalCarbG * selectedMenu.totalPortions).toLocaleString('id-ID')} g</strong></div>
                  <div>Serat: <strong>{Math.round(selectedMenu.totalFiberG * selectedMenu.totalPortions).toLocaleString('id-ID')} g</strong></div>
                </div>
              </div>

              {/* Signature */}
              <div className="flex justify-end mt-12 pt-4 text-center text-xs">
                <div>
                  <p>Probolinggo, {selectedMenu.date}</p>
                  <p className="font-bold text-slate-900">Ahli Gizi & Nutrisionis SPPG (PLOG)</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">FITRI RAHMAWATI, S.Gz., RD</p>
                  <p className="text-[10px] text-slate-500">STR. STRGZ-3513-2024-0089</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Pilih menu terlebih dahulu.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INPUT FOOD COST MENU */}
      {activeTab === 'food-cost' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          {selectedMenu ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rincian Food Cost: {selectedMenu.name}</h3>
                  <span className="text-xs text-slate-500">Harga bahan pangan sinkron dengan Master Bahan & Riwayat Harga</span>
                </div>
                <span className="px-3 py-1 bg-sky-50 text-sky-800 text-xs font-bold rounded-lg border border-sky-200">
                  Total Biaya: {formatIDR(selectedMenu.totalCost)}
                </span>
              </div>

              {/* Cards Food Cost Small & Large */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 uppercase block mb-1">
                    Food Cost Porsi Kecil (Balita & SD Kelas 1-3)
                  </span>
                  <p className="text-2xl font-black text-amber-950">
                    {formatIDR(selectedMenu.foodCostSmall)} <span className="text-xs font-medium text-amber-700">/ porsi</span>
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Target {selectedMenu.smallPortions} porsi = {formatIDR(selectedMenu.foodCostSmall * selectedMenu.smallPortions)}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
                    Food Cost Porsi Besar (SD 4-6, MTs & Guru)
                  </span>
                  <p className="text-2xl font-black text-emerald-950">
                    {formatIDR(selectedMenu.foodCostLarge)} <span className="text-xs font-medium text-emerald-700">/ porsi</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Target {selectedMenu.largePortions} porsi = {formatIDR(selectedMenu.foodCostLarge * selectedMenu.largePortions)}
                  </p>
                </div>
              </div>

              {/* Food cost per item table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Bahan Penyusun</th>
                      <th className="py-2.5 px-3 text-center">Jumlah Penggunaan</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan Bahan</th>
                      <th className="py-2.5 px-3 text-right">Total Biaya Bahan</th>
                      <th className="py-2.5 px-3 text-right">Kontribusi / Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMenu.ingredients?.map((item, idx) => {
                      const costPerPortion = Math.round(item.totalCost / (selectedMenu.totalPortions || 1));
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{item.ingredientName}</td>
                          <td className="py-2.5 px-3 text-center">{item.totalNeededKg} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right">{formatIDR(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatIDR(item.totalCost)}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">{formatIDR(costPerPortion)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-300">
                      <td colSpan={3} className="py-2.5 px-3">TOTAL FOOD COST MENU MBG</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800">{formatIDR(selectedMenu.totalCost)}</td>
                      <td className="py-2.5 px-3 text-right text-sky-800">
                        {formatIDR(Math.round(selectedMenu.totalCost / (selectedMenu.totalPortions || 1)))} / porsi avg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">Pilih menu terlebih dahulu.</div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 p-3.5 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Form Input / Edit Nama & Item Menu */}
      <MenuFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingMenuData(null);
        }}
        onSave={handleSaveMenuFromModal}
        initialMenu={editingMenuData}
        allMenus={menus}
      />

      {/* Modal Pratinjau Menu Resmi A4 */}
      <MenuPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewingMenu(null);
        }}
        menu={previewingMenu}
        profile={profile}
      />

      {/* Modal Tambah Bahan ke Resep */}
      <Modal
        isOpen={isAddIngredientModalOpen}
        onClose={() => setIsAddIngredientModalOpen(false)}
        title="Tambah Bahan ke Resep Menu"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Bahan Pangan dari Master *</label>
            <select
              value={selectedIngredientId}
              onChange={e => setSelectedIngredientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500"
            >
              {ingredients.filter(i => i.itemType === 'Bahan Pangan').map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.category}) - {formatIDR(i.referencePrice)}/{i.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Berat per Porsi (dalam gram) *</label>
            <input
              type="number"
              min="1"
              value={weightGInput}
              onChange={e => setWeightGInput(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-sky-700 focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Contoh standar: Beras 120g, Ayam fillet 65g, Tempe 40g, Sayur 75g, Buah 90g.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddIngredientModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAddIngredientToRecipe}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
            >
              Hitung & Tambahkan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
