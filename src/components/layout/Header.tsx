import { useState } from 'react';
import { 
  Menu, 
  Bell, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Building2, 
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSppg } from '../../context/SppgContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  currentModuleName: string;
  currentSubmoduleName: string;
}

export default function Header({
  onOpenMobileSidebar,
  currentModuleName,
  currentSubmoduleName
}: HeaderProps) {
  const { currentUser, userProfile, activeRole, simulateRoleLogin, signInWithGoogle, signOut } = useAuth();
  const { profile } = useSppg();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const availableRoles: UserRole[] = [
    'Admin Utama',
    'Kepala SPPG',
    'Pengawas Gizi',
    'Pengawas Keuangan',
    'Admin Gudang',
    'Asisten Lapangan',
    'Koordinator Relawan',
    'Relawan',
    'Editor Web',
    'Mitra'
  ];

  const notifications = [
    { id: 1, title: 'Menu Hari Ini Disetujui', time: '06:00 WIB', desc: 'Ayam Suwir Kecap & Sayur Bening siap produksi', unread: true },
    { id: 2, title: 'Checklist PO Masuk Gudang', time: '05:30 WIB', desc: 'CV Barokah Protein telah diverifikasi aman', unread: true },
    { id: 3, title: 'Suhu Pemorsian Sesuai Standar', time: '08:15 WIB', desc: 'Suhu packing 68.0°C (Lolos QC)', unread: false }
  ];

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 px-4 lg:px-6 py-2.5 flex items-center justify-between no-print shadow-2xs">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="hover:text-slate-600 transition-colors">E-SPPG</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{currentModuleName}</span>
          </div>
          <h2 className="text-sm lg:text-base font-bold text-slate-900 tracking-tight leading-none mt-0.5">
            {currentSubmoduleName}
          </h2>
        </div>
      </div>

      {/* Center: SPPG Badge (Desktop) */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-sky-50 rounded-full border border-sky-200 text-sky-900 text-xs font-semibold shadow-2xs">
        <img
          src={profile.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
          alt="BGN Logo"
          className="w-5 h-5 object-contain"
        />
        <span className="truncate max-w-[280px] font-bold">{profile.institutionName}</span>
      </div>

      {/* Right Controls: Role Selector, Notifications, Auth */}
      <div className="flex items-center gap-2.5">
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
            title="Klik untuk simulasi peran / ganti role operasional"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Role:</span>
            <span className="text-sky-900">{activeRole}</span>
          </button>

          {showRoleMenu && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-slate-100 py-1.5 z-40"
              onClick={() => setShowRoleMenu(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Simulasi Peran / Hak Akses
              </div>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => simulateRoleLogin(role)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
                    activeRole === role
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{role}</span>
                  {activeRole === role && <UserCheck className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Notifikasi Sistem"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-600 rounded-full animate-pulse" />
          </button>

          {showNotifications && (
            <div 
              className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 border border-slate-100 py-2 z-40"
              onClick={() => setShowNotifications(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Notifikasi Terkini</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">
                  3 Baru
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Google Login / Logout */}
        {currentUser ? (
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            title={`Masuk sebagai ${currentUser.email}. Klik untuk keluar`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Auth</span>
          </button>
        )}
      </div>
    </header>
  );
}
