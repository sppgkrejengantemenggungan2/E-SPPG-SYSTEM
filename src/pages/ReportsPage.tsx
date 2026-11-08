import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Filter, 
  Search, 
  Download,
  Building2,
  FileCheck
} from 'lucide-react';
import { getBeneficiaries } from '../services/beneficiaryService';
import { getMenus } from '../services/menuService';
import { getRabs } from '../services/rabService';
import { getPurchaseOrders } from '../services/poService';
import { getReceivingChecklists } from '../services/receivingChecklistService';
import { getFoodIngredients } from '../services/foodIngredientService';
import { getCashTransactions, calculateCashBalance } from '../services/cashService';
import { getOrganolepticRecords } from '../services/organolepticService';
import { getDivisionTasks } from '../services/divisionTaskService';
import { getDistributionRecords } from '../services/distributionService';
import { getFoodWasteRecords } from '../services/foodWasteService';
import { useSppg } from '../context/SppgContext';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

export default function ReportsPage() {
  const { profile } = useSppg();
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Datasets
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [rabs, setRabs] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [cashTx, setCashTx] = useState<any[]>([]);
  const [organoleptics, setOrganoleptics] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [foodWastes, setFoodWastes] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [b, m, r, p, c, i, cash, org, t, dist, fw] = await Promise.all([
          getBeneficiaries(),
          getMenus(),
          getRabs(),
          getPurchaseOrders(),
          getReceivingChecklists(),
          getFoodIngredients(),
          getCashTransactions(),
          getOrganolepticRecords(),
          getDivisionTasks(),
          getDistributionRecords(),
          getFoodWasteRecords()
        ]);
        setBeneficiaries(b || []);
        setMenus(m || []);
        setRabs(r || []);
        setPos(p || []);
        setChecklists(c || []);
        setIngredients(i || []);
        setCashTx(cash || []);
        setOrganoleptics(org || []);
        setTasks(t || []);
        setDistributions(dist || []);
        setFoodWastes(fw || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const reportDefinitions = [
    { id: 1, title: 'Laporan Dokumentasi Perjalanan Dinas & Distribusi', source: 'Tugas Divisi Distribusi', data: distributions },
    { id: 2, title: 'Laporan Rekapitulasi Penerima Manfaat', source: 'Data Penerima Manfaat', data: beneficiaries },
    { id: 3, title: 'Laporan Rencana Anggaran Belanja (RAB)', source: 'RAB SPPG', data: rabs },
    { id: 4, title: 'Laporan Purchase Order (PO) Harian', source: 'PO Harian', data: pos },
    { id: 5, title: 'Laporan Checklist & Dokumentasi Bahan Pangan', source: 'Checklist Penerimaan', data: checklists },
    { id: 6, title: 'Laporan Stok & Stock Opname Gudang', source: 'Inventory & Opname', data: ingredients },
    { id: 7, title: 'Laporan Keuangan & Buku Kas Umum', source: 'Transaksi Kas', data: cashTx },
    { id: 8, title: 'Laporan Perencanaan Menu & Bahan Resep', source: 'Tugas PLOG', data: menus },
    { id: 9, title: 'Laporan Analisis Food Cost Menu', source: 'Input Food Cost', data: menus },
    { id: 10, title: 'Laporan Kandungan Gizi & Pemenuhan AKG', source: 'Input Gizi PLOG', data: menus },
    { id: 11, title: 'Laporan Evaluasi Organoleptik PIC', source: 'Organoleptik PIC', data: organoleptics.filter(o => o.type === 'PIC') },
    { id: 12, title: 'Laporan Evaluasi Organoleptik PLOG', source: 'Organoleptik PLOG', data: organoleptics.filter(o => o.type === 'PLOG') },
    { id: 13, title: 'Laporan Data & Suhu Ruangan Operasional', source: 'Tugas Divisi', data: tasks.filter(t => t.division === 'Persiapan') },
    { id: 14, title: 'Laporan Suhu Makanan Pengolahan Dapur', source: 'Divisi Pengolahan', data: tasks.filter(t => t.division === 'Pengolahan') },
    { id: 15, title: 'Laporan Suhu Makanan Pemorsian & Gramasi', source: 'Divisi Pemorsian', data: tasks.filter(t => t.division === 'Pemorsian') },
    { id: 16, title: 'Laporan Food Waste Cuci Ompreng', source: 'Divisi Cuci Ompreng', data: foodWastes }
  ];

  const currentReport = reportDefinitions.find(r => r.id === selectedReportId) || reportDefinitions[0];

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:w-1/2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Pilih dari 16 Laporan Resmi MBG:
            </label>
            <select
              value={selectedReportId}
              onChange={e => setSelectedReportId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-sky-900 bg-sky-50/40 focus:ring-2 focus:ring-sky-500"
            >
              {reportDefinitions.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.id}. {rep.title} (Sumber: {rep.source})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Dari Tanggal:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Sampai Tanggal:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="self-end">
              <ExportButton
                data={currentReport.data}
                fileName={currentReport.title.replace(/\s+/g, '_')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* A4 Report Output Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs print-container">
        <KopSurat
          documentTitle={currentReport.title.toUpperCase()}
          documentNumber={`LAP-${currentReport.id}/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/01`}
          date={`Periode: ${startDate} s/d ${endDate}`}
        />

        <div className="mb-4 text-xs text-slate-500 flex items-center justify-between">
          <span>Sumber Integrasi Data: <strong>{currentReport.source}</strong></span>
          <span>Jumlah Catatan: <strong>{currentReport.data.length} Data</strong></span>
        </div>

        {/* Dynamic Report Content Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
          {selectedReportId === 1 && (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">No. Pengiriman</th>
                  <th className="p-2 border-r border-slate-300">Tanggal</th>
                  <th className="p-2 border-r border-slate-300">Lembaga Tujuan</th>
                  <th className="p-2 border-r border-slate-300 text-center">Waktu Kirim</th>
                  <th className="p-2 border-r border-slate-300">Driver & Kendaraan</th>
                  <th className="p-2 border-r border-slate-300 text-right">Biaya BBM</th>
                  <th className="p-2 text-center">Status BAST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {distributions.map((d, i) => (
                  <tr key={d.id || i}>
                    <td className="p-2 border-r border-slate-200 font-bold text-sky-800">{d.distributionNumber}</td>
                    <td className="p-2 border-r border-slate-200">{d.date}</td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{d.institutionName}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{d.departureTime} - {d.arrivalTime}</td>
                    <td className="p-2 border-r border-slate-200">{d.driverName} ({d.vehicleNumber})</td>
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-800">{formatIDR(d.fuelCost)}</td>
                    <td className="p-2 text-center font-bold text-sky-800">{d.bastStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportId === 2 && (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">Nama Lembaga</th>
                  <th className="p-2 border-r border-slate-300 text-center">Siswa (L/P)</th>
                  <th className="p-2 border-r border-slate-300 text-center">Guru (L/P)</th>
                  <th className="p-2 border-r border-slate-300 text-center">Balita</th>
                  <th className="p-2 border-r border-slate-300 text-center">Bumil/Busui</th>
                  <th className="p-2 border-r border-slate-300 text-center font-bold text-amber-800">Porsi Kecil</th>
                  <th className="p-2 border-r border-slate-300 text-center font-bold text-emerald-800">Porsi Besar</th>
                  <th className="p-2 text-center font-black text-sky-900">Total Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {beneficiaries.map((b, i) => (
                  <tr key={b.id || i}>
                    <td className="p-2 border-r border-slate-200 font-bold">{b.institutionName}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.maleStudents} / {b.femaleStudents}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.maleTeachers} / {b.femaleTeachers}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.toddlers}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{b.pregnantMothers} / {b.breastfeedingMothers}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-amber-800">{b.smallPortions}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800">{b.largePortions}</td>
                    <td className="p-2 text-center font-black text-sky-900">{b.totalPortions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportId >= 3 && (
            <div className="p-4 bg-slate-50 text-slate-700">
              <table className="w-full text-left">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">ID / Referensi</th>
                    <th className="p-2 border-r border-slate-300">Nama / Judul</th>
                    <th className="p-2 border-r border-slate-300 text-center">Status</th>
                    <th className="p-2 text-right">Rincian Nilai / Kuantitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentReport.data.map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      <td className="p-2 border-r border-slate-200 font-bold text-sky-800">
                        {item.poNumber || item.rabNumber || item.recordNumber || item.distributionNumber || item.id}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-semibold">
                        {item.name || item.subject || item.menuName || item.institutionName || item.ingredientName || 'Catatan MBG'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status || item.conclusion || 'Terverifikasi'}
                        </span>
                      </td>
                      <td className="p-2 text-right font-black text-slate-900">
                        {item.totalAmount ? formatIDR(item.totalAmount) : (item.totalBudget ? formatIDR(item.totalBudget) : (item.currentStock ? `${item.currentStock} ${item.unit}` : (item.wastePercentage ? `${item.wastePercentage}%` : '-')))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Formal Signature Blocks */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold text-slate-900">Kepala SPPG Probolinggo Krejengan 2</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">{profile.headName}</p>
            <p className="text-[10px] text-slate-500">{profile.headNip ? `NIP. ${profile.headNip}` : 'Kepala SPPG'}</p>
          </div>
          <div>
            <p>Probolinggo, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            <p className="font-bold text-slate-900">Penanggung Jawab Laporan</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">{profile.nutritionistName}</p>
            <p className="text-[10px] text-slate-500">Tim Pengawas Terpadu MBG</p>
          </div>
        </div>
      </div>
    </div>
  );
}
