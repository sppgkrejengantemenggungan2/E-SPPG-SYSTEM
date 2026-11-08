import { useState, useEffect } from 'react';
import { 
  FileText, 
  Mail, 
  Send, 
  Printer, 
  Download, 
  Image as ImageIcon, 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  Clock, 
  CheckCircle2,
  Share2,
  UtensilsCrossed,
  Trash2,
  Edit3,
  UserCheck,
  ShieldAlert,
  Car
} from 'lucide-react';
import { getLetters, saveLetter, deleteLetter } from '../services/letterService';
import { getMenus } from '../services/menuService';
import { getBeneficiaries } from '../services/beneficiaryService';
import { useSppg } from '../context/SppgContext';
import { useAuth } from '../context/AuthContext';
import { logAuditEvent } from '../services/auditService';
import { LetterRecord, MenuPlan, Beneficiary } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';
import FlyerGeneratorSection from '../components/flyer/FlyerGeneratorSection';

interface AdministrationPageProps {
  initialSubmodule?: string;
}

export default function AdministrationPage({ initialSubmodule = 'surat-masuk' }: AdministrationPageProps) {
  const { profile } = useSppg();
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'surat-masuk' | 'surat-keluar' | 'surat-tugas' | 'flayer-menu' | 'arsip'>('surat-masuk');

  const [letters, setLetters] = useState<LetterRecord[]>([]);
  const [menus, setMenus] = useState<MenuPlan[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<LetterRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [isSuratTugasModalOpen, setIsSuratTugasModalOpen] = useState(false);
  const [letterForm, setLetterForm] = useState<Partial<LetterRecord>>({});

  // Specialized Surat Tugas Form State
  const [sptForm, setSptForm] = useState({
    letterNumber: `ST/09/SPPG-KRJ2/${new Date().getFullYear()}`,
    date: new Date().toISOString().split('T')[0],
    assignedOfficers: 'Khoirul Anam (Driver) & Hasan Basri (Asisten Distribusi)',
    officerPosition: 'Tim Petugas Divisi Distribusi & Logistik',
    destination: 'SDN Temenggungan 1, SDN Krejengan 2, MTs Hafshawaty',
    assignmentScope: 'Melaksanakan pengiriman ompreng MBG hangat tepat waktu, serah terima BAST fisik, dan penjemputan ompreng kosong setelah makan siang.',
    vehicle: 'N 8412 QW (Mobil Box MBG 01)',
    budgetSource: 'DIPA Badan Gizi Nasional Tahun Anggaran 2026',
    signatory: profile.headName || 'H. Ahmad Zaini, S.Pd.I'
  });

  const canEdit = hasPermission('administration', 'canCreate');
  const canDelete = hasPermission('administration', 'canDelete');

  useEffect(() => {
    if (initialSubmodule === 'surat-keluar') setActiveTab('surat-keluar');
    else if (initialSubmodule === 'surat-tugas') setActiveTab('surat-tugas');
    else if (initialSubmodule === 'flayer-menu') setActiveTab('flayer-menu');
    else if (initialSubmodule === 'arsip') setActiveTab('arsip');
    else setActiveTab('surat-masuk');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      const [lList, mList, bList] = await Promise.all([
        getLetters(),
        getMenus(),
        getBeneficiaries()
      ]);
      setLetters(lList || []);
      setMenus(mList || []);
      setBeneficiaries(bList || []);
      if (lList && lList.length > 0 && !selectedLetter) setSelectedLetter(lList[0]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveLetter(letterForm);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Administrasi',
      letterForm.id ? 'UPDATE' : 'CREATE',
      `Menyimpan dokumen ${saved.type} No: ${saved.letterNumber} (${saved.subject})`
    );
    setIsLetterModalOpen(false);
    await loadData();
    setSelectedLetter(saved);
  };

  const handleSaveSpt = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveLetter({
      type: 'Surat Tugas',
      letterNumber: sptForm.letterNumber,
      date: sptForm.date,
      recipientOrSender: sptForm.assignedOfficers,
      subject: `Surat Perintah Tugas Distribusi MBG: ${sptForm.destination}`,
      signatory: sptForm.signatory,
      category: 'Penyaluran',
      content: `Dasar Penugasan: ${sptForm.budgetSource}\n\nMenugaskan: ${sptForm.assignedOfficers} (${sptForm.officerPosition})\n\nUntuk Melaksanakan: ${sptForm.assignmentScope}\n\nTujuan Rute: ${sptForm.destination}\nKendaraan Armada: ${sptForm.vehicle}`,
      metadata: {
        assignedOfficers: sptForm.assignedOfficers,
        officerPosition: sptForm.officerPosition,
        destination: sptForm.destination,
        vehicle: sptForm.vehicle,
        assignmentScope: sptForm.assignmentScope,
        budgetSource: sptForm.budgetSource
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Administrasi',
      'CREATE',
      `Menerbitkan Surat Perintah Tugas ${saved.letterNumber} untuk ${sptForm.assignedOfficers}`
    );

    setIsSuratTugasModalOpen(false);
    await loadData();
    setSelectedLetter(saved);
  };

  const handleDeleteLetter = async (id: string, num: string) => {
    if (!confirm(`Hapus dokumen surat ${num}?`)) return;
    await deleteLetter(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Administrasi', 'DELETE', `Menghapus surat ${num}`);
    await loadData();
  };

  const filteredLetters = letters.filter(l => {
    const matchSearch = l.letterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.recipientOrSender.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (activeTab === 'surat-masuk') return l.type === 'Surat Masuk';
    if (activeTab === 'surat-keluar') return l.type === 'Surat Keluar' || l.type.includes('BAST');
    if (activeTab === 'surat-tugas') return l.type === 'Surat Tugas';
    return true; // arsip
  });

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('surat-masuk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'surat-masuk' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Surat Masuk
          </button>
          <button
            onClick={() => setActiveTab('surat-keluar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'surat-keluar' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Surat Keluar & BAST
          </button>
          <button
            onClick={() => setActiveTab('surat-tugas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'surat-tugas' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Cetak Surat Tugas (SPT)</span>
          </button>
          <button
            onClick={() => setActiveTab('flayer-menu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'flayer-menu' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
            <span>4. Pembuat Flyer Menu MBG</span>
          </button>
          <button
            onClick={() => setActiveTab('arsip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'arsip' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5. Arsip Dokumen ({letters.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && activeTab === 'surat-tugas' && (
            <button
              onClick={() => setIsSuratTugasModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Surat Perintah Tugas</span>
            </button>
          )}

          {canEdit && activeTab !== 'flayer-menu' && activeTab !== 'surat-tugas' && (
            <button
              onClick={() => {
                const targetType = activeTab === 'surat-masuk' ? 'Surat Masuk' : 'Surat Keluar';
                setLetterForm({
                  type: targetType,
                  letterNumber: `${Math.floor(10 + Math.random() * 90)}/SPPG-KRJ2/${new Date().getFullYear()}`,
                  date: new Date().toISOString().split('T')[0],
                  signatory: profile.headName,
                  category: 'Administrasi',
                  recipientOrSender: '',
                  subject: '',
                  content: ''
                });
                setIsLetterModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Dokumen</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </button>

          <ExportButton data={filteredLetters} fileName={`Administrasi_${activeTab}_SPPG`} />
        </div>
      </div>

      {/* FLYER MENU GENERATOR OTOMATIS */}
      {activeTab === 'flayer-menu' ? (
        <FlyerGeneratorSection menus={menus} />
      ) : (
        /* SURAT MASUK / SURAT KELUAR / SURAT TUGAS / ARSIP */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Letters List Column */}
          <div className="space-y-3 no-print">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor surat, perihal, atau tujuan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>

            {filteredLetters.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                Tidak ada dokumen surat yang cocok.
              </div>
            ) : (
              filteredLetters.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLetter(l)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs hover:border-sky-300 ${
                    selectedLetter?.id === l.id ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-sky-800">{l.letterNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      l.type === 'Surat Tugas' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {l.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{l.subject}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {l.type === 'Surat Masuk' ? 'Pengirim: ' : (l.type === 'Surat Tugas' ? 'Petugas: ' : 'Tujuan: ')}
                    <strong>{l.recipientOrSender}</strong>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tgl: {l.date}</span>
                    <span className="font-semibold text-sky-700">{l.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Letter Document Preview Column */}
          <div className="lg:col-span-2">
            {selectedLetter ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs print-container">
                {selectedLetter.type === 'Surat Tugas' ? (
                  /* SPECIALIZED SURAT PERINTAH TUGAS (SPT) LAYOUT */
                  <div>
                    <KopSurat
                      documentTitle="SURAT PERINTAH TUGAS (SPT)"
                      documentNumber={selectedLetter.letterNumber}
                      date={selectedLetter.date}
                    />

                    <div className="text-center mb-6">
                      <h3 className="text-sm font-black text-slate-900 underline uppercase tracking-wider">
                        SURAT PERINTAH TUGAS
                      </h3>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        Nomor: {selectedLetter.letterNumber}
                      </p>
                    </div>

                    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                      <div>
                        <span className="font-bold block text-slate-900 mb-1">DASAR PENUGASAN:</span>
                        <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-[11px]">
                          <li>Undang-Undang Republik Indonesia tentang Pemenuhan Gizi Nasional.</li>
                          <li>DIPA Satuan Pelayanan Pemenuhan Gizi (SPPG) Probolinggo Krejengan 2 Tahun Anggaran 2026.</li>
                          <li>Petunjuk Teknis Penyaluran Makan Bergizi Gratis (MBG) Badan Gizi Nasional (BGN).</li>
                        </ol>
                      </div>

                      <div className="pt-2">
                        <span className="font-bold block text-slate-900 mb-2">MEMERINTAHKAN:</span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="grid grid-cols-3">
                            <span className="text-slate-500">Nama / Petugas</span>
                            <span className="col-span-2 font-bold text-slate-900">: {selectedLetter.recipientOrSender}</span>
                          </div>
                          <div className="grid grid-cols-3">
                            <span className="text-slate-500">Jabatan / Divisi</span>
                            <span className="col-span-2 font-semibold text-slate-800">: {selectedLetter.metadata?.officerPosition || 'Divisi Distribusi & Transportasi'}</span>
                          </div>
                          <div className="grid grid-cols-3">
                            <span className="text-slate-500">Kendaraan Armada</span>
                            <span className="col-span-2 font-mono text-slate-900">: {selectedLetter.metadata?.vehicle || 'Mobil Box MBG 01 (N 8412 QW)'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="font-bold block text-slate-900 mb-1">UNTUK:</span>
                        <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-[11px] text-slate-700 space-y-1.5">
                          <p>
                            1. Melaksanakan penyaluran dan pendistribusian makanan bergizi gratis ke lembaga tujuan: <strong>{selectedLetter.metadata?.destination || selectedLetter.subject}</strong>.
                          </p>
                          <p>
                            2. Memastikan suhu ompreng tetap hangat saat diserahkan ke pihak sekolah serta melakukan penandatanganan Berita Acara Serah Terima (BAST).
                          </p>
                          <p>
                            3. Mengambil kembali wadah ompreng kosong setelah jam makan siang selesai dan mencatat kepatuhan sanitasi.
                          </p>
                          <p>
                            4. Melaporkan hasil pelaksanaan tugas kepada Kepala SPPG segera setelah kegiatan selesai.
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 italic pt-2">
                        Demikian Surat Perintah Tugas ini diberikan untuk dilaksanakan dengan penuh rasa tanggung jawab.
                      </p>

                      <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
                        <div />
                        <div>
                          <p>Dikeluarkan di: Probolinggo</p>
                          <p className="mb-2">Pada tanggal: {selectedLetter.date}</p>
                          <p className="font-bold text-slate-900">Kepala SPPG Krejengan 2</p>
                          <div className="h-16 flex items-center justify-center">
                            <span className="text-[10px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              Cap & Tanda Tangan Resmi
                            </span>
                          </div>
                          <p className="font-bold underline text-slate-900">{selectedLetter.signatory || profile.headName}</p>
                          <p className="text-[10px] text-slate-500">{profile.headNip ? `NIP. ${profile.headNip}` : 'Kepala Satuan Pelayanan'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STANDARD SURAT MASUK / SURAT KELUAR / BAST LAYOUT */
                  <div>
                    <KopSurat
                      documentTitle={selectedLetter.subject.toUpperCase()}
                      documentNumber={selectedLetter.letterNumber}
                      date={selectedLetter.date}
                    />

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-400 block">Jenis Dokumen:</span>
                          <strong className="text-slate-900">{selectedLetter.type}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{selectedLetter.type === 'Surat Masuk' ? 'Pengirim:' : 'Tujuan Surat:'}</span>
                          <strong className="text-slate-900">{selectedLetter.recipientOrSender}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-800 leading-relaxed space-y-3 min-h-[160px] whitespace-pre-line p-2">
                      {selectedLetter.content || 'Isi teks surat dinas belum dimasukkan.'}
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
                      <div>
                        {selectedLetter.type === 'Surat Masuk' && (
                          <>
                            <p>Diterima & Diarsipkan,</p>
                            <p className="font-bold text-slate-900">Tata Usaha SPPG Krejengan 2</p>
                            <div className="h-16" />
                            <p className="font-bold underline text-slate-900">ADMINISTRASI SPPG</p>
                          </>
                        )}
                      </div>
                      <div>
                        <p>Probolinggo, {selectedLetter.date}</p>
                        <p className="font-bold text-slate-900">{selectedLetter.signatory || 'Kepala SPPG Krejengan 2'}</p>
                        <div className="h-16" />
                        <p className="font-bold underline text-slate-900">{selectedLetter.signatory || profile.headName}</p>
                        <p className="text-[10px] text-slate-500">{profile.headNip ? `NIP. ${profile.headNip}` : 'Kepala SPPG'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {canDelete && (
                  <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end no-print">
                    <button
                      onClick={() => handleDeleteLetter(selectedLetter.id, selectedLetter.letterNumber)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Dokumen</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                Pilih surat dari daftar di sebelah kiri untuk melihat pratinjau.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: SURAT MASUK / SURAT KELUAR */}
      <Modal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        title={`Input ${letterForm.type || 'Dokumen Surat'}`}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveLetter} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor Surat *</label>
              <input
                type="text"
                required
                value={letterForm.letterNumber || ''}
                onChange={e => setLetterForm({ ...letterForm, letterNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Dokumen</label>
              <input
                type="date"
                required
                value={letterForm.date || ''}
                onChange={e => setLetterForm({ ...letterForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {letterForm.type === 'Surat Masuk' ? 'Pengirim Surat *' : 'Tujuan Surat *'}
              </label>
              <input
                type="text"
                required
                value={letterForm.recipientOrSender || ''}
                onChange={e => setLetterForm({ ...letterForm, recipientOrSender: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Contoh: Dinas Pendidikan / Puskesmas"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
              <select
                value={letterForm.category || 'Administrasi'}
                onChange={e => setLetterForm({ ...letterForm, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="Administrasi">Administrasi</option>
                <option value="Logistik">Logistik</option>
                <option value="Penyaluran">Penyaluran</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Koordinasi">Koordinasi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Perihal / Judul Surat *</label>
            <input
              type="text"
              required
              value={letterForm.subject || ''}
              onChange={e => setLetterForm({ ...letterForm, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Isi Surat / Keterangan</label>
            <textarea
              rows={4}
              value={letterForm.content || ''}
              onChange={e => setLetterForm({ ...letterForm, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Tuliskan isi surat resmi atau ringkasan disposisi"
            />
          </div>

          <WatermarkedPhotoUploader
            photoUrl={letterForm.fileUrl || ''}
            onChange={url => setLetterForm({ ...letterForm, fileUrl: url })}
            label="Upload Foto / Scan Berkas Surat Fisik (Cap Watermark Arsip)"
            watermarkTag={`Arsip ${letterForm.type || 'Surat'}`}
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLetterModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Dokumen
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: SURAT PERINTAH TUGAS (SPT) */}
      <Modal
        isOpen={isSuratTugasModalOpen}
        onClose={() => setIsSuratTugasModalOpen(false)}
        title="Formulir Penerbitan Surat Perintah Tugas (SPT)"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveSpt} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor Surat Tugas *</label>
              <input
                type="text"
                required
                value={sptForm.letterNumber}
                onChange={e => setSptForm({ ...sptForm, letterNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pelaksanaan *</label>
              <input
                type="date"
                required
                value={sptForm.date}
                onChange={e => setSptForm({ ...sptForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Petugas yang Ditugaskan *</label>
              <input
                type="text"
                required
                value={sptForm.assignedOfficers}
                onChange={e => setSptForm({ ...sptForm, assignedOfficers: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Jabatan / Divisi *</label>
              <input
                type="text"
                required
                value={sptForm.officerPosition}
                onChange={e => setSptForm({ ...sptForm, officerPosition: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Rute Lembaga Tujuan *</label>
              <input
                type="text"
                required
                value={sptForm.destination}
                onChange={e => setSptForm({ ...sptForm, destination: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Kendaraan Operasional *</label>
              <input
                type="text"
                required
                value={sptForm.vehicle}
                onChange={e => setSptForm({ ...sptForm, vehicle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Uraian Tugas Operasional *</label>
            <textarea
              rows={3}
              required
              value={sptForm.assignmentScope}
              onChange={e => setSptForm({ ...sptForm, assignmentScope: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Sumber Anggaran</label>
              <input
                type="text"
                value={sptForm.budgetSource}
                onChange={e => setSptForm({ ...sptForm, budgetSource: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Penandatangan (Kepala SPPG)</label>
              <input
                type="text"
                value={sptForm.signatory}
                onChange={e => setSptForm({ ...sptForm, signatory: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSuratTugasModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Terbitkan Surat Perintah Tugas
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
