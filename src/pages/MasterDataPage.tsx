import { useState, useEffect } from 'react';
import { 
  Database, 
  Boxes, 
  Users, 
  Truck, 
  UtensilsCrossed, 
  Plus, 
  Search, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { getFoodIngredients, saveFoodIngredient, deleteFoodIngredient } from '../services/foodIngredientService';
import { getSuppliers, saveSupplier, deleteSupplier } from '../services/supplierService';
import { useAuth } from '../context/AuthContext';
import { logAuditEvent } from '../services/auditService';
import { FoodIngredient, Supplier } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';

interface MasterDataPageProps {
  initialSubmodule?: string;
  onNavigateSubmodule?: (module: string, submodule: string) => void;
}

export default function MasterDataPage({ initialSubmodule = 'bahan', onNavigateSubmodule }: MasterDataPageProps) {
  const { userProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'bahan' | 'supplier' | 'operasional'>('bahan');

  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Partial<FoodIngredient>>({});

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({});

  const canEdit = hasPermission('inventory', 'canCreate');
  const canDelete = hasPermission('inventory', 'canDelete');

  useEffect(() => {
    if (initialSubmodule === 'supplier') setActiveTab('supplier');
    else if (initialSubmodule === 'operasional') setActiveTab('operasional');
    else if (initialSubmodule === 'penerima' && onNavigateSubmodule) onNavigateSubmodule('beneficiary', 'kelompok');
    else if (initialSubmodule === 'menu' && onNavigateSubmodule) onNavigateSubmodule('plog', 'menu-item');
    else if (initialSubmodule === 'pengguna' && onNavigateSubmodule) onNavigateSubmodule('settings', 'pengguna');
    else setActiveTab('bahan');
  }, [initialSubmodule]);

  const loadData = async () => {
    try {
      const [iList, sList] = await Promise.all([
        getFoodIngredients(),
        getSuppliers()
      ]);
      setIngredients(iList || []);
      setSuppliers(sList || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient.name) return alert('Nama bahan wajib diisi.');
    const saved = await saveFoodIngredient(editingIngredient);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Data Master',
      editingIngredient.id ? 'UPDATE' : 'CREATE',
      `Menyimpan Master Bahan: ${saved.name}`
    );
    setIsIngredientModalOpen(false);
    loadData();
  };

  const handleDeleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Hapus bahan master ${name}?`)) return;
    await deleteFoodIngredient(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Data Master', 'DELETE', `Menghapus master bahan ${name}`, id);
    loadData();
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier.name) return alert('Nama supplier wajib diisi.');
    const saved = await saveSupplier(editingSupplier);
    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Data Master',
      editingSupplier.id ? 'UPDATE' : 'CREATE',
      `Menyimpan Master Supplier: ${saved.name}`
    );
    setIsSupplierModalOpen(false);
    loadData();
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Hapus supplier ${name}?`)) return;
    await deleteSupplier(id);
    await logAuditEvent(userProfile?.displayName || '', userProfile?.email || '', 'Data Master', 'DELETE', `Menghapus supplier ${name}`, id);
    loadData();
  };

  const foodIngredients = ingredients.filter(i => i.itemType === 'Bahan Pangan');
  const operationalItems = ingredients.filter(i => i.itemType === 'Barang Operasional');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('bahan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bahan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Master Bahan Pangan ({foodIngredients.length})
          </button>
          <button
            onClick={() => setActiveTab('operasional')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'operasional' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Barang Operasional & Ompreng ({operationalItems.length})
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'supplier' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Master Supplier ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && activeTab !== 'supplier' && (
            <button
              onClick={() => {
                setEditingIngredient({
                  name: '',
                  category: activeTab === 'bahan' ? 'Karbohidrat' : 'Barang Operasional',
                  unit: activeTab === 'bahan' ? 'kg' : 'pcs',
                  referencePrice: 15000,
                  energyKcal: 0,
                  proteinG: 0,
                  fatG: 0,
                  carbG: 0,
                  fiberG: 0,
                  currentStock: 50,
                  minimumStock: 10,
                  itemType: activeTab === 'bahan' ? 'Bahan Pangan' : 'Barang Operasional',
                  status: 'aktif'
                });
                setIsIngredientModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah {activeTab === 'bahan' ? 'Bahan Pangan' : 'Barang'}</span>
            </button>
          )}

          {canEdit && activeTab === 'supplier' && (
            <button
              onClick={() => {
                setEditingSupplier({
                  name: '',
                  contactPerson: '',
                  phone: '',
                  address: '',
                  category: 'Bahan Segar',
                  status: 'aktif'
                });
                setIsSupplierModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Supplier</span>
            </button>
          )}

          <ExportButton
            data={activeTab === 'supplier' ? suppliers : (activeTab === 'bahan' ? foodIngredients : operationalItems)}
            fileName={`Master_${activeTab}`}
          />
        </div>
      </div>

      {/* MASTER BAHAN PANGAN */}
      {activeTab === 'bahan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Bahan Pangan</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3 text-right">Harga Acuan</th>
                <th className="py-3 px-3 text-center">Gizi / 100g (Kalori, Protein, Serat)</th>
                <th className="py-3 px-3 text-center">Stok Saat Ini</th>
                <th className="py-3 px-4 text-center no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {foodIngredients.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{i.name}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-semibold border border-sky-200">
                      {i.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">
                    {formatIDR(i.referencePrice)} / {i.unit}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    <span className="font-bold text-sky-800">{i.energyKcal} kkal</span> • P: <span className="text-emerald-700 font-bold">{i.proteinG}g</span> • S: <span className="text-purple-700 font-bold">{i.fiberG}g</span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-slate-900">
                    {i.currentStock} {i.unit}
                  </td>
                  <td className="py-3 px-4 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingIngredient(i);
                            setIsIngredientModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-sky-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteIngredient(i.id, i.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MASTER BARANG OPERASIONAL */}
      {activeTab === 'operasional' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Barang Operasional</th>
                <th className="py-3 px-3">Satuan</th>
                <th className="py-3 px-3 text-right">Harga Acuan</th>
                <th className="py-3 px-3 text-center">Stok Fisik Tersedia</th>
                <th className="py-3 px-4 text-center no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operationalItems.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{i.name}</td>
                  <td className="py-3 px-3 text-slate-600 font-semibold">{i.unit}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-900">{formatIDR(i.referencePrice)}</td>
                  <td className="py-3 px-3 text-center font-black text-sky-900 text-sm">{i.currentStock} {i.unit}</td>
                  <td className="py-3 px-4 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingIngredient(i);
                            setIsIngredientModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-sky-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteIngredient(i.id, i.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MASTER SUPPLIER */}
      {activeTab === 'supplier' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Supplier</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Kontak & Telepon</th>
                <th className="py-3 px-3">Alamat</th>
                <th className="py-3 px-3">Rekening Bank</th>
                <th className="py-3 px-4 text-center no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{s.contactPerson}</div>
                    <div className="text-[11px] text-slate-500">{s.phone}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{s.address}</td>
                  <td className="py-3 px-3 text-slate-600">{s.bankName}: {s.accountNumber}</td>
                  <td className="py-3 px-4 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setIsSupplierModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-sky-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteSupplier(s.id, s.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Input Bahan */}
      <Modal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        title={editingIngredient.id ? 'Edit Master Bahan' : 'Tambah Master Bahan Pangan Baru'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveIngredient} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Bahan / Barang *</label>
              <input
                type="text"
                required
                value={editingIngredient.name || ''}
                onChange={e => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
              <select
                value={editingIngredient.category || 'Karbohidrat'}
                onChange={e => setEditingIngredient({ ...editingIngredient, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="Karbohidrat">Karbohidrat (Beras, dll)</option>
                <option value="Protein Hewani">Protein Hewani (Ayam, Telur, Ikan)</option>
                <option value="Protein Nabati">Protein Nabati (Tahu, Tempe)</option>
                <option value="Sayuran">Sayuran Segar</option>
                <option value="Buah">Buah-buahan</option>
                <option value="Bumbu & Minyak">Bumbu & Minyak Masak</option>
                <option value="Barang Operasional">Barang Operasional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Satuan</label>
              <select
                value={editingIngredient.unit || 'kg'}
                onChange={e => setEditingIngredient({ ...editingIngredient, unit: e.target.value as any })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
              >
                <option value="kg">kg (Kilogram)</option>
                <option value="gram">gram</option>
                <option value="liter">liter</option>
                <option value="pcs">pcs</option>
                <option value="butir">butir</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Harga Acuan (Rp)</label>
              <input
                type="number"
                min="0"
                value={editingIngredient.referencePrice ?? 0}
                onChange={e => setEditingIngredient({ ...editingIngredient, referencePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Stok Awal</label>
              <input
                type="number"
                min="0"
                value={editingIngredient.currentStock ?? 0}
                onChange={e => setEditingIngredient({ ...editingIngredient, currentStock: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          {editingIngredient.itemType === 'Bahan Pangan' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase block">Kandungan Gizi per 100 gram (DKBM Kemenkes):</span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-slate-500 block text-[10px]">Energi (kkal)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.energyKcal ?? 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, energyKcal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[10px]">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.proteinG ?? 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, proteinG: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[10px]">Lemak (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.fatG ?? 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, fatG: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[10px]">Karbo (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.carbG ?? 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, carbG: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[10px]">Serat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.fiberG ?? 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, fiberG: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <WatermarkedPhotoUploader
            photoUrl={editingIngredient.imageUrl || ''}
            onChange={url => setEditingIngredient({ ...editingIngredient, imageUrl: url })}
            label="Upload Foto Sampel Bahan Pangan / Barang Operasional"
            watermarkTag="Master Bahan SPPG"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsIngredientModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Master Bahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Input Supplier */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplier.id ? 'Edit Supplier' : 'Tambah Supplier Rekanan'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Perusahaan / Supplier *</label>
            <input
              type="text"
              required
              value={editingSupplier.name || ''}
              onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kontak Person (PIC)</label>
              <input
                type="text"
                required
                value={editingSupplier.contactPerson || ''}
                onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">No. HP / WhatsApp</label>
              <input
                type="text"
                required
                value={editingSupplier.phone || ''}
                onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Alamat Supplier</label>
            <textarea
              rows={2}
              value={editingSupplier.address || ''}
              onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Bank</label>
              <input
                type="text"
                value={editingSupplier.bankName || ''}
                onChange={e => setEditingSupplier({ ...editingSupplier, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">No. Rekening</label>
              <input
                type="text"
                value={editingSupplier.accountNumber || ''}
                onChange={e => setEditingSupplier({ ...editingSupplier, accountNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
            >
              Simpan Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
