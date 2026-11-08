import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SppgProvider } from './context/SppgContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import DashboardPage from './pages/DashboardPage';
import MasterDataPage from './pages/MasterDataPage';
import BeneficiaryPage from './pages/BeneficiaryPage';
import PlogMenuPage from './pages/PlogMenuPage';
import PlokPage from './pages/PlokPage';
import InventoryPage from './pages/InventoryPage';
import DivisionTasksPage from './pages/DivisionTasksPage';
import DistributionBastPage from './pages/DistributionBastPage';
import OrganolepticPage from './pages/OrganolepticPage';
import CashFinancePage from './pages/CashFinancePage';
import AdministrationPage from './pages/AdministrationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [currentSubmodule, setCurrentSubmodule] = useState('utama');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (module: string, submodule: string) => {
    setCurrentModule(module);
    setCurrentSubmodule(submodule);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moduleTitles: Record<string, string> = {
    dashboard: 'Dashboard Utama',
    master: 'Data Master Terpadu',
    beneficiary: 'Data Sasaran & Penerima Manfaat',
    plog: 'Tugas PLOG (Perencanaan Menu & Gizi)',
    plok: 'Tugas PLOK (RAB, PO & Pengadaan)',
    inventory: 'Inventory & Manajemen Gudang',
    division: 'Tugas Divisi Operasional Dapur',
    distribution: 'Penyaluran Makanan & BAST',
    organoleptic: 'Uji Organoleptik & Sensori',
    finance: 'Keuangan & Buku Kas Umum',
    administration: 'Administrasi, Persuratan & Flyer',
    reports: '16 Laporan Terstandar MBG',
    settings: 'Pengaturan SPPG & Hak Akses'
  };

  const renderActiveModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardPage initialSubmodule={currentSubmodule} onNavigate={handleNavigate} />;
      case 'master':
        return <MasterDataPage initialSubmodule={currentSubmodule} onNavigateSubmodule={handleNavigate} />;
      case 'beneficiary':
        return <BeneficiaryPage initialSubmodule={currentSubmodule} />;
      case 'plog':
        return <PlogMenuPage initialSubmodule={currentSubmodule} />;
      case 'plok':
        return <PlokPage initialSubmodule={currentSubmodule} />;
      case 'inventory':
        return <InventoryPage initialSubmodule={currentSubmodule} />;
      case 'division':
        return <DivisionTasksPage initialSubmodule={currentSubmodule} />;
      case 'distribution':
        return <DistributionBastPage initialSubmodule={currentSubmodule} />;
      case 'organoleptic':
        return <OrganolepticPage initialSubmodule={currentSubmodule} />;
      case 'finance':
        return <CashFinancePage initialSubmodule={currentSubmodule} />;
      case 'administration':
        return <AdministrationPage initialSubmodule={currentSubmodule} />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage initialSubmodule={currentSubmodule} />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Component */}
      <Sidebar
        currentModule={currentModule}
        currentSubmodule={currentSubmodule}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentModuleName={moduleTitles[currentModule] || 'Modul'}
          currentSubmoduleName={currentSubmodule.replace('-', ' ').toUpperCase()}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveModule()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SppgProvider>
        <AppContent />
      </SppgProvider>
    </AuthProvider>
  );
}
