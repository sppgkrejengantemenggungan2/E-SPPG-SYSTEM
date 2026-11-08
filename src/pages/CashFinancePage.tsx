import { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Plus, 
  Calendar, 
  FileCheck, 
  Receipt,
  ShoppingCart
} from 'lucide-react';
import { getCashTransactions, saveCashTransaction, calculateCashBalance } from '../services/cashService';
import { getPurchaseOrders } from '../services/poService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { CashTransaction, PurchaseOrder } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface CashFinancePageProps {
  initialSubmodule?: string;
}

export default function CashFinancePage({ initialSubmodule = 'buku-kas' }: CashFinancePageProps) {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'buku-kas' | 'pemasukan' | 'pengeluaran' | 'rekap-keuangan'>('buku-kas');

  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<CashTransaction>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Keluar',
    category: 'Pembelian Bahan Pangan',
    amount: 0,
    description: '',
    verificationStatus: 'Terverifikasi'
  });

  const canEdit = hasPermission('finance', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'pemasukan') setActiveTab('pemasukan');
    else if (initialSubmodule === 'pengeluaran') setActiveTab('pengeluaran');
    else if (initialSubmodule === 'rekap-keuangan') setActiveTab('rekap-keuangan');
    else setActiveTab('buku-kas');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      const [tList, pList] = await Promise.all([
        getCashTransactions(),
        getPurchaseOrders()
      ]);
      setTransactions(tList || []);
      setPos(pList || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const cashSummary = calculateCashBalance(transactions);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return alert('Nominal transaksi harus lebih dari 0.');
    const saved = await saveCashTransaction({
      ...form,
      recordedBy: userProfile?.displayName || 'Bendahara SPPG'
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Keuangan & Kas',
      'CREATE',
      `Mencatat transaksi kas [${saved.type}] ${formatIDR(saved.amount)} No. Bukti: ${saved.proofNumber}`,
      saved.id
    );

    setIsModalOpen(false);
    loadData();
  };

  // Pay unpaid PO directly
  const handlePayPo = (po: PurchaseOrder) => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Keluar',
      category: 'Pembelian Bahan Pangan',
      amount: po.totalAmount,
      referencePoId: po.id,
      description: `Pelunasan Pembayaran Purchase Order ${po.poNumber} (${po.supplierName})`,
      verificationStatus: 'Terverifikasi'
    });
    setIsModalOpen(true);
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'pemasukan') return t.type === 'Masuk';
    if (activeTab === 'pengeluaran') return t.type === 'Keluar';
    return true;
  });

  const unpaidPos = pos.filter(p => p.isPaid !== 'Lunas');

  return (
    <div className="space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Penerimaan Kas</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-emerald-700">{formatIDR(cashSummary.totalIn)}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Dana APBN & Bantuan Yayasan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Pengeluaran Kas</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-rose-700">{formatIDR(cashSummary.totalOut)}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Pembelian Bahan & Biaya Operasional</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Saldo Kas Berjalan</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-sky-800">{formatIDR(cashSummary.balance)}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Sisa Likuiditas Kas Aktif</span>
        </div>
      </div>

      {/* Unpaid PO Banner Alert */}
      {unpaidPos.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div>
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-700" />
              Terdapat {unpaidPos.length} Tagihan Purchase Order (PO) Menunggu Pembayaran
            </h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Pengeluaran baru dicatat pada buku kas ketika pembayaran benar-benar dieksekusi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unpaidPos.map(p => (
              <button
                key={p.id}
                onClick={() => handlePayPo(p)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
              >
                Bayar {p.poNumber} ({formatIDR(p.totalAmount)})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('buku-kas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'buku-kas' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Buku Kas Terintegrasi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('pemasukan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pemasukan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Pemasukan Kas
          </button>
          <button
            onClick={() => setActiveTab('pengeluaran')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pengeluaran' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Pengeluaran Kas
          </button>
          <button
            onClick={() => setActiveTab('rekap-keuangan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rekap-keuangan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Laporan Rekapitulasi Kas (A4)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                setForm({
                  date: new Date().toISOString().split('T')[0],
                  type: activeTab === 'pemasukan' ? 'Masuk' : 'Keluar',
                  category: 'Pembelian Bahan Pangan',
                  amount: 0,
                  description: '',
                  verificationStatus: 'Terverifikasi'
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Transaksi Kas</span>
            </button>
          )}

          <ExportButton data={filteredTransactions} fileName={`Buku_Kas_${activeTab}`} />
        </div>
      </div>

      {/* TABLE BUKU KAS / PEMASUKAN / PENGELUARAN */}
      {activeTab !== 'rekap-keuangan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Bukti Kas</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3 text-center">Jenis</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Uraian / Keterangan</th>
                <th className="py-3 px-3 text-right">Nominal (Rp)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Bendahara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-sky-800">{tx.proofNumber}</td>
                  <td className="py-3 px-3 text-slate-500">{tx.date}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {tx.type === 'Masuk' ? '+' : '-'} {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{tx.category}</td>
                  <td className="py-3 px-3 text-slate-900 max-w-xs">{tx.description}</td>
                  <td className={`py-3 px-3 text-right font-black ${
                    tx.type === 'Masuk' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {tx.type === 'Masuk' ? '+' : '-'} {formatIDR(tx.amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {tx.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{tx.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: LAPORAN REKAPITULASI KAS (A4 Print Ready) */}
      {activeTab === 'rekap-keuangan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
          <KopSurat
            documentTitle="LAPORAN BUKU KAS UMUM (BKU) OPERASIONAL SPPG"
            documentNumber={`BKU/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/01`}
            date={new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          />

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4 text-center">
            <div>
              <span className="text-slate-500 block">Total Pemasukan Kas:</span>
              <strong className="text-emerald-700 text-sm font-black">{formatIDR(cashSummary.totalIn)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Total Pengeluaran Kas:</span>
              <strong className="text-rose-700 text-sm font-black">{formatIDR(cashSummary.totalOut)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Saldo Kas Akhir:</span>
              <strong className="text-sky-900 text-base font-black">{formatIDR(cashSummary.balance)}</strong>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="p-2 border-r border-slate-300">No. Bukti</th>
                  <th className="p-2 border-r border-slate-300">Tanggal</th>
                  <th className="p-2 border-r border-slate-300">Uraian Transaksi</th>
                  <th className="p-2 border-r border-slate-300 text-right">Penerimaan</th>
                  <th className="p-2 border-r border-slate-300 text-right">Pengeluaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-2 border-r border-slate-200 font-bold">{tx.proofNumber}</td>
                    <td className="p-2 border-r border-slate-200 text-slate-500">{tx.date}</td>
                    <td className="p-2 border-r border-slate-200">{tx.description}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-semibold text-emerald-800">
                      {tx.type === 'Masuk' ? formatIDR(tx.amount) : '-'}
                    </td>
                    <td className="p-2 text-right font-semibold text-rose-800">
                      {tx.type === 'Keluar' ? formatIDR(tx.amount) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-sky-50 font-black text-sky-950 border-t-2 border-sky-300">
                  <td colSpan={3} className="p-2.5 border-r border-sky-200 text-center">TOTAL PENUTUPAN BUKU KAS</td>
                  <td className="p-2.5 border-r border-sky-200 text-right text-emerald-900">{formatIDR(cashSummary.totalIn)}</td>
                  <td className="p-2.5 text-right text-rose-900">{formatIDR(cashSummary.totalOut)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala SPPG Probolinggo Krejengan 2</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">H. AHMAD ZAINI, S.Pd.I</p>
              <p className="text-[10px] text-slate-500">NIP. 19780512 200501 1 004</p>
            </div>
            <div>
              <p>Probolinggo, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
              <p className="font-bold text-slate-900">Bendahara Unit Pelayanan</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">SITI MUNAWWAROH, S.E</p>
              <p className="text-[10px] text-slate-500">Pengawas Keuangan (PLOK)</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Kas */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Transaksi Kas E-SPPG"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Jenis Transaksi</label>
              <select
                value={form.type || 'Keluar'}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold"
              >
                <option value="Keluar">Pengeluaran Kas (-)</option>
                <option value="Masuk">Penerimaan Kas (+)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={form.date || ''}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nominal (Rupiah) *</label>
            <input
              type="number"
              min="1"
              required
              value={form.amount || ''}
              onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-black text-slate-900 text-base"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Transaksi</label>
            <select
              value={form.category || 'Pembelian Bahan Pangan'}
              onChange={e => setForm({ ...form, category: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            >
              <option value="Pembelian Bahan Pangan">Pembelian Bahan Pangan</option>
              <option value="Dana Hibah/APBN">Dana Hibah / APBN</option>
              <option value="Operasional SPPG">Operasional SPPG</option>
              <option value="BBM & Transport">BBM & Transport</option>
              <option value="Insentif Relawan">Insentif Relawan</option>
              <option value="Insentif Lembaga">Insentif Lembaga</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Uraian / Deskripsi *</label>
            <textarea
              rows={2}
              required
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Contoh: Pembayaran pembelian daging ayam ke CV Barokah Protein"
            />
          </div>

          <WatermarkedPhotoUploader
            photoUrl={form.attachmentUrl || ''}
            onChange={url => setForm({ ...form, attachmentUrl: url })}
            label="Upload Foto Bukti Kuitansi / Struk / Bukti Transfer Kas"
            watermarkTag="Bukti Transaksi Kas MBG"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Transaksi Kas
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
