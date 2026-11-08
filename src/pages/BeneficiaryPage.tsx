import { useState, useEffect, ChangeEvent } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload, 
  Download, 
  Building2, 
  CheckCircle2, 
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getBeneficiaryGroups, 
  getBeneficiaries, 
  saveBeneficiaryGroup, 
  saveBeneficiary, 
  deleteBeneficiaryGroup, 
  deleteBeneficiary 
} from '../services/beneficiaryService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { Beneficiary, BeneficiaryGroup } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface BeneficiaryPageProps {
  initialSubmodule?: string;
}

export default function BeneficiaryPage({ initialSubmodule = 'kelompok' }: BeneficiaryPageProps) {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'kelompok' | 'daftar' | 'rekapitulasi'>('kelompok');
  const [groups, setGroups] = useState<BeneficiaryGroup[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);

  // Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<BeneficiaryGroup>>({});

  // Beneficiary Modal
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Partial<Beneficiary>>({});

  const canEdit = hasPermission('beneficiary', 'canCreate');
  const canDelete = hasPermission('beneficiary', 'canDelete');

  useEffect(() => {
    if (initialSubmodule === 'daftar') setActiveTab('daftar');
    else if (initialSubmodule === 'rekapitulasi') setActiveTab('rekapitulasi');
    else setActiveTab('kelompok');
  }, [initialSubmodule]);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [gData, bData] = await Promise.all([
        getBeneficiaryGroups(),
        getBeneficiaries()
      ]);
      setGroups(gData || []);
      setBeneficiaries(bData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Excel Import for Beneficiaries
  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

        let count = 0;
        for (const row of data) {
          const instName = row['Nama Lembaga'] || row['institutionName'] || 'Lembaga Baru';
          const matchedGroup = groups.find(g => g.institutionName.toLowerCase() === instName.toLowerCase()) || groups[0];

          await saveBeneficiary({
            groupId: matchedGroup?.id || 'g1',
            institutionName: instName,
            maleStudents: Number(row['Siswa L'] || row['maleStudents']) || 0,
            femaleStudents: Number(row['Siswa P'] || row['femaleStudents']) || 0,
            maleTeachers: Number(row['Guru L'] || row['maleTeachers']) || 0,
            femaleTeachers: Number(row['Guru P'] || row['femaleTeachers']) || 0,
            toddlers: Number(row['Balita'] || row['toddlers']) || 0,
            pregnantMothers: Number(row['Ibu Hamil'] || row['pregnantMothers']) || 0,
            breastfeedingMothers: Number(row['Ibu Menyusui'] || row['breastfeedingMothers']) || 0,
            status: 'aktif'
          });
          count++;
        }

        await logAuditEvent(
          userProfile?.displayName || 'User',
          userProfile?.email || '',
          'Penerima Manfaat',
          'CREATE',
          `Import data Excel penerima manfaat (${count} data berhasil dimasukkan)`
        );

        alert(`Berhasil mengimpor ${count} data penerima manfaat.`);
        await loadAll();
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format kolom sesuai.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup.institutionName) return alert('Nama lembaga wajib diisi.');
    await saveBeneficiaryGroup(editingGroup);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Penerima Manfaat',
      editingGroup.id ? 'UPDATE' : 'CREATE',
      `Menyimpan Kelompok Lembaga: ${editingGroup.institutionName}`
    );
    setIsGroupModalOpen(false);
    loadAll();
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary.institutionName) return alert('Pilih lembaga terlebih dahulu.');
    await saveBeneficiary(editingBeneficiary);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Penerima Manfaat',
      editingBeneficiary.id ? 'UPDATE' : 'CREATE',
      `Menyimpan detail penerima manfaat: ${editingBeneficiary.institutionName}`
    );
    setIsBeneficiaryModalOpen(false);
    loadAll();
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Hapus kelompok lembaga ${name}?`)) return;
    await deleteBeneficiaryGroup(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Penerima Manfaat', 'DELETE', `Menghapus kelompok ${name}`, id);
    loadAll();
  };

  const handleDeleteBeneficiary = async (id: string, name: string) => {
    if (!confirm(`Hapus data penerima manfaat ${name}?`)) return;
    await deleteBeneficiary(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Penerima Manfaat', 'DELETE', `Menghapus data penerima ${name}`, id);
    loadAll();
  };

  // Filtered views
  const filteredGroups = groups.filter(g => {
    const matchSearch = g.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) || g.picName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'Semua' || g.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const filteredBeneficiaries = beneficiaries.filter(b => {
    return b.institutionName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Rekapitulasi summary
  const totalSiswaL = beneficiaries.reduce((s, b) => s + b.maleStudents, 0);
  const totalSiswaP = beneficiaries.reduce((s, b) => s + b.femaleStudents, 0);
  const totalGuruL = beneficiaries.reduce((s, b) => s + b.maleTeachers, 0);
  const totalGuruP = beneficiaries.reduce((s, b) => s + b.femaleTeachers, 0);
  const totalBalita = beneficiaries.reduce((s, b) => s + b.toddlers, 0);
  const totalBumil = beneficiaries.reduce((s, b) => s + b.pregnantMothers, 0);
  const totalBusui = beneficiaries.reduce((s, b) => s + b.breastfeedingMothers, 0);
  const totalPorsiKecil = beneficiaries.reduce((s, b) => s + b.smallPortions, 0);
  const totalPorsiBesar = beneficiaries.reduce((s, b) => s + b.largePortions, 0);
  const grandTotalPortions = totalPorsiKecil + totalPorsiBesar;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('kelompok')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kelompok' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Kelompok Lembaga ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('daftar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'daftar' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Sasaran Penerima & Porsi ({beneficiaries.length})
          </button>
          <button
            onClick={() => setActiveTab('rekapitulasi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rekapitulasi' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Rekapitulasi Otomatis
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'kelompok' && canEdit && (
            <button
              onClick={() => {
                setEditingGroup({ status: 'aktif', category: 'SD/MI' });
                setIsGroupModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lembaga</span>
            </button>
          )}

          {activeTab === 'daftar' && canEdit && (
            <>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
              </label>

              <button
                onClick={() => {
                  setEditingBeneficiary({
                    groupId: groups[0]?.id || '',
                    institutionName: groups[0]?.institutionName || '',
                    maleStudents: 0,
                    femaleStudents: 0,
                    maleTeachers: 0,
                    femaleTeachers: 0,
                    toddlers: 0,
                    pregnantMothers: 0,
                    breastfeedingMothers: 0,
                    status: 'aktif',
                    effectiveDate: new Date().toISOString().split('T')[0]
                  });
                  setIsBeneficiaryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Input Sasaran</span>
              </button>
            </>
          )}

          <ExportButton
            data={activeTab === 'kelompok' ? groups : beneficiaries}
            fileName={`Penerima_Manfaat_${activeTab}`}
          />
        </div>
      </div>

      {/* TAB 1: KELOMPOK LEMBAGA */}
      {activeTab === 'kelompok' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 no-print">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari lembaga atau PIC..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500">Kategori:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="SD/MI">SD/MI</option>
                <option value="SMP/MTs">SMP/MTs</option>
                <option value="SMA/MA">SMA/MA</option>
                <option value="Posyandu/BKB">Posyandu/BKB</option>
                <option value="Pondok Pesantren">Pondok Pesantren</option>
              </select>
            </div>
          </div>

          {/* Table Kelompok */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Lembaga</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Alamat</th>
                    <th className="py-3 px-3">PIC & Kontak</th>
                    <th className="py-3 px-3">Rekening Bank</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroups.length > 0 ? (
                    filteredGroups.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {g.institutionName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={g.address}>
                          {g.address}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{g.picName}</div>
                          <div className="text-[11px] text-slate-500">{g.phone}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {g.bankAccount ? `${g.bankName}: ${g.bankAccount}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            g.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {g.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingGroup(g);
                                  setIsGroupModalOpen(true);
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                title="Edit Lembaga"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteGroup(g.id, g.institutionName)}
                                className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus Lembaga"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada data kelompok lembaga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR SASARAN & PORSI */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* Table Penerima Manfaat Detail */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Lembaga</th>
                    <th className="py-3 px-2 text-center">Siswa (L/P)</th>
                    <th className="py-3 px-2 text-center">Guru (L/P)</th>
                    <th className="py-3 px-2 text-center">Balita</th>
                    <th className="py-3 px-2 text-center">Bumil/Busui</th>
                    <th className="py-3 px-2 text-center bg-amber-50/50 text-amber-800">Porsi Kecil</th>
                    <th className="py-3 px-2 text-center bg-emerald-50/50 text-emerald-800">Porsi Besar</th>
                    <th className="py-3 px-2 text-center bg-sky-50 text-sky-900 font-extrabold">Total Porsi</th>
                    <th className="py-3 px-3 text-center">Tgl Efektif</th>
                    <th className="py-3 px-4 text-center no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBeneficiaries.length > 0 ? (
                    filteredBeneficiaries.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {b.institutionName}
                          <span className="block text-[10px] font-normal text-slate-400">{b.notes || '-'}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-medium">
                          {b.maleStudents} / {b.femaleStudents}
                        </td>
                        <td className="py-3 px-2 text-center font-medium">
                          {b.maleTeachers} / {b.femaleTeachers}
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-amber-700">
                          {b.toddlers || 0}
                        </td>
                        <td className="py-3 px-2 text-center font-medium text-purple-700">
                          {b.pregnantMothers || 0} / {b.breastfeedingMothers || 0}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-amber-700 bg-amber-50/20">
                          {b.smallPortions}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-emerald-700 bg-emerald-50/20">
                          {b.largePortions}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-sky-900 bg-sky-50/40 text-sm">
                          {b.totalPortions}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-medium">
                          {b.effectiveDate || '-'}
                        </td>
                        <td className="py-3 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingBeneficiary(b);
                                  setIsBeneficiaryModalOpen(true);
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                title="Edit Rincian"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteBeneficiary(b.id, b.institutionName)}
                                className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tidak ada data penerima manfaat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAPITULASI OTOMATIS (A4 Print Ready) */}
      {activeTab === 'rekapitulasi' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
          <KopSurat
            documentTitle="REKAPITULASI PENERIMA MANFAAT DAN PORSI MBG"
            documentNumber={`REKAP/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/01`}
            date={new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          />

          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Siswa</span>
              <span className="text-base font-extrabold text-slate-900">{totalSiswaL + totalSiswaP} Orang</span>
              <span className="text-[10px] text-slate-400 block">L: {totalSiswaL} | P: {totalSiswaP}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Guru & Pembina</span>
              <span className="text-base font-extrabold text-slate-900">{totalGuruL + totalGuruP} Orang</span>
              <span className="text-[10px] text-slate-400 block">L: {totalGuruL} | P: {totalGuruP}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-[11px] text-amber-700 font-semibold block">Balita & Bumil/Busui</span>
              <span className="text-base font-extrabold text-amber-900">{totalBalita + totalBumil + totalBusui} Orang</span>
              <span className="text-[10px] text-amber-600 block">Balita: {totalBalita} | Ibu: {totalBumil + totalBusui}</span>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-center">
              <span className="text-[11px] text-sky-700 font-semibold block">Total Porsi MBG</span>
              <span className="text-lg font-black text-sky-900">{grandTotalPortions} Porsi</span>
              <span className="text-[10px] text-sky-600 block">Kecil: {totalPorsiKecil} | Besar: {totalPorsiBesar}</span>
            </div>
          </div>

          {/* Printable Detail Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="p-2 border-r border-slate-300">No</th>
                  <th className="p-2 border-r border-slate-300">Nama Lembaga Sasaran</th>
                  <th className="p-2 border-r border-slate-300 text-center">Siswa</th>
                  <th className="p-2 border-r border-slate-300 text-center">Guru</th>
                  <th className="p-2 border-r border-slate-300 text-center">Balita</th>
                  <th className="p-2 border-r border-slate-300 text-center">Bumil/Busui</th>
                  <th className="p-2 border-r border-slate-300 text-center">Porsi Kecil</th>
                  <th className="p-2 border-r border-slate-300 text-center">Porsi Besar</th>
                  <th className="p-2 text-center">Total Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {beneficiaries.map((b, idx) => (
                  <tr key={b.id} className="text-slate-800">
                    <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{b.institutionName}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.maleStudents + b.femaleStudents}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.maleTeachers + b.femaleTeachers}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.toddlers}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.pregnantMothers + b.breastfeedingMothers}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-800">{b.smallPortions}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">{b.largePortions}</td>
                    <td className="p-2 text-center font-black text-sky-900">{b.totalPortions}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={2} className="p-2 border-r border-slate-300 text-center">TOTAL REKAPITULASI</td>
                  <td className="p-2 border-r border-slate-300 text-center">{totalSiswaL + totalSiswaP}</td>
                  <td className="p-2 border-r border-slate-300 text-center">{totalGuruL + totalGuruP}</td>
                  <td className="p-2 border-r border-slate-300 text-center">{totalBalita}</td>
                  <td className="p-2 border-r border-slate-300 text-center">{totalBumil + totalBusui}</td>
                  <td className="p-2 border-r border-slate-300 text-center text-amber-900">{totalPorsiKecil}</td>
                  <td className="p-2 border-r border-slate-300 text-center text-emerald-900">{totalPorsiBesar}</td>
                  <td className="p-2 text-center text-sky-900 text-sm">{grandTotalPortions}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Formal Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs text-slate-800">
            <div>
              <p className="font-medium">Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala SPPG Probolinggo Krejengan 2</p>
              <div className="h-20" />
              <p className="font-bold underline text-slate-900">H. AHMAD ZAINI, S.Pd.I</p>
              <p className="text-[10px] text-slate-500">NIP. 19780512 200501 1 004</p>
            </div>
            <div>
              <p className="font-medium">Probolinggo, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
              <p className="font-bold text-slate-900">Pengawas Gizi & Nutrisionis (PLOG)</p>
              <div className="h-20" />
              <p className="font-bold underline text-slate-900">FITRI RAHMAWATI, S.Gz., RD</p>
              <p className="text-[10px] text-slate-500">STR. STRGZ-3513-2024-0089</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Kelompok */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={editingGroup.id ? 'Edit Kelompok Lembaga' : 'Tambah Kelompok Lembaga Baru'}
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Lembaga / Sekolah *</label>
            <input
              type="text"
              required
              value={editingGroup.institutionName || ''}
              onChange={e => setEditingGroup({ ...editingGroup, institutionName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              placeholder="Contoh: SDN Temenggungan 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Lembaga</label>
              <select
                value={editingGroup.category || 'SD/MI'}
                onChange={e => setEditingGroup({ ...editingGroup, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value="SD/MI">SD / MI</option>
                <option value="SMP/MTs">SMP / MTs</option>
                <option value="SMA/MA">SMA / MA</option>
                <option value="Posyandu/BKB">Posyandu / BKB (Balita/Bumil)</option>
                <option value="Pondok Pesantren">Pondok Pesantren</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status Keaktifan</label>
              <select
                value={editingGroup.status || 'aktif'}
                onChange={e => setEditingGroup({ ...editingGroup, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value="aktif">Aktif Menerima</option>
                <option value="nonaktif">Nonaktif / Libur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Alamat Lembaga</label>
            <textarea
              rows={2}
              value={editingGroup.address || ''}
              onChange={e => setEditingGroup({ ...editingGroup, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              placeholder="Alamat lengkap lokasi pengantaran"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama PIC Lembaga / Kepsek *</label>
              <input
                type="text"
                required
                value={editingGroup.picName || ''}
                onChange={e => setEditingGroup({ ...editingGroup, picName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
                placeholder="Nama Kepala Sekolah / PIC"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">No. HP / WhatsApp *</label>
              <input
                type="text"
                required
                value={editingGroup.phone || ''}
                onChange={e => setEditingGroup({ ...editingGroup, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
                placeholder="0812-xxxx-xxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Bank</label>
              <input
                type="text"
                value={editingGroup.bankName || ''}
                onChange={e => setEditingGroup({ ...editingGroup, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
                placeholder="Bank Jatim / BSI"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={editingGroup.bankAccount || ''}
                onChange={e => setEditingGroup({ ...editingGroup, bankAccount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
                placeholder="Nomor rekening insentif"
              />
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={editingGroup.photoUrl || ''}
            onChange={url => setEditingGroup({ ...editingGroup, photoUrl: url })}
            label="Upload Foto Papan Nama Lembaga / Gedung Sekolah Sasaran"
            watermarkTag="Lembaga Sasaran Penerima MBG"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Lembaga
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah/Edit Sasaran Beneficiary */}
      <Modal
        isOpen={isBeneficiaryModalOpen}
        onClose={() => setIsBeneficiaryModalOpen(false)}
        title={editingBeneficiary.id ? 'Edit Data Sasaran & Porsi' : 'Input Data Sasaran Penerima Manfaat'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveBeneficiary} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Lembaga Terdaftar *</label>
              <select
                required
                value={editingBeneficiary.groupId || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  const found = groups.find(g => g.id === selectedId);
                  setEditingBeneficiary({
                    ...editingBeneficiary,
                    groupId: selectedId,
                    institutionName: found?.institutionName || ''
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="">-- Pilih Lembaga --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.institutionName} ({g.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Efektif</label>
              <input
                type="date"
                required
                value={editingBeneficiary.effectiveDate || ''}
                onChange={e => setEditingBeneficiary({ ...editingBeneficiary, effectiveDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
              Rincian Jiwa Sasaran Penerima
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Siswa Laki-laki</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.maleStudents ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, maleStudents: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 block mb-1">Siswa Perempuan</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.femaleStudents ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, femaleStudents: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 block mb-1">Guru Laki-laki</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.maleTeachers ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, maleTeachers: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 block mb-1">Guru Perempuan</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.femaleTeachers ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, femaleTeachers: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-slate-200">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Jumlah Balita</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.toddlers ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, toddlers: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 block mb-1">Jumlah Ibu Hamil</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.pregnantMothers ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, pregnantMothers: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 block mb-1">Jumlah Ibu Menyusui</label>
                <input
                  type="number"
                  min="0"
                  value={editingBeneficiary.breastfeedingMothers ?? 0}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, breastfeedingMothers: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Porsi Kecil (Custom)</label>
              <input
                type="number"
                min="0"
                value={editingBeneficiary.smallPortions ?? 0}
                onChange={e => setEditingBeneficiary({ ...editingBeneficiary, smallPortions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-amber-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Porsi Besar (Custom)</label>
              <input
                type="number"
                min="0"
                value={editingBeneficiary.largePortions ?? 0}
                onChange={e => setEditingBeneficiary({ ...editingBeneficiary, largePortions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Operasional</label>
            <input
              type="text"
              value={editingBeneficiary.notes || ''}
              onChange={e => setEditingBeneficiary({ ...editingBeneficiary, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Contoh: Jam istirahat makan siang 10:30 WIB"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBeneficiaryModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
            >
              Simpan Data Sasaran
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
