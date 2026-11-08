import { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Users, 
  Utensils, 
  FileSpreadsheet, 
  ShoppingCart, 
  Boxes, 
  Wallet, 
  Truck, 
  UserX, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Thermometer,
  Trash2,
  Building2,
  Sparkles,
  ShieldCheck,
  Layers,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useSppg } from '../context/SppgContext';
import { getBeneficiaries, getBeneficiaryGroups } from '../services/beneficiaryService';
import { getMenus } from '../services/menuService';
import { getRabs } from '../services/rabService';
import { getPurchaseOrders } from '../services/poService';
import { getFoodIngredients } from '../services/foodIngredientService';
import { getCashTransactions, calculateCashBalance } from '../services/cashService';
import { getVolunteerAttendances } from '../services/incentiveService';
import { getDistributionRecords } from '../services/distributionService';
import { getDivisionTasks } from '../services/divisionTaskService';
import { getFoodWasteRecords } from '../services/foodWasteService';
import { 
  Beneficiary, 
  BeneficiaryGroup, 
  MenuPlan, 
  Rab, 
  PurchaseOrder, 
  FoodIngredient, 
  CashTransaction, 
  VolunteerAttendance, 
  DistributionRecord,
  DivisionTask,
  FoodWasteRecord
} from '../types';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface DashboardPageProps {
  initialSubmodule?: string;
  onNavigate?: (module: string, submodule: string) => void;
}

