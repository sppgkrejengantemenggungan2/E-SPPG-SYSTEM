import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Calendar, 
  Utensils, 
  Building2, 
  Camera 
} from 'lucide-react';
import { getOrganolepticRecords, saveOrganolepticRecord } from '../services/organolepticService';
import { getMenus } from '../services/menuService';
import { getBeneficiaryGroups } from '../services/beneficiaryService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { OrganolepticRecord, MenuPlan, BeneficiaryGroup } from '../types';
import Modal from '../components/common/Modal';
import PhotoUploader from '../components/common/PhotoUploader';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface OrganolepticPageProps {
  initialSubmodule?: string;
}

export default function OrganolepticPage({ initialSubmodule = 'plog' }: OrganolepticPageProps) {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'PLOG' | 'PIC'>('PLOG');
  const [records, setRecords] = useState<OrganolepticRecord[]>([]);
  const [menus, setMenus] = useState<MenuPlan[]>([]);
  const [groups, setGroups] = useState<BeneficiaryGroup[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OrganolepticRecord | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<OrganolepticRecord>>({});

  const canEdit = hasPermission('organoleptic', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'pic') setActiveTab('PIC');
    else setActiveTab('PLOG');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      const [rList, mList, gList] = await Promise.all([
        getOrganolepticRecords(),
        getMenus(),
        getBeneficiaryGroups()
      ]);
      setRecords(rList || []);
      setMenus(mList || []);
      setGroups(gList || []);
      if (rList && rList.length > 0 && !selectedRecord) {
        setSelectedRecord(rList[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveOrganolepticRecord({
      ...form,
      type: activeTab
    });
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Uji Organoleptik',
      'CREATE',
      `Mencatat evaluasi sensori Organoleptik [${activeTab}] No: ${saved.recordNumber}`
    );
    setIsModalOpen(false);
    await loadData();
    setSelectedRecord(saved);
  };

  const filteredRecords = records.filter(r => r.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('PLOG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PLOG' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Organoleptik PLOG (Dapur SPPG)
          </button>
          <button
            onClick={() => setActiveTab('PIC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PIC' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Organoleptik PIC (Sekolah/Lembaga)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                const latestMenu = menus[0];
                setForm({
                  type: activeTab,
                  date: new Date().toISOString().split('T')[0],
                  time: '08:30 WIB',
                  menuName: latestMenu?.name || 'Paket Bergizi Komplit',
                  inspectorName: activeTab === 'PLOG' ? (userProfile?.displayName || 'Fitri Rahmawati, S.Gz') : 'Kepala Sekolah / PIC',
                  institution: activeTab === 'PLOG' ? 'Dapur SPPG Krejengan Temenggungan 2' : (groups[0]?.institutionName || 'SDN Temenggungan 1'),
                  color: 'Sangat Menarik',
                  aroma: 'Sangat Sedap/Khas',
                  taste: 'Sangat Lezat & Pas',
                  texture: 'Sangat Empuk/Pas',
                  appearance: 'Sangat Bersih & Menarik',
                  conclusion: 'Sangat Layak Konsumsi',
                  notes: 'Suhu makanan hangat terjaga, aroma segar, rasa seimbang rendah gula garam.',
                  photoUrls: []
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Hasil Uji {activeTab}</span>
            </button>
          )}

          <ExportButton data={filteredRecords} fileName={`Organoleptik_${activeTab}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Records */}
        <div className="space-y-3 no-print">
          {filteredRecords.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedRecord(r)}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs hover:border-sky-300 ${
                selectedRecord?.id === r.id ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-sky-700">{r.recordNumber}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {r.conclusion}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{r.menuName}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{r.institution} • {r.date} ({r.time})</p>
              <div className="mt-2 text-[10px] text-slate-400">
                Pemeriksa: <strong className="text-slate-700">{r.inspectorName}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Right Printable A4 Document Preview */}
        <div className="lg:col-span-2">
          {selectedRecord ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
              <KopSurat
                documentTitle={`LEMBAR HASIL UJI ORGANOLEPTIK PANGAN (${selectedRecord.type})`}
                documentNumber={selectedRecord.recordNumber}
                date={`${selectedRecord.date} • Pukul ${selectedRecord.time}`}
              />

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>Nama Menu: <strong className="text-slate-900 block font-bold">{selectedRecord.menuName}</strong></div>
                  <div>Lokasi Pemeriksaan: <strong className="text-slate-900 block font-bold">{selectedRecord.institution}</strong></div>
                  <div>Pemeriksa: <strong className="text-slate-900">{selectedRecord.inspectorName}</strong></div>
                  <div>Waktu Pemeriksaan: <strong className="text-slate-900">{selectedRecord.time}</strong></div>
                </div>
              </div>

              {/* Sensory Evaluation Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden my-4 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300 w-12 text-center">No</th>
                      <th className="p-2.5 border-r border-slate-300">Parameter Uji Sensori</th>
                      <th className="p-2.5 border-r border-slate-300">Hasil Penilaian Sensori</th>
                      <th className="p-2.5 text-center">Standar Keamanan MBG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 border-r border-slate-200 text-center">1</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Warna (Color)</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-sky-900">{selectedRecord.color}</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">Alami, Cerah, Tidak Pucat</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 text-center">2</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Aroma (Odor)</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-sky-900">{selectedRecord.aroma}</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">Harum Segar, Bebas Bau Tengik/Asam</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 text-center">3</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Rasa (Taste)</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-sky-900">{selectedRecord.taste}</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">Gurih Pas, Rendah Gula Garam (AKG)</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 text-center">4</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Tekstur (Texture)</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-sky-900">{selectedRecord.texture}</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">Matang Merata, Tidak Mentah/Lembek</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 text-center">5</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Penampilan (Appearance)</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-sky-900">{selectedRecord.appearance}</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">Bersih, Higienis, Rapi di Ompreng</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black text-emerald-950 border-t-2 border-emerald-300">
                      <td colSpan={2} className="p-2.5 border-r border-emerald-200 text-center">KESIMPULAN UJI ORGANOLEPTIK</td>
                      <td colSpan={2} className="p-2.5 text-center text-sm font-extrabold text-emerald-800">
                        {selectedRecord.conclusion}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedRecord.notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs mt-2">
                  <span className="font-bold text-slate-700 block mb-0.5">Catatan Tambahan Pemeriksa:</span>
                  <p className="text-slate-600">{selectedRecord.notes}</p>
                </div>
              )}

              {/* Photos */}
              {selectedRecord.photoUrls && selectedRecord.photoUrls.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                  {selectedRecord.photoUrls.map((p, i) => (
                    <img key={i} src={p} alt="Foto Organoleptik" className="w-20 h-16 object-cover rounded-md border border-slate-200" />
                  ))}
                </div>
              )}

              {/* Formal Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold text-slate-900">Kepala SPPG Probolinggo Krejengan 2</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">H. AHMAD ZAINI, S.Pd.I</p>
                  <p className="text-[10px] text-slate-500">NIP. 19780512 200501 1 004</p>
                </div>
                <div>
                  <p>Pemeriksa / Penguji Sensori,</p>
                  <p className="font-bold text-slate-900">{selectedRecord.type === 'PLOG' ? 'Ahli Gizi (PLOG)' : 'PIC / Pengawas Sekolah'}</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">{selectedRecord.inspectorName}</p>
                  <p className="text-[10px] text-slate-500">( Paraf & Tanggal Uji )</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal Input Hasil Uji Organoleptik */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Input Evaluasi Sensori Organoleptik: ${activeTab}`}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Menu Diuji *</label>
              <select
                required
                value={form.menuName}
                onChange={e => setForm({ ...form, menuName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
              >
                {menus.map(m => (
                  <option key={m.id} value={m.name}>{m.name} ({m.date})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Lokasi Pemeriksaan</label>
              <input
                type="text"
                required
                value={form.institution || ''}
                onChange={e => setForm({ ...form, institution: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Pemeriksa / Ahli Gizi</label>
              <input
                type="text"
                required
                value={form.inspectorName || ''}
                onChange={e => setForm({ ...form, inspectorName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Waktu Uji (Jam)</label>
              <input
                type="text"
                value={form.time || '08:30 WIB'}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase block">Parameter Sensori Makanan:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Warna</label>
                <select
                  value={form.color || 'Sangat Menarik'}
                  onChange={e => setForm({ ...form, color: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Sangat Menarik">Sangat Menarik</option>
                  <option value="Menarik">Menarik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang Menarik">Kurang Menarik</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Aroma</label>
                <select
                  value={form.aroma || 'Sangat Sedap/Khas'}
                  onChange={e => setForm({ ...form, aroma: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Sangat Sedap/Khas">Sangat Sedap/Khas</option>
                  <option value="Sedap">Sedap</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang Sedap/Asing">Kurang Sedap/Asing</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Rasa</label>
                <select
                  value={form.taste || 'Sangat Lezat & Pas'}
                  onChange={e => setForm({ ...form, taste: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Sangat Lezat & Pas">Sangat Lezat & Pas</option>
                  <option value="Lezat">Lezat</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Hambar/Kurang Pas">Hambar/Kurang Pas</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Tekstur</label>
                <select
                  value={form.texture || 'Sangat Empuk/Pas'}
                  onChange={e => setForm({ ...form, texture: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Sangat Empuk/Pas">Sangat Empuk/Pas</option>
                  <option value="Empuk">Empuk</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Keras/Lembek">Keras/Lembek</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Penampilan</label>
                <select
                  value={form.appearance || 'Sangat Bersih & Menarik'}
                  onChange={e => setForm({ ...form, appearance: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Sangat Bersih & Menarik">Sangat Bersih & Menarik</option>
                  <option value="Bersih & Menarik">Bersih & Menarik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang Higienis">Kurang Higienis</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Kesimpulan Kelayakan</label>
                <select
                  value={form.conclusion || 'Sangat Layak Konsumsi'}
                  onChange={e => setForm({ ...form, conclusion: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold"
                >
                  <option value="Sangat Layak Konsumsi">Sangat Layak Konsumsi</option>
                  <option value="Layak Konsumsi">Layak Konsumsi</option>
                  <option value="Layak dengan Catatan">Layak dengan Catatan</option>
                  <option value="Tidak Layak Konsumsi">Tidak Layak Konsumsi</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Uji Organoleptik</label>
            <textarea
              rows={2}
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Catatan kebersihan ompreng, suhu penyajian, dan komentar rasa"
            />
          </div>

          <WatermarkedPhotoUploader
            photoUrl={(form.photoUrls && form.photoUrls[0]) || ''}
            onChange={url => setForm({ ...form, photoUrls: [url] })}
            label="Upload Foto Dokumentasi Sampel Hidangan (Watermark SPPG)"
            watermarkTag={`Uji Organoleptik ${activeTab}`}
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
            >
              Simpan Hasil Uji
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
