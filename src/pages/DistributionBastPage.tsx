import { useState, useEffect } from 'react';
import { 
  Truck, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Building2, 
  DollarSign, 
  Camera, 
  Printer,
  FileCheck
} from 'lucide-react';
import { getDistributionRecords, saveDistributionRecord } from '../services/distributionService';
import { getBeneficiaryGroups } from '../services/beneficiaryService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { DistributionRecord, BeneficiaryGroup } from '../types';
import Modal from '../components/common/Modal';
import PhotoUploader from '../components/common/PhotoUploader';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface DistributionBastPageProps {
  initialSubmodule?: string;
}

export default function DistributionBastPage({ initialSubmodule = 'jadwal' }: DistributionBastPageProps) {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'jadwal' | 'bast-terima' | 'bast-kembali'>('jadwal');
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [groups, setGroups] = useState<BeneficiaryGroup[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DistributionRecord | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<DistributionRecord>>({});

  const canEdit = hasPermission('distribution', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'bast-terima') setActiveTab('bast-terima');
    else if (initialSubmodule === 'bast-kembali') setActiveTab('bast-kembali');
    else setActiveTab('jadwal');
  }, [initialSubmodule]);

  const loadAll = async () => {
    try {
      const [dList, gList] = await Promise.all([
        getDistributionRecords(),
        getBeneficiaryGroups()
      ]);
      setDistributions(dList || []);
      setGroups(gList || []);
      if (dList && dList.length > 0 && !selectedRecord) setSelectedRecord(dList[0]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institutionName) return alert('Pilih lembaga tujuan.');
    const saved = await saveDistributionRecord(form);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Penyaluran & BAST',
      'CREATE',
      `Mencatat jadwal pengiriman ke ${saved.institutionName} BAST: ${saved.bastNumber}`
    );
    setIsModalOpen(false);
    await loadAll();
    setSelectedRecord(saved);
  };

  const handleIssueBast = async (dist: DistributionRecord, type: 'Penerimaan' | 'Pengembalian') => {
    const bastNum = `BAST-${type === 'Penerimaan' ? 'TERIMA' : 'KEMBALI'}/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`;
    const updated = await saveDistributionRecord({
      ...dist,
      bastNumber: bastNum,
      bastStatus: 'Diterbitkan',
      status: type === 'Penerimaan' ? 'Selesai Serah Terima' : 'Selesai Serah Terima'
    });
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Penyaluran & BAST',
      'APPROVE',
      `Menerbitkan ${type} ${bastNum} untuk ${dist.institutionName}`
    );
    alert(`BAST ${type} Berhasil diterbitkan dan otomatis tercatat di Arsip Surat Keluar.`);
    setSelectedRecord(updated);
    loadAll();
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'jadwal' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Jadwal Pengiriman & BBM ({distributions.length})
          </button>
          <button
            onClick={() => setActiveTab('bast-terima')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bast-terima' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. BAST Penerimaan Makanan
          </button>
          <button
            onClick={() => setActiveTab('bast-kembali')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bast-kembali' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. BAST Pengembalian Ompreng
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                const targetGroup = groups[0];
                setForm({
                  date: new Date().toISOString().split('T')[0],
                  institutionId: targetGroup?.id || '',
                  institutionName: targetGroup?.institutionName || '',
                  picName: targetGroup?.picName || '',
                  phone: targetGroup?.phone || '',
                  smallPortions: 110,
                  largePortions: 120,
                  departureTime: '09:30 WIB',
                  arrivalTime: '10:00 WIB',
                  driverName: 'Khoirul Anam',
                  vehicleNumber: 'N 8412 QW (Mobil Box 01)',
                  fuelCost: 65000,
                  status: 'Dalam Pengiriman',
                  bastStatus: 'Draft',
                  photoUrls: []
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pengiriman Baru</span>
            </button>
          )}

          <ExportButton data={distributions} fileName="Distribusi_dan_BAST_MBG" />
        </div>
      </div>

      {/* TAB 1: JADWAL PENGIRIMAN & BBM */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {distributions.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedRecord(d)}
                className={`bg-white rounded-2xl border p-5 cursor-pointer shadow-2xs hover:border-sky-300 transition-all ${
                  selectedRecord?.id === d.id ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-sky-700 uppercase">{d.distributionNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.status === 'Selesai Serah Terima' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}>
                    {d.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">{d.institutionName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  PIC: <strong>{d.picName}</strong> ({d.phone})
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Waktu Pengantaran:</span>
                    <strong className="text-slate-800">{d.departureTime} ➔ {d.arrivalTime}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Armada & Driver:</span>
                    <strong className="text-slate-800 truncate block">{d.driverName} ({d.vehicleNumber})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jumlah Porsi:</span>
                    <strong className="text-sky-800">{d.totalPortions} Porsi ({d.smallPortions} K / {d.largePortions} B)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Beban BBM:</span>
                    <strong className="text-emerald-700">{formatIDR(d.fuelCost)}</strong>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between no-print">
                  <span className="text-[11px] text-slate-400">
                    BAST: <strong>{d.bastNumber || 'Belum Terbit'}</strong>
                  </span>
                  {!d.bastNumber && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIssueBast(d, 'Penerimaan');
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md shadow-2xs"
                    >
                      Terbitkan BAST
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BAST PENERIMAAN (A4 Formal Document) */}
      {activeTab === 'bast-terima' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
          {selectedRecord ? (
            <div>
              <KopSurat
                documentTitle="BERITA ACARA SERAH TERIMA (BAST) PENERIMAAN MAKAN BERGIZI GRATIS"
                documentNumber={selectedRecord.bastNumber || `BAST-TERIMA/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/001`}
                date={selectedRecord.date}
              />

              <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                <p>
                  Pada hari ini, tanggal <strong>{new Date(selectedRecord.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</strong>, bertempat di <strong>{selectedRecord.institutionName}</strong>, telah dilaksanakan serah terima paket Program Makan Bergizi Gratis (MBG) antara pihak:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-slate-900 block mb-1 text-xs">PIHAK PERTAMA (Yang Menyerahkan):</strong>
                    <div className="space-y-0.5 text-[11px]">
                      <div>Nama Petugas: <strong>{selectedRecord.driverName}</strong></div>
                      <div>Jabatan: <strong>Tim Distribusi & Logistik SPPG</strong></div>
                      <div>Unit: <strong>SPPG Probolinggo Krejengan Temenggungan 2</strong></div>
                      <div>Kendaraan: <strong>{selectedRecord.vehicleNumber}</strong></div>
                    </div>
                  </div>
                  <div>
                    <strong className="text-slate-900 block mb-1 text-xs">PIHAK KEDUA (Yang Menerima):</strong>
                    <div className="space-y-0.5 text-[11px]">
                      <div>Nama Penerima / PIC: <strong>{selectedRecord.picName}</strong></div>
                      <div>Lembaga Penerima: <strong>{selectedRecord.institutionName}</strong></div>
                      <div>Kontak / WhatsApp: <strong>{selectedRecord.phone}</strong></div>
                      <div>Waktu Serah Terima: <strong>{selectedRecord.arrivalTime} WIB</strong></div>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2.5 border-r border-slate-300">No</th>
                        <th className="p-2.5 border-r border-slate-300">Uraian Penyerahan</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Jumlah Porsi</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Kemasan / Wadah</th>
                        <th className="p-2.5 text-center">Kondisi Makanan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 border-r border-slate-200 text-center">1</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          Paket Porsi Kecil (Balita / Siswa Kelas 1-3)
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-800">
                          {selectedRecord.smallPortions} Porsi
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">Ompreng Stainless SUS-304 Tersegel</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">Hangat & Higienis</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-200 text-center">2</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          Paket Porsi Besar (Siswa Kelas 4-6, MTs, Guru & Bumil)
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">
                          {selectedRecord.largePortions} Porsi
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">Ompreng Stainless SUS-304 Tersegel</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">Hangat & Higienis</td>
                      </tr>
                      <tr className="bg-sky-50 font-black text-sky-950 border-t-2 border-sky-300">
                        <td colSpan={2} className="p-2 border-r border-sky-200 text-center">TOTAL PENYERAHAN MAKANAN</td>
                        <td className="p-2 border-r border-sky-200 text-center text-sm">{selectedRecord.totalPortions} Porsi</td>
                        <td colSpan={2} className="p-2 text-center text-xs text-sky-800">Sesuai Surat Pesanan Resmi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-600 italic">
                  Catatan: Makanan telah diperiksa kondisi organoleptik fisiknya oleh PIC Lembaga dalam kondisi higienis, hangat, dan layak dikonsumsi. Ompreng wajib dikembalikan dalam kondisi utuh setelah jam makan siang.
                </p>

                <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center">
                  <div>
                    <p>Yang Menerima (PIHAK KEDUA),</p>
                    <p className="font-bold text-slate-900">{selectedRecord.institutionName}</p>
                    <div className="h-16" />
                    <p className="font-bold underline text-slate-900">{selectedRecord.picName}</p>
                    <p className="text-[10px] text-slate-500">Kepala Sekolah / PIC</p>
                  </div>
                  <div>
                    <p>Yang Menyerahkan (PIHAK PERTAMA),</p>
                    <p className="font-bold text-slate-900">Petugas Distribusi SPPG</p>
                    <div className="h-16" />
                    <p className="font-bold underline text-slate-900">{selectedRecord.driverName}</p>
                    <p className="text-[10px] text-slate-500">Driver & Koordinator Lapangan</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">Pilih data pengiriman terlebih dahulu.</div>
          )}
        </div>
      )}

      {/* TAB 3: BAST PENGEMBALIAN OMPRENG */}
      {activeTab === 'bast-kembali' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
          {selectedRecord ? (
            <div>
              <KopSurat
                documentTitle="BERITA ACARA SERAH TERIMA (BAST) PENGEMBALIAN WADAH OMPRENG MBG"
                documentNumber={`BAST-KEMBALI/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/001`}
                date={selectedRecord.date}
              />

              <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                <p>
                  Pada hari ini, tanggal <strong>{new Date(selectedRecord.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</strong>, telah dilakukan serah terima pengembalian wadah ompreng makan bergizi gratis dari <strong>{selectedRecord.institutionName}</strong> ke dapur <strong>SPPG Probolinggo Krejengan Temenggungan 2</strong>:
                </p>

                <div className="border border-slate-300 rounded-lg overflow-hidden my-4">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2.5 border-r border-slate-300">No</th>
                        <th className="p-2.5 border-r border-slate-300">Nama Barang Inventaris</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Jumlah Diserahkan Awal</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Jumlah Kembali</th>
                        <th className="p-2.5 text-center">Status Kelengkapan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 border-r border-slate-200 text-center">1</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">Ompreng Stainless Steel 5 Sekat SUS-304</td>
                        <td className="p-2 border-r border-slate-200 text-center">{selectedRecord.totalPortions} Pcs</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">{selectedRecord.totalPortions} Pcs</td>
                        <td className="p-2 text-center font-bold text-emerald-700">Lengkap (100%)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-200 text-center">2</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">Sendok & Garpu Stainless Steel MBG</td>
                        <td className="p-2 border-r border-slate-200 text-center">{selectedRecord.totalPortions} Set</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">{selectedRecord.totalPortions} Set</td>
                        <td className="p-2 text-center font-bold text-emerald-700">Lengkap (100%)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-200 text-center">3</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">Box Kontainer Isolasi Termal MBG</td>
                        <td className="p-2 border-r border-slate-200 text-center">4 Box</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">4 Box</td>
                        <td className="p-2 text-center font-bold text-emerald-700">Kondisi Baik</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center">
                  <div>
                    <p>Yang Mengembalikan,</p>
                    <p className="font-bold text-slate-900">{selectedRecord.institutionName}</p>
                    <div className="h-16" />
                    <p className="font-bold underline text-slate-900">{selectedRecord.picName}</p>
                  </div>
                  <div>
                    <p>Yang Menerima,</p>
                    <p className="font-bold text-slate-900">Petugas Cuci & Logistik SPPG</p>
                    <div className="h-16" />
                    <p className="font-bold underline text-slate-900">AGUS SUBEKTI</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">Pilih data terlebih dahulu.</div>
          )}
        </div>
      )}

      {/* Modal Input Distribusi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Rencana & Pengiriman Makanan MBG"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveDistribution} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Lembaga Tujuan *</label>
              <select
                required
                value={form.institutionId || ''}
                onChange={e => {
                  const sId = e.target.value;
                  const found = groups.find(g => g.id === sId);
                  setForm({
                    ...form,
                    institutionId: sId,
                    institutionName: found?.institutionName || '',
                    picName: found?.picName || '',
                    phone: found?.phone || ''
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
              >
                <option value="">-- Pilih Lembaga --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.institutionName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pengiriman</label>
              <input
                type="date"
                required
                value={form.date || ''}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Porsi Kecil</label>
              <input
                type="number"
                min="0"
                value={form.smallPortions ?? 0}
                onChange={e => setForm({ ...form, smallPortions: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 block mb-1">Porsi Besar</label>
              <input
                type="number"
                min="0"
                value={form.largePortions ?? 0}
                onChange={e => setForm({ ...form, largePortions: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 block mb-1">Jam Berangkat</label>
              <input
                type="text"
                value={form.departureTime || ''}
                onChange={e => setForm({ ...form, departureTime: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                placeholder="09:30 WIB"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 block mb-1">Jam Tiba</label>
              <input
                type="text"
                value={form.arrivalTime || ''}
                onChange={e => setForm({ ...form, arrivalTime: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                placeholder="10:00 WIB"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Nama Petugas / Driver</label>
              <input
                type="text"
                value={form.driverName || ''}
                onChange={e => setForm({ ...form, driverName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                placeholder="Khoirul Anam"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 block mb-1">No. Polisi / Kendaraan</label>
              <input
                type="text"
                value={form.vehicleNumber || ''}
                onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                placeholder="N 8412 QW (Mobil Box)"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 block mb-1">Nominal BBM (Rp)</label>
              <input
                type="number"
                min="0"
                value={form.fuelCost ?? 0}
                onChange={e => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
              />
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={(form.photoUrls && form.photoUrls[0]) || ''}
            onChange={url => setForm({ ...form, photoUrls: [url] })}
            label="Upload Foto Serah Terima & Kondisi Ompreng (Dilengkapi Cap Watermark)"
            watermarkTag="Serah Terima Penyaluran MBG"
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
              Simpan Distribusi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