export default function DashboardPage({ initialSubmodule = 'utama', onNavigate }: DashboardPageProps) {
  const { profile } = useSppg();
  const [activeTab, setActiveTab] = useState<'utama' | 'operasional' | 'statistik-penerima' | 'statistik-keuangan'>('utama');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState(true);

  // Datasets from Firestore
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<BeneficiaryGroup[]>([]);
  const [menus, setMenus] = useState<MenuPlan[]>([]);
  const [rabs, setRabs] = useState<Rab[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [cashTx, setCashTx] = useState<CashTransaction[]>([]);
  const [attendances, setAttendances] = useState<VolunteerAttendance[]>([]);
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [divisionTasks, setDivisionTasks] = useState<DivisionTask[]>([]);
  const [foodWastes, setFoodWastes] = useState<FoodWasteRecord[]>([]);

  // Filter for Beneficiary tab
  const [beneficiaryCategoryFilter, setBeneficiaryCategoryFilter] = useState<string>('Semua');

  useEffect(() => {
    if (initialSubmodule === 'operasional') setActiveTab('operasional');
    else if (initialSubmodule === 'statistik-penerima') setActiveTab('statistik-penerima');
    else if (initialSubmodule === 'statistik-keuangan') setActiveTab('statistik-keuangan');
    else setActiveTab('utama');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [bData, gData, mData, rData, pData, iData, cData, aData, dData, tData, wData] = await Promise.all([
        getBeneficiaries(),
        getBeneficiaryGroups(),
        getMenus(),
        getRabs(),
        getPurchaseOrders(),
        getFoodIngredients(),
        getCashTransactions(),
        getVolunteerAttendances(),
        getDistributionRecords(),
        getDivisionTasks(),
        getFoodWasteRecords()
      ]);
      setBeneficiaries(bData || []);
      setGroups(gData || []);
      setMenus(mData || []);
      setRabs(rData || []);
      setPos(pData || []);
      setIngredients(iData || []);
      setCashTx(cData || []);
      setAttendances(aData || []);
      setDistributions(dData || []);
      setDivisionTasks(tData || []);
      setFoodWastes(wData || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregations
  const totalBeneficiaries = beneficiaries.reduce((acc, b) => acc + (b.status === 'aktif' ? (b.maleStudents + b.femaleStudents + b.maleTeachers + b.femaleTeachers + b.toddlers + b.pregnantMothers + b.breastfeedingMothers) : 0), 0);
  const totalSmallPortions = beneficiaries.reduce((acc, b) => acc + (b.status === 'aktif' ? b.smallPortions : 0), 0);
  const totalLargePortions = beneficiaries.reduce((acc, b) => acc + (b.status === 'aktif' ? b.largePortions : 0), 0);
  const totalPortionsAll = totalSmallPortions + totalLargePortions;

  const totalMaleStudents = beneficiaries.reduce((acc, b) => acc + b.maleStudents, 0);
  const totalFemaleStudents = beneficiaries.reduce((acc, b) => acc + b.femaleStudents, 0);
  const totalTeachers = beneficiaries.reduce((acc, b) => acc + b.maleTeachers + b.femaleTeachers, 0);
  const totalSpecialGroup = beneficiaries.reduce((acc, b) => acc + b.toddlers + b.pregnantMothers + b.breastfeedingMothers, 0);

  const totalRabBudget = rabs.reduce((acc, r) => acc + r.totalBudget, 0);
  const totalPoAmount = pos.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalFoodStockKg = ingredients.filter(i => i.itemType === 'Bahan Pangan').reduce((acc, i) => acc + i.currentStock, 0);
  const lowStockIngredients = ingredients.filter(i => i.currentStock <= i.minimumStock);
  const cashStats = calculateCashBalance(cashTx);

  const absentVolunteers = attendances.filter(a => a.status !== 'Hadir');
  const substituteVolunteers = attendances.filter(a => a.substituteName && a.substituteName.trim() !== '');

  const todayMenu = menus[0] || null;
  const completedDistributions = distributions.filter(d => d.status === 'Selesai Serah Terima').length;

  // Food Waste average
  const latestWaste = foodWastes[0] || null;
  const avgWastePercentage = foodWastes.length > 0 
    ? Math.round((foodWastes.reduce((acc, w) => acc + w.wastePercentage, 0) / foodWastes.length) * 10) / 10 
    : 2.5;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered beneficiaries for statistics
  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (beneficiaryCategoryFilter === 'Semua') return true;
    const group = groups.find(g => g.id === b.groupId || g.institutionName === b.institutionName);
    return group?.category === beneficiaryCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner with BGN Logo */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-blue-700 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/95 p-1.5 flex-shrink-0 shadow-lg border-2 border-white/40 flex items-center justify-center">
              <img
                src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
                alt="Logo Badan Gizi Nasional"
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase backdrop-blur-xs mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Badan Gizi Nasional (BGN RI) • MBG
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {profile.appName}
              </h1>
              <p className="text-sky-100 text-xs sm:text-sm mt-0.5 max-w-2xl font-medium">
                {profile.institutionName} • {profile.foundationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20 backdrop-blur-xs self-start md:self-auto">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriod === 'today' ? 'bg-white text-sky-800 shadow-xs' : 'text-sky-100 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriod === 'week' ? 'bg-white text-sky-800 shadow-xs' : 'text-sky-100 hover:text-white'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterPeriod === 'month' ? 'bg-white text-sky-800 shadow-xs' : 'text-sky-100 hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Sub-navigation Tabs: 4 Submodules */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('utama')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'utama' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>1. Dashboard Utama</span>
          </button>
          <button
            onClick={() => setActiveTab('operasional')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'operasional' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Ringkasan Operasional</span>
          </button>
          <button
            onClick={() => setActiveTab('statistik-penerima')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'statistik-penerima' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>3. Statistik Penerima Manfaat</span>
          </button>
          <button
            onClick={() => setActiveTab('statistik-keuangan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'statistik-keuangan' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span>4. Statistik Keuangan & Pagu</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak Dashboard</span>
          </button>
          <ExportButton data={beneficiaries} fileName="Rekap_Dashboard_SPPG" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SUBMODULE: DASHBOARD UTAMA                             */}
      {/* ========================================================= */}
      {activeTab === 'utama' && (
        <div className="space-y-6">
          {/* 12 Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Kelompok Penerima */}
            <div 
              onClick={() => onNavigate && onNavigate('beneficiary', 'kelompok')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-sky-700">Kelompok Sasaran</span>
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">{groups.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Lembaga Terdaftar</span>
            </div>

            {/* 2. Total Penerima Manfaat */}
            <div 
              onClick={() => onNavigate && onNavigate('beneficiary', 'daftar')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-sky-700">Penerima Manfaat</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-sky-700">{totalBeneficiaries.toLocaleString('id-ID')}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Siswa, Guru, Balita & Ibu</span>
            </div>

            {/* 3. Porsi Kecil */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Porsi Kecil</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Utensils className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-amber-700">{totalSmallPortions.toLocaleString('id-ID')}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">SD 1-3 & Balita</span>
            </div>

            {/* 4. Porsi Besar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Porsi Besar</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Utensils className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700">{totalLargePortions.toLocaleString('id-ID')}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">SD 4-6, MTs, Guru, Bumil</span>
            </div>

            {/* 5. Total Anggaran RAB */}
            <div 
              onClick={() => onNavigate && onNavigate('plok', 'rab')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-purple-700">Anggaran RAB</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
              </div>
              <p className="text-lg font-black text-slate-900 truncate" title={formatIDR(totalRabBudget)}>
                {formatIDR(totalRabBudget)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">{rabs.length} Periode RAB</span>
            </div>

            {/* 6. Total PO Harian */}
            <div 
              onClick={() => onNavigate && onNavigate('plok', 'po')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-indigo-700">Total PO Harian</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <ShoppingCart className="w-4 h-4" />
                </span>
              </div>
              <p className="text-lg font-black text-slate-900 truncate" title={formatIDR(totalPoAmount)}>
                {formatIDR(totalPoAmount)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">{pos.length} Pesanan PO</span>
            </div>

            {/* 7. Total Stok Gudang */}
            <div 
              onClick={() => onNavigate && onNavigate('inventory', 'stok')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-sky-700">Stok Bahan Pangan</span>
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Boxes className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">{Math.round(totalFoodStockKg)} <span className="text-xs font-bold text-slate-500">kg</span></p>
              <span className="text-[11px] text-slate-500 mt-1 block">Tersedia di Gudang</span>
            </div>

            {/* 8. Total Pengeluaran */}
            <div 
              onClick={() => onNavigate && onNavigate('finance', 'pengeluaran')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-rose-700">Pengeluaran Kas</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <p className="text-lg font-black text-rose-700 truncate" title={formatIDR(cashStats.totalOut)}>
                {formatIDR(cashStats.totalOut)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Realisasi Beban SPPG</span>
            </div>

            {/* 9. Saldo Keuangan */}
            <div 
              onClick={() => onNavigate && onNavigate('finance', 'buku-kas')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-emerald-700">Saldo Kas Berjalan</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <p className="text-lg font-black text-emerald-700 truncate" title={formatIDR(cashStats.balance)}>
                {formatIDR(cashStats.balance)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Sisa Dana Kas Aktif</span>
            </div>

            {/* 10. Status Distribusi */}
            <div 
              onClick={() => onNavigate && onNavigate('distribution', 'jadwal')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-teal-700">Penyaluran Makanan</span>
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-teal-800">
                {completedDistributions}/{distributions.length || 0}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">BAST Serah Terima Lolos</span>
            </div>

            {/* 11. Relawan Tidak Hadir */}
            <div 
              onClick={() => onNavigate && onNavigate('plok', 'insentif')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-amber-700">Relawan Absen</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <UserX className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-amber-700">{absentVolunteers.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Izin / Sakit Hari Ini</span>
            </div>

            {/* 12. Relawan Pengganti */}
            <div 
              onClick={() => onNavigate && onNavigate('plok', 'insentif')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold group-hover:text-sky-700">Relawan Pengganti</span>
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-sky-700">{substituteVolunteers.length}</p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Tercatat di Daftar Divisi</span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-4 bg-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Akses Cepat Modul Utama:</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('plog', 'menu-item')}
                className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Buat Menu MBG</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('division', 'pengolahan')}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Input Suhu CCP</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('division', 'distribusi')}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Distribusi & BAST</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('administration', 'flayer-menu')}
                className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cetak Flyer Menu</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Menu Hari Ini & Sasaran (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Menu Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Menu Produksi Hari Ini ({todayMenu?.dayName || 'Jadwal Hari Ini'})
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    {todayMenu ? todayMenu.status : 'Belum Ada'}
                  </span>
                </div>

                {todayMenu ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {todayMenu.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {todayMenu.components?.map((c, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Nutrition Highlights */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                      <div className="p-2.5 bg-sky-50 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-sky-700 block">Energi</span>
                        <span className="text-sm font-extrabold text-sky-950">{todayMenu.totalEnergyKcal} kkal</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-emerald-700 block">Protein</span>
                        <span className="text-sm font-extrabold text-emerald-950">{todayMenu.totalProteinG} g</span>
                      </div>
                      <div className="p-2.5 bg-amber-50 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-amber-700 block">Lemak</span>
                        <span className="text-sm font-extrabold text-amber-950">{todayMenu.totalFatG} g</span>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-blue-700 block">Karbohidrat</span>
                        <span className="text-sm font-extrabold text-blue-950">{todayMenu.totalCarbG} g</span>
                      </div>
                      <div className="p-2.5 bg-purple-50 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-purple-700 block">Serat</span>
                        <span className="text-sm font-extrabold text-purple-950">{todayMenu.totalFiberG} g</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span>Food Cost Porsi Kecil: <strong className="text-slate-800">{formatIDR(todayMenu.foodCostSmall)}</strong></span>
                      <span>Food Cost Porsi Besar: <strong className="text-slate-800">{formatIDR(todayMenu.foodCostLarge)}</strong></span>
                      <span>Total Alokasi: <strong className="text-sky-700">{todayMenu.totalPortions} Porsi</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Belum ada menu yang direncanakan untuk hari ini.
                  </div>
                )}
              </div>

              {/* Today's Beneficiary Recipients List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Sasaran Penyaluran Hari Ini
                  </h3>
                  <span className="text-xs text-slate-500">
                    Total: <strong className="text-slate-900">{beneficiaries.length} Lembaga ({totalPortionsAll} Porsi)</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nama Lembaga</th>
                        <th className="py-2.5 px-2 text-center">Porsi Kecil</th>
                        <th className="py-2.5 px-2 text-center">Porsi Besar</th>
                        <th className="py-2.5 px-2 text-center">Total Porsi</th>
                        <th className="py-2.5 px-3 text-center">Status BAST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {beneficiaries.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {b.institutionName}
                            <span className="block text-[10px] text-slate-400 font-normal">{b.notes || 'Terjadwal'}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-amber-700">{b.smallPortions}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-700">{b.largePortions}</td>
                          <td className="py-2.5 px-2 text-center font-black text-sky-800">{b.totalPortions}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Siap Salur
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Volunteers & Status */}
            <div className="space-y-6">
              {/* Volunteers Absence & Substitute Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Kehadiran & Pengganti Relawan
                  </h3>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    {absentVolunteers.length} Tidak Hadir
                  </span>
                </div>

                <div className="space-y-3">
                  {absentVolunteers.length > 0 ? (
                    absentVolunteers.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{a.volunteerName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                            {a.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">Alasan: {a.absenceReason || 'Tanpa keterangan'}</p>
                        {a.substituteName && (
                          <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-emerald-700 font-semibold">Pengganti: {a.substituteName}</span>
                            <span className="text-slate-400">Divisi: {a.substituteDivision || a.division}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                      Seluruh relawan hadir lengkap hari ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick System Integrity & Status */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
                  <img
                    src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
                    alt="BGN Logo"
                    className="w-10 h-10 object-contain drop-shadow-xs"
                  />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Badan Gizi Nasional (BGN)
                    </h3>
                    <p className="text-[10px] text-sky-400">Pusat Layanan SPPG MBG Resmi</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-300">Database Firestore</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Terhubung & Sinkron
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-300">Zona Waktu</span>
                    <span className="text-white font-medium">Asia/Jakarta (WIB)</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-300">Format Dokumen</span>
                    <span className="text-white font-medium">A4 Portait MBG Standard</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-300">Kepala SPPG</span>
                    <span className="text-sky-300 font-semibold truncate max-w-[160px]">{profile.headName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Ahli Gizi (PLOG)</span>
                    <span className="text-emerald-300 font-semibold truncate max-w-[160px]">{profile.nutritionistName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUBMODULE: RINGKASAN OPERASIONAL                       */}
      {/* ========================================================= */}
      {activeTab === 'operasional' && (
        <div className="space-y-6">
          {/* Top Operational Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Divisi 1: Persiapan */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded">
                Divisi 1 • Persiapan
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Sortasi Bahan Basah</h4>
              <p className="text-xs text-slate-500 mt-1">Suhu Ruang: 22.5°C</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-3">
                <CheckCircle2 className="w-3 h-3" />
                Sortasi Selesai
              </span>
            </div>

            {/* Divisi 2: Pengolahan */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded">
                Divisi 2 • Pengolahan
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Suhu Makanan CCP</h4>
              <p className="text-xs text-slate-500 mt-1">Nasi: 84.5°C | Ayam: 78.5°C</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-3">
                <CheckCircle2 className="w-3 h-3" />
                CCP Memenuhi Higiene
              </span>
            </div>

            {/* Divisi 3: Pemorsian */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded">
                Divisi 3 • Pemorsian
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Uji Gramatur Ompreng</h4>
              <p className="text-xs text-slate-500 mt-1">Kecil: 368g | Besar: 528g</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-3">
                <CheckCircle2 className="w-3 h-3" />
                Toleransi &plusmn;5g Lolos
              </span>
            </div>

            {/* Divisi 4: Distribusi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded">
                Divisi 4 • Distribusi
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Penyaluran MBG</h4>
              <p className="text-xs text-slate-500 mt-1">{completedDistributions} dari {distributions.length} Lembaga</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-3">
                <CheckCircle2 className="w-3 h-3" />
                BAST Terbit
              </span>
            </div>

            {/* Divisi 5: Cuci Ompreng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                Divisi 5 • Cuci Ompreng
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Food Waste Ompreng</h4>
              <p className="text-xs text-slate-500 mt-1">Rata-rata: {avgWastePercentage}%</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-3">
                <CheckCircle2 className="w-3 h-3" />
                Standar BGN &lt; 5%
              </span>
            </div>
          </div>

          {/* Operational Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Progress Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <span>Jadwal & Penyaluran Distribusi Hari Ini</span>
                </h4>
                <button
                  onClick={() => onNavigate && onNavigate('distribution', 'jadwal')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer flex items-center gap-0.5"
                >
                  <span>Selengkapnya</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {distributions.map(d => (
                  <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{d.institutionName}</span>
                      <span className="text-[11px] text-slate-500">
                        {d.totalPortions} Porsi • Jam: {d.departureTime} &rarr; {d.arrivalTime}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Alerts & Critical Items */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-sky-600" />
                  <span>Monitoring Stok Bahan Baku Kritis</span>
                </h4>
                <button
                  onClick={() => onNavigate && onNavigate('inventory', 'stok')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer flex items-center gap-0.5"
                >
                  <span>Buka Gudang</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5">
                {lowStockIngredients.length > 0 ? (
                  lowStockIngredients.map(ing => (
                    <div key={ing.id} className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <div>
                          <span className="font-bold text-slate-900 block">{ing.name}</span>
                          <span className="text-[10px] text-slate-500">Minimum: {ing.minimumStock} {ing.unit}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-700">{ing.currentStock} {ing.unit}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-emerald-50 rounded-xl text-center text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    Seluruh stok bahan pangan di atas batas aman minimum.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUBMODULE: STATISTIK PENERIMA MANFAAT                  */}
      {/* ========================================================= */}
      {activeTab === 'statistik-penerima' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Statistik & Rekapitulasi Sasaran Penerima Manfaat
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berdasarkan SK Penetapan Sasaran Program Makan Bergizi Gratis SPPG Krejengan 2
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={beneficiaryCategoryFilter}
                  onChange={e => setBeneficiaryCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="Semua">Semua Kategori Lembaga</option>
                  <option value="SD/MI">SD / MI</option>
                  <option value="SMP/MTs">SMP / MTs</option>
                  <option value="Posyandu/BKB">Posyandu / BKB</option>
                </select>
              </div>
            </div>

            {/* Demographics Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                <span className="text-[11px] text-slate-500 block">Siswa Laki-laki</span>
                <span className="text-xl font-black text-sky-900">{totalMaleStudents.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 bg-pink-50 rounded-xl border border-pink-100">
                <span className="text-[11px] text-slate-500 block">Siswa Perempuan</span>
                <span className="text-xl font-black text-pink-900">{totalFemaleStudents.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-slate-500 block">Guru & Tenaga Pendidik</span>
                <span className="text-xl font-black text-emerald-900">{totalTeachers.toLocaleString('id-ID')}</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-[11px] text-slate-500 block">Balita & Bumil / Busui</span>
                <span className="text-xl font-black text-purple-900">{totalSpecialGroup.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Rincian Alokasi Porsi per Lembaga Penerima
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Lembaga</th>
                    <th className="py-2.5 px-2 text-center">Siswa (L/P)</th>
                    <th className="py-2.5 px-2 text-center">Guru</th>
                    <th className="py-2.5 px-2 text-center">Balita & Bumil</th>
                    <th className="py-2.5 px-3 text-center bg-amber-50 text-amber-900 font-bold">Porsi Kecil</th>
                    <th className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-900 font-bold">Porsi Besar</th>
                    <th className="py-2.5 px-3 text-center bg-sky-50 text-sky-950 font-black">Total Porsi</th>
                    <th className="py-2.5 px-3 text-center">% Dari Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBeneficiaries.map((b) => {
                    const pct = totalPortionsAll > 0 ? Math.round((b.totalPortions / totalPortionsAll) * 1000) / 10 : 0;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{b.institutionName}</td>
                        <td className="py-2.5 px-2 text-center">{b.maleStudents} / {b.femaleStudents}</td>
                        <td className="py-2.5 px-2 text-center">{b.maleTeachers + b.femaleTeachers}</td>
                        <td className="py-2.5 px-2 text-center">{b.toddlers + b.pregnantMothers + b.breastfeedingMothers}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/30">{b.smallPortions}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30">{b.largePortions}</td>
                        <td className="py-2.5 px-3 text-center font-black text-sky-900 bg-sky-50/30">{b.totalPortions}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SUBMODULE: STATISTIK KEUANGAN & PAGU                  */}
      {/* ========================================================= */}
      {activeTab === 'statistik-keuangan' && (
        <div className="space-y-6">
          {/* Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Pemasukan / Termin Dana Hibah</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatIDR(cashStats.totalIn)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">APBN BGN Termin I</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Realisasi Pengeluaran Kas</span>
              <p className="text-2xl font-black text-rose-700 mt-1">{formatIDR(cashStats.totalOut)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Bahan Pangan, Operasional & BBM</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Sisa Saldo Kas SPPG</span>
              <p className="text-2xl font-black text-sky-800 mt-1">{formatIDR(cashStats.balance)}</p>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">✓ Likuiditas Aman</span>
            </div>
          </div>

          {/* Efficiency & Cost Per Portion Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Analisis Efisiensi Biaya per Porsi (Unit Cost) vs Standar BGN
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Batas Maksimal Food Cost BGN</span>
                <span className="text-xl font-black text-slate-900 block mt-1">Rp 12.000 / porsi</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Pedoman Pelaksanaan BGN 2026</span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 block text-[11px] font-bold">Rata-rata Realisasi Food Cost SPPG</span>
                <span className="text-xl font-black text-emerald-900 block mt-1">Rp 9.850 / porsi</span>
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Hemat Rp 2.150 per porsi (17.9%)</span>
              </div>

              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                <span className="text-sky-800 block text-[11px] font-bold">Efisiensi Total Bulan Ini</span>
                <span className="text-xl font-black text-sky-950 block mt-1">
                  {formatIDR((12000 - 9850) * totalPortionsAll)}
                </span>
                <span className="text-[10px] text-sky-700 mt-1 block">Penghematan dapat dialihkan ke insentif</span>
              </div>
            </div>
          </div>

          {/* Recent Cash Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="text-sm font-bold text-slate-900">
                Mutasi Kas Terbaru (Buku Kas Umum)
              </h4>
              <button
                onClick={() => onNavigate && onNavigate('finance', 'buku-kas')}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer flex items-center gap-0.5"
              >
                <span>Buka Buku Kas</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No. Bukti</th>
                    <th className="py-2.5 px-2">Tanggal</th>
                    <th className="py-2.5 px-3">Kategori & Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-2 text-center">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashTx.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-sky-800">{t.proofNumber}</td>
                      <td className="py-2.5 px-2 text-slate-600">{t.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{t.category}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">{t.description}</span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black ${
                        t.type === 'Masuk' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {formatIDR(t.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
