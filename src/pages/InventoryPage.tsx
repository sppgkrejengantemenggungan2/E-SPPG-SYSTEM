import { useState, useEffect } from 'react';
import { 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Plus, 
  Search, 
  Scale, 
  CheckCircle2, 
  Calendar,
  History
} from 'lucide-react';
import { getFoodIngredients, saveFoodIngredient } from '../services/foodIngredientService';
import { getInventoryTransactions, recordInventoryMovement, getStockOpnames, saveStockOpname } from '../services/inventoryService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { FoodIngredient, InventoryTransaction, StockOpname } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface InventoryPageProps {
  initialSubmodule?: string;
}

export default function InventoryPage({ initialSubmodule = 'stok' }: InventoryPageProps) {
  const { userProfile, activeRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'stok' | 'mutasi' | 'opname'>('stok');

  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Bahan Pangan' | 'Barang Operasional'>('Semua');

  // Manual stock movement modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementData, setMovementData] = useState<{
    ingredientId: string;
    type: 'Masuk' | 'Keluar';
    quantity: number;
    reference: string;
    note: string;
    proofUrl?: string;
  }>({
    ingredientId: '',
    type: 'Keluar',
    quantity: 1,
    reference: 'Pemakaian Dapur Harian',
    note: '',
    proofUrl: ''
  });

  // Stock Opname modal
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameData, setOpnameData] = useState<Partial<StockOpname>>({});

  const canEdit = hasPermission('inventory', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'mutasi') setActiveTab('mutasi');
    else if (initialSubmodule === 'opname') setActiveTab('opname');
    else setActiveTab('stok');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      const [iData, tData, oData] = await Promise.all([
        getFoodIngredients(),
        getInventoryTransactions(),
        getStockOpnames()
      ]);
      setIngredients(iData || []);
      setTransactions(tData || []);
      setOpnames(oData || []);
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

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementData.ingredientId) return alert('Pilih bahan terlebih dahulu.');
    try {
      await recordInventoryMovement(
        movementData.ingredientId,
        movementData.type,
        movementData.quantity,
        movementData.reference,
        userProfile?.displayName || 'Admin Gudang',
        movementData.note,
        activeRole === 'Admin Utama',
        movementData.proofUrl
      );
      await logAuditEvent(
        userProfile?.displayName || 'User',
        userProfile?.email || '',
        'Inventory',
        'STOCK_MUTATION',
        `Mutasi ${movementData.type} stok sebesar ${movementData.quantity} ref: ${movementData.reference}`
      );
      alert('Transaksi stok berhasil dicatat.');
      setIsMovementModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses mutasi stok.');
    }
  };

  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameData.ingredientId) return alert('Pilih bahan terlebih dahulu.');
    const ing = ingredients.find(i => i.id === opnameData.ingredientId);
    if (!ing) return;

    await saveStockOpname({
      ...opnameData,
      ingredientName: ing.name,
      unit: ing.unit,
      systemStock: ing.currentStock,
      physicalStock: Number(opnameData.physicalStock) || 0,
      status: 'Disetujui'
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Inventory',
      'STOCK_MUTATION',
      `Stock Opname fisik bahan ${ing.name}: sistem ${ing.currentStock} vs fisik ${opnameData.physicalStock}`
    );

    setIsOpnameModalOpen(false);
    loadData();
  };

  const filteredIngredients = ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'Semua' || i.itemType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('stok')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stok' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Stok Bahan & Barang ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab('mutasi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mutasi' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Riwayat Mutasi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('opname')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'opname' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Stock Opname ({opnames.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => {
                  setMovementData({
                    ingredientId: ingredients[0]?.id || '',
                    type: 'Keluar',
                    quantity: 10,
                    reference: 'Penggunaan Bahan Dapur',
                    note: 'Dikeluarkan untuk masak harian'
                  });
                  setIsMovementModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Pengeluaran Dapur</span>
              </button>

              <button
                onClick={() => {
                  setOpnameData({
                    date: new Date().toISOString().split('T')[0],
                    officerName: userProfile?.displayName || 'Admin Gudang',
                    ingredientId: ingredients[0]?.id || '',
                    physicalStock: ingredients[0]?.currentStock || 0,
                    reason: 'Pemeriksaan rutin mingguan'
                  });
                  setIsOpnameModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Scale className="w-4 h-4" />
                <span>Stock Opname Fisik</span>
              </button>
            </>
          )}

          <ExportButton
            data={activeTab === 'stok' ? ingredients : (activeTab === 'mutasi' ? transactions : opnames)}
            fileName={`Inventory_${activeTab.toUpperCase()}`}
          />
        </div>
      </div>

      {/* TAB 1: STOK BAHAN */}
      {activeTab === 'stok' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 no-print">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama bahan pangan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tipe:</span>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
              >
                <option value="Semua">Semua Jenis</option>
                <option value="Bahan Pangan">Bahan Pangan</option>
                <option value="Barang Operasional">Barang Operasional</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama Bahan / Barang</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-center">Stok Fisik Saat Ini</th>
                  <th className="py-3 px-3 text-center">Batas Minimum</th>
                  <th className="py-3 px-3 text-right">Harga Acuan</th>
                  <th className="py-3 px-3 text-center">Status Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map((ing) => {
                  const isLowStock = ing.currentStock <= ing.minimumStock;
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {ing.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{ing.itemType}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                          {ing.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-900 text-sm">
                        {ing.currentStock} {ing.unit}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-500">
                        {ing.minimumStock} {ing.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatIDR(ing.referencePrice)} / {ing.unit}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT MUTASI STOK */}
      {activeTab === 'mutasi' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waktu Transaksi</th>
                <th className="py-3 px-3">Nama Bahan</th>
                <th className="py-3 px-3 text-center">Tipe Mutasi</th>
                <th className="py-3 px-3 text-center">Kuantitas</th>
                <th className="py-3 px-3 text-center">Stok Awal ➔ Akhir</th>
                <th className="py-3 px-3">Referensi / Keterangan</th>
                <th className="py-3 px-3">Pencatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-500 font-medium">
                    {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{tx.ingredientName}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tx.type === 'Masuk' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-slate-900">
                    {tx.quantity} {tx.unit}
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-slate-600">
                    {tx.previousStock} ➔ <strong className="text-sky-800">{tx.finalStock}</strong>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <span className="font-semibold block">{tx.reference}</span>
                    <span className="text-[10px] text-slate-400">{tx.note}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{tx.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: STOCK OPNAME */}
      {activeTab === 'opname' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Berita Acara Stock Opname Fisik Gudang</h3>
              <span className="text-xs text-slate-500">Perbandingan Stok Sistem vs Fisik Nyata</span>
            </div>
            <ExportButton data={opnames} fileName="Stock_Opname_Fisik" />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Opname</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nama Bahan</th>
                  <th className="py-2.5 px-3 text-center">Stok Sistem</th>
                  <th className="py-2.5 px-3 text-center">Stok Fisik Nyata</th>
                  <th className="py-2.5 px-3 text-center">Selisih</th>
                  <th className="py-2.5 px-3">Keterangan / Alasan Selisih</th>
                  <th className="py-2.5 px-3">Pemeriksa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opnames.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-sky-800">{o.opnameNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{o.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{o.ingredientName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{o.systemStock} {o.unit}</td>
                    <td className="py-2.5 px-3 text-center font-black text-sky-900">{o.physicalStock} {o.unit}</td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {o.discrepancy === 0 ? (
                        <span className="text-emerald-700">Cocok (0)</span>
                      ) : (
                        <span className="text-rose-700 font-extrabold">{o.discrepancy > 0 ? `+${o.discrepancy}` : o.discrepancy} {o.unit}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{o.reason || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{o.officerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pengeluaran Dapur */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Catat Pengeluaran Bahan ke Dapur"
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Bahan Pangan *</label>
            <select
              required
              value={movementData.ingredientId}
              onChange={e => setMovementData({ ...movementData, ingredientId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
            >
              {ingredients.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Tersedia: {i.currentStock} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Pemakaian *</label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={movementData.quantity}
                onChange={e => setMovementData({ ...movementData, quantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-amber-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Referensi Menu / Masakan</label>
              <input
                type="text"
                required
                value={movementData.reference}
                onChange={e => setMovementData({ ...movementData, reference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Contoh: Menu Ayam Suwir Siang"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan</label>
            <input
              type="text"
              value={movementData.note}
              onChange={e => setMovementData({ ...movementData, note: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Catatan pengambilan bahan"
            />
          </div>

          <WatermarkedPhotoUploader
            photoUrl={movementData.proofUrl || ''}
            onChange={url => setMovementData({ ...movementData, proofUrl: url })}
            label="Upload Foto Bukti Bon / Nota Pengeluaran Bahan (BPB)"
            watermarkTag="Mutasi Pengeluaran Bahan Gudang"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Kurangi dari Stok
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Stock Opname */}
      <Modal
        isOpen={isOpnameModalOpen}
        onClose={() => setIsOpnameModalOpen(false)}
        title="Input Pemeriksaan Stock Opname Fisik"
      >
        <form onSubmit={handleSaveOpname} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Bahan Pangan *</label>
            <select
              required
              value={opnameData.ingredientId || ''}
              onChange={e => setOpnameData({ ...opnameData, ingredientId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
            >
              {ingredients.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Stok Sistem: {i.currentStock} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Hasil Timbangan Fisik Nyata *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={opnameData.physicalStock ?? 0}
                onChange={e => setOpnameData({ ...opnameData, physicalStock: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-black text-sky-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pemeriksaan</label>
              <input
                type="date"
                required
                value={opnameData.date || ''}
                onChange={e => setOpnameData({ ...opnameData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Alasan Penyesuaian / Keterangan</label>
            <textarea
              rows={2}
              required
              value={opnameData.reason || ''}
              onChange={e => setOpnameData({ ...opnameData, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Contoh: Penyusutan alami kadar air pada bawang dan sayuran"
            />
          </div>

          <WatermarkedPhotoUploader
            photoUrl={opnameData.photoUrl || ''}
            onChange={url => setOpnameData({ ...opnameData, photoUrl: url })}
            label="Upload Foto Hasil Timbangan Fisik / Kondisi Gudang"
            watermarkTag="Stock Opname Fisik Gudang"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpnameModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Opname
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
