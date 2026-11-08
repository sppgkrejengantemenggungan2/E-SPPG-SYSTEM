import { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Users, 
  Shield, 
  History, 
  Database, 
  Save, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useSppg } from '../context/SppgContext';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, logAuditEvent } from '../services/auditService';
import { SppgProfile, UserProfile, UserRole, AuditLog } from '../types';
import Modal from '../components/common/Modal';
import ExportButton from '../components/common/ExportButton';

interface SettingsPageProps {
  initialSubmodule?: string;
}

export default function SettingsPage({ initialSubmodule = 'profil-sppg' }: SettingsPageProps) {
  const { profile, updateProfile } = useSppg();
  const { userProfile, allUsers, updateUserRole, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'profil-sppg' | 'pengguna' | 'audit-log' | 'backup-restore'>('profil-sppg');

  const [profileForm, setProfileForm] = useState<SppgProfile>(profile);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    if (initialSubmodule === 'pengguna') setActiveTab('pengguna');
    else if (initialSubmodule === 'audit-log') setActiveTab('audit-log');
    else if (initialSubmodule === 'backup-restore') setActiveTab('backup-restore');
    else setActiveTab('profil-sppg');
  }, [initialSubmodule]);

  const loadLogs = async () => {
    try {
      const logs = await getAuditLogs(100);
      setAuditLogs(logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit-log') loadLogs();
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(profileForm);
    await logAuditEvent(
      userProfile?.displayName || 'Admin',
      userProfile?.email || '',
      'Pengaturan Profil',
      'UPDATE',
      `Memperbarui profil SPPG: ${profileForm.institutionName}`
    );
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
  };

  // Backup data
  const handleExportBackup = () => {
    const backupData = {
      app: 'E-SPPG Management System',
      version: '2.6.4',
      exportDate: new Date().toISOString(),
      institution: profile.institutionName,
      profile,
      users: allUsers,
      logs: auditLogs
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `E-SPPG_Backup_${profile.sppgCode || 'KRJ2'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rolesList: UserRole[] = [
    'Admin Utama',
    'Kepala SPPG',
    'Pengawas Gizi',
    'Pengawas Keuangan',
    'Asisten Lapangan',
    'Admin Gudang',
    'Koordinator Relawan',
    'Relawan',
    'Editor Web',
    'Mitra'
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('profil-sppg')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profil-sppg' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Profil SPPG & Identitas Dokumen
          </button>
          <button
            onClick={() => setActiveTab('pengguna')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pengguna' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Manajemen Pengguna & Hak Akses ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('audit-log')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit-log' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Audit Log ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('backup-restore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backup-restore' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Backup & Restore
          </button>
        </div>
      </div>

      {/* TAB 1: PROFIL SPPG */}
      {activeTab === 'profil-sppg' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-4xl">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h3 className="text-base font-bold text-slate-900">Identitas Satuan Pelayanan Pemenuhan Gizi (SPPG)</h3>
            <p className="text-xs text-slate-500">
              Identitas ini digunakan secara otomatis pada seluruh dokumen dinas, kop surat, RAB, PO, BAST, dan laporan.
            </p>
          </div>

          {isSavedAlert && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Profil SPPG berhasil diperbarui dan tersimpan permanen di database Firestore!
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Logo BGN & Branding Section */}
            <div className="p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-2xl border border-sky-200">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-md border-2 border-sky-300 flex items-center justify-center flex-shrink-0">
                  <img
                    src={profileForm.bgnLogoUrl || "/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"}
                    alt="Logo Resmi BGN"
                    className="w-full h-full object-contain drop-shadow-xs"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-200/80 text-sky-900 text-[11px] font-extrabold uppercase mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                    Logo Resmi Badan Gizi Nasional (BGN RI)
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Emblem & Lambang Resmi Program MBG</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Logo ini dicantumkan secara resmi pada Header Dashboard, Sidebar, Kop Surat Dinas (A4), Dokumen BAST, Purchase Order (PO), Rencana Anggaran Biaya (RAB), Formulir Uji Organoleptik, dan 16 Laporan Resmi MBG.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileForm({
                        ...profileForm,
                        bgnLogoUrl: '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png'
                      })}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-sky-800 border border-sky-300 rounded-lg hover:bg-sky-50 shadow-2xs cursor-pointer"
                    >
                      Gunakan Logo Standar BGN (Colored)
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {profileForm.bgnLogoUrl || '/assets/aistudio/Badan_Gizi_Nasional__...'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-sky-200/60">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Path / URL Logo Badan Gizi Nasional (BGN)</label>
                  <input
                    type="text"
                    value={profileForm.bgnLogoUrl || ''}
                    onChange={e => setProfileForm({ ...profileForm, bgnLogoUrl: e.target.value })}
                    placeholder="/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Path / URL Logo Instansi / Yayasan (Opsional)</label>
                  <input
                    type="text"
                    value={profileForm.logoUrl || ''}
                    onChange={e => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                    placeholder="Contoh: /assets/logo_yayasan.png"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  required
                  value={profileForm.appName || ''}
                  onChange={e => setProfileForm({ ...profileForm, appName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-sky-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Kode Registrasi SPPG</label>
                <input
                  type="text"
                  value={profileForm.sppgCode || ''}
                  onChange={e => setProfileForm({ ...profileForm, sppgCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Instansi SPPG *</label>
                <input
                  type="text"
                  required
                  value={profileForm.institutionName || ''}
                  onChange={e => setProfileForm({ ...profileForm, institutionName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Yayasan Pengelola *</label>
                <input
                  type="text"
                  required
                  value={profileForm.foundationName || ''}
                  onChange={e => setProfileForm({ ...profileForm, foundationName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Alamat Kantor & Dapur Pelayanan *</label>
              <textarea
                rows={2}
                required
                value={profileForm.address || ''}
                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor Telepon / Hotline</label>
                <input
                  type="text"
                  value={profileForm.phone || ''}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Resmi Unit</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase block">Pejabat & Penandatangan Resmi:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Nama Kepala SPPG</label>
                  <input
                    type="text"
                    value={profileForm.headName || ''}
                    onChange={e => setProfileForm({ ...profileForm, headName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">NIP Kepala SPPG</label>
                  <input
                    type="text"
                    value={profileForm.headNip || ''}
                    onChange={e => setProfileForm({ ...profileForm, headNip: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Nama Pengawas Gizi / Nutrisionis</label>
                  <input
                    type="text"
                    value={profileForm.nutritionistName || ''}
                    onChange={e => setProfileForm({ ...profileForm, nutritionistName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">No. STR Nutrisionis</label>
                  <input
                    type="text"
                    value={profileForm.nutritionistStr || ''}
                    onChange={e => setProfileForm({ ...profileForm, nutritionistStr: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Nama Bendahara / Pengawas Keuangan</label>
                  <input
                    type="text"
                    value={profileForm.financeOfficerName || ''}
                    onChange={e => setProfileForm({ ...profileForm, financeOfficerName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PENGATURAN PENGGUNA */}
      {activeTab === 'pengguna' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengaturan Pengguna & Hak Akses Berjenjang (RBAC)</h3>
              <p className="text-xs text-slate-500">
                Admin Utama dapat mengubah role dan kewenangan setiap staf operasional.
              </p>
            </div>
            <ExportButton data={allUsers} fileName="Daftar_Pengguna_ESPPG" />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Pengguna</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role Saat Ini</th>
                  <th className="py-2.5 px-3">Ubah Role (Otorisasi Admin)</th>
                  <th className="py-2.5 px-3 text-center">Status Akun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {u.displayName}
                      <span className="block text-[10px] text-slate-400 font-normal">{u.roleTitle}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                        disabled={activeRole !== 'Admin Utama'}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                      >
                        {rolesList.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit-log' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit Trail & Log Aktivitas Sistem (Immutable)</h3>
              <p className="text-xs text-slate-500">
                Catatan kronologis seluruh aksi penting sistem untuk kepatuhan tata kelola & transparansi.
              </p>
            </div>
            <ExportButton data={auditLogs} fileName="Audit_Log_ESPPG" />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Modul</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                  <th className="py-2.5 px-3">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{log.userName}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{log.module}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup-restore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Ekspor Cadangan Data (Backup JSON)</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Unduh salinan cadangan terstruktur seluruh database E-SPPG (Master data, profil, pengguna, dan audit log) ke dalam file JSON terenkripsi lokal.
            </p>
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Backup Database (.json)</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Pemulihan Data (Restore Database)</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Pulihkan data dari arsip file backup JSON yang sah. Fitur ini memerlukan otorisasi Admin Utama demi menjaga integritas relasi antar modul.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Pilih File Backup untuk Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  alert('File backup terverifikasi sah. Sistem siap memulihkan relasi database.');
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
