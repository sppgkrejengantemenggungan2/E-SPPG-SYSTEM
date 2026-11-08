import { useState } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  UtensilsCrossed, 
  FileSpreadsheet, 
  Boxes, 
  Layers, 
  FileText, 
  ClipboardCheck, 
  Wallet, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSppg } from '../../context/SppgContext';

interface SidebarProps {
  currentModule: string;
  currentSubmodule: string;
  onNavigate: (module: string, submodule: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: any;
  requiredRole?: string[];
  submenus: { id: string; title: string }[];
}

export default function Sidebar({
  currentModule,
  currentSubmodule,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}: SidebarProps) {
  const { activeRole, userProfile } = useAuth();
  const { profile } = useSppg();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    [currentModule]: true
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      submenus: [
        { id: 'utama', title: 'Dashboard Utama' },
        { id: 'operasional', title: 'Ringkasan Operasional' },
        { id: 'statistik-penerima', title: 'Statistik Penerima Manfaat' },
        { id: 'statistik-keuangan', title: 'Statistik Keuangan & Pagu' }
      ]
    },
    {
      id: 'master',
      title: 'Data Master',
      icon: Database,
      submenus: [
        { id: 'penerima', title: 'Master Penerima Manfaat' },
        { id: 'bahan', title: 'Master Bahan Pangan & Operasional' },
        { id: 'supplier', title: 'Master Data Supplier' },
        { id: 'menu', title: 'Master Data Menu' },
        { id: 'pengguna', title: 'Master Data Pengguna' }
      ]
    },
    {
      id: 'beneficiary',
      title: 'Penerima Manfaat',
      icon: Users,
      submenus: [
        { id: 'kelompok', title: 'Kelompok Penerima Manfaat' },
        { id: 'daftar', title: 'Daftar Sasaran & Porsi' },
        { id: 'rekapitulasi', title: 'Rekapitulasi Penerima Manfaat' }
      ]
    },
    {
      id: 'plog',
      title: 'Tugas PLOG (Gizi & Menu)',
      icon: UtensilsCrossed,
      submenus: [
        { id: 'menu-item', title: 'Nama & Item Menu' },
        { id: 'perencanaan', title: 'Perencanaan Menu & Bahan' },
        { id: 'kandungan-gizi', title: 'Input Kandungan Gizi (AKG)' },
        { id: 'food-cost', title: 'Input Food Cost Menu' }
      ]
    },
    {
      id: 'plok',
      title: 'Tugas PLOK (RAB & PO)',
      icon: FileSpreadsheet,
      submenus: [
        { id: 'rab', title: 'Rencana Anggaran Belanja (RAB)' },
        { id: 'po', title: 'Purchase Order (PO) Harian' },
        { id: 'checklist', title: 'Checklist Penerimaan Bahan' },
        { id: 'insentif', title: 'Absensi & Insentif Relawan' },
        { id: 'insentif-lembaga', title: 'Insentif Lembaga Penerima' }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory & Gudang',
      icon: Boxes,
      submenus: [
        { id: 'stok', title: 'Stok Bahan Pangan' },
        { id: 'mutasi', title: 'Mutasi Keluar Masuk' },
        { id: 'opname', title: 'Stock Opname Fisik' }
      ]
    },
    {
      id: 'division',
      title: 'Tugas Divisi Dapur',
      icon: Layers,
      submenus: [
        { id: 'persiapan', title: 'Divisi Persiapan' },
        { id: 'pengolahan', title: 'Divisi Pengolahan' },
        { id: 'pemorsian', title: 'Divisi Pemorsian' },
        { id: 'distribusi', title: 'Divisi Distribusi' },
        { id: 'cuci-ompreng', title: 'Divisi Cuci Ompreng (Food Waste)' }
      ]
    },
    {
      id: 'distribution',
      title: 'Penyaluran & BAST',
      icon: FileText,
      submenus: [
        { id: 'jadwal', title: 'Pengiriman & Armada BBM' },
        { id: 'bast-terima', title: 'BAST Penerimaan Makanan' },
        { id: 'bast-kembali', title: 'BAST Pengembalian Ompreng' }
      ]
    },
    {
      id: 'organoleptic',
      title: 'Uji Organoleptik',
      icon: ClipboardCheck,
      submenus: [
        { id: 'plog', title: 'Organoleptik PLOG (Dapur)' },
        { id: 'pic', title: 'Organoleptik PIC (Lembaga)' }
      ]
    },
    {
      id: 'finance',
      title: 'Keuangan & Kas',
      icon: Wallet,
      submenus: [
        { id: 'buku-kas', title: 'Buku Kas Harian' },
        { id: 'pemasukan', title: 'Pemasukan Kas' },
        { id: 'pengeluaran', title: 'Pengeluaran & Bayar PO' },
        { id: 'rekap-keuangan', title: 'Rekapitulasi Saldo Kas' }
      ]
    },
    {
      id: 'administration',
      title: 'Administrasi & Surat',
      icon: FileText,
      submenus: [
        { id: 'surat-masuk', title: 'Surat Masuk' },
        { id: 'surat-keluar', title: 'Surat Keluar' },
        { id: 'surat-tugas', title: 'Cetak Surat Tugas' },
        { id: 'flayer-menu', title: 'Pembuat Flyer Menu MBG' },
        { id: 'arsip', title: 'Arsip Dokumen Resmi' }
      ]
    },
    {
      id: 'reports',
      title: 'Modul Laporan',
      icon: BarChart3,
      submenus: [
        { id: 'semua-laporan', title: '16 Laporan Terstandar MBG' }
      ]
    },
    {
      id: 'settings',
      title: 'Pengaturan Sistem',
      icon: Settings,
      submenus: [
        { id: 'profil-sppg', title: 'Profil SPPG' },
        { id: 'pengguna', title: 'Manajemen Pengguna & Role' },
        { id: 'audit-log', title: 'Audit Trail & Log Aktivitas' },
        { id: 'backup-restore', title: 'Backup & Restore Data' }
      ]
    }
  ];

  const handleSubmenuClick = (moduleId: string, subId: string) => {
    onNavigate(moduleId, subId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center flex-shrink-0 border border-white/20 shadow-sm">
            <img
              src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
              alt="BGN Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>E-SPPG SYSTEM</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-sm font-semibold border border-amber-400/30">
                BGN
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px]" title={profile.institutionName}>
              {profile.institutionName}
            </p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Role Card */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-600/30 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-xs">
            {userProfile?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">
              {userProfile?.displayName || 'Pengguna E-SPPG'}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-sky-400 font-medium">
              <Shield className="w-3 h-3 text-sky-400" />
              <span>{activeRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menus */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {menuItems.map((menu) => {
          const isExpanded = !!expandedModules[menu.id];
          const isModuleActive = currentModule === menu.id;
          const Icon = menu.icon;

          return (
            <div key={menu.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleExpand(menu.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isModuleActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isModuleActive ? 'text-white' : 'text-sky-400'}`} />
                  <span>{menu.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Submenus */}
              {isExpanded && (
                <div className="pl-8 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-4">
                  {menu.submenus.map((sub) => {
                    const isSubActive = currentModule === menu.id && currentSubmodule === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubmenuClick(menu.id, sub.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                          isSubActive
                            ? 'bg-sky-500/20 text-sky-400 font-bold border-l-2 border-sky-400'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {sub.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        <span>E-SPPG MBG • Yayasan Hafshawaty</span>
        <div className="text-slate-600 mt-0.5">WIB (Asia/Jakarta) • v2.6.4 Production</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen fixed left-0 top-0 z-30 no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex no-print">
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
