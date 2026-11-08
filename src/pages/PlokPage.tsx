import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ShoppingCart, 
  ClipboardCheck, 
  Users, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  DollarSign, 
  Printer, 
  Calendar,
  Building2,
  Trash2,
  Edit3
} from 'lucide-react';
import { getRabs, saveRab, reviseRab } from '../services/rabService';
import { getPurchaseOrders, savePurchaseOrder } from '../services/poService';
import { getReceivingChecklists, saveReceivingChecklist, confirmReceivingAndCreditStock } from '../services/receivingChecklistService';
import { getSuppliers } from '../services/supplierService';
import { getVolunteerAttendances, saveVolunteerAttendance, getInstitutionIncentives, saveInstitutionIncentive } from '../services/incentiveService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { Rab, RabItem, PurchaseOrder, PoItem, ReceivingChecklist, ChecklistItem, Supplier, VolunteerAttendance, InstitutionIncentive } from '../types';
import Modal from '../components/common/Modal';
import PhotoUploader from '../components/common/PhotoUploader';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';
import { Image as ImageIcon } from 'lucide-react';

interface PlokPageProps {
  initialSubmodule?: string;
}

export default function PlokPage({ initialSubmodule = 'rab' }: PlokPageProps) {
  const { userProfile, activeRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'rab' | 'po' | 'checklist' | 'insentif' | 'insentif-lembaga'>('rab');
  
  const [rabs, setRabs] = useState<Rab[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [checklists, setChecklists] = useState<ReceivingChecklist[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerAttendance[]>([]);
  const [incentives, setIncentives] = useState<InstitutionIncentive[]>([]);

  const [selectedRab, setSelectedRab] = useState<Rab | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  // Modals
  const [isRabModalOpen, setIsRabModalOpen] = useState(false);
  const [editingRab, setEditingRab] = useState<Partial<Rab>>({});
  const [newRabItem, setNewRabItem] = useState<Partial<RabItem>>({
    category: 'Bahan Pangan',
    name: '',
    quantity: 1,
    unit: 'kg',
    unitPrice: 15000
  });
  
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<Partial<PurchaseOrder>>({});
  const [newPoItem, setNewPoItem] = useState<Partial<PoItem>>({
    category: 'Bahan Pangan',
    name: '',
    orderQuantity: 10,
    unit: 'kg',
    unitPrice: 15000
  });

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Partial<ReceivingChecklist>>({});

  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Partial<VolunteerAttendance>>({});

  const [isIncentiveModalOpen, setIsIncentiveModalOpen] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<Partial<InstitutionIncentive>>({});

  const canApprove = activeRole === 'Kepala SPPG' || activeRole === 'Admin Utama';
  const canEdit = hasPermission('plok', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'po') setActiveTab('po');
    else if (initialSubmodule === 'checklist') setActiveTab('checklist');
    else if (initialSubmodule === 'insentif') setActiveTab('insentif');
    else if (initialSubmodule === 'insentif-lembaga') setActiveTab('insentif-lembaga');
    else setActiveTab('rab');
  }, [initialSubmodule]);

  const loadAll = async () => {
    try {
      const [rData, pData, cData, sData, vData, iData] = await Promise.all([
        getRabs(),
        getPurchaseOrders(),
        getReceivingChecklists(),
        getSuppliers(),
        getVolunteerAttendances(),
        getInstitutionIncentives()
      ]);
      setRabs(rData || []);
      setPos(pData || []);
      setChecklists(cData || []);
      setSuppliers(sData || []);
      setVolunteers(vData || []);
      setIncentives(iData || []);

      if (rData && rData.length > 0 && !selectedRab) setSelectedRab(rData[0]);
      if (pData && pData.length > 0 && !selectedPo) setSelectedPo(pData[0]);
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

  // RAB Handlers
  const handleApproveRab = async (rab: Rab) => {
    if (!canApprove) return alert('Hanya Kepala SPPG atau Admin Utama yang dapat menyetujui RAB.');
    const updated = await saveRab({
      ...rab,
      status: 'Disetujui',
      approvedBy: userProfile?.displayName || 'Kepala SPPG',
      approvalDate: new Date().toISOString().split('T')[0],
      approvalNote: 'RAB Disetujui secara resmi untuk pagu operasional MBG.'
    });
    await logAuditEvent(
      userProfile?.displayName || 'Kepala SPPG',
      userProfile?.email || '',
      'Tugas PLOK',
      'APPROVE',
      `Menyetujui RAB ${rab.rabNumber} sejumlah ${formatIDR(rab.totalBudget)}`,
      rab.id
    );
    setSelectedRab(updated);
    loadAll();
  };

  // Create PO from RAB
  const handleCreatePoFromRab = async (rab: Rab) => {
    if (rab.status !== 'Disetujui') {
      alert('PO hanya dapat dibuat dari RAB yang telah berstatus Disetujui.');
      return;
    }
    const sup = suppliers[0];
    const poItems: PoItem[] = rab.items.filter(i => i.category === 'Bahan Pangan').map(i => ({
      id: `po-item-${Math.random()}`,
      name: i.name,
      category: i.category,
      orderQuantity: Math.round(i.quantity / 6), // 1 day allocation
      unit: i.unit,
      unitPrice: i.unitPrice,
      totalPrice: Math.round((i.quantity / 6) * i.unitPrice)
    }));

    const newPo = await savePurchaseOrder({
      rabId: rab.id,
      supplierId: sup?.id || 'sup-1',
      supplierName: sup?.name || 'CV Mitra MBG',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      menuDate: new Date().toISOString().split('T')[0],
      menuName: 'Penyediaan Bahan Harian Sesuai RAB',
      status: 'Disetujui',
      items: poItems,
      approvedBy: userProfile?.displayName || 'Kepala SPPG'
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas PLOK',
      'CREATE',
      `Membuat Purchase Order ${newPo.poNumber} dari RAB ${rab.rabNumber}`,
      newPo.id
    );

    alert(`PO Berhasil dibuat: ${newPo.poNumber}`);
    await loadAll();
    setActiveTab('po');
    setSelectedPo(newPo);
  };

  // Checklist Handlers
  const handleConfirmStock = async (chk: ReceivingChecklist) => {
    if (chk.isInventoryUpdated) {
      alert('Penerimaan ini telah sebelumnya masuk gudang.');
      return;
    }
    const res = await confirmReceivingAndCreditStock(chk, userProfile?.displayName || 'Petugas Gudang');
    await logAuditEvent(
      userProfile?.displayName || 'Petugas',
      userProfile?.email || '',
      'Inventory',
      'STOCK_MUTATION',
      `Konfirmasi penerimaan PO ${chk.poNumber} masuk gudang. Stok diperbarui secara otomatis.`,
      chk.id
    );
    alert(res.message);
    loadAll();
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('rab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rab' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. RAB SPPG ({rabs.length})
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'po' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Purchase Order ({pos.length})
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'checklist' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Checklist Penerimaan ({checklists.length})
          </button>
          <button
            onClick={() => setActiveTab('insentif')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'insentif' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Absensi Relawan ({volunteers.length})
          </button>
          <button
            onClick={() => setActiveTab('insentif-lembaga')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'insentif-lembaga' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5. Insentif Lembaga ({incentives.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rab' && canEdit && (
            <button
              onClick={() => {
                setEditingRab({
                  period: 'Periode Baru',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  totalPortions: 4860,
                  status: 'Draft',
                  items: []
                });
                setIsRabModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat RAB Baru</span>
            </button>
          )}

          {activeTab === 'po' && canEdit && (
            <button
              onClick={() => {
                const defaultSupplier = suppliers[0];
                setEditingPo({
                  poNumber: `PO-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
                  supplierId: defaultSupplier?.id || '',
                  supplierName: defaultSupplier?.name || 'CV Mitra MBG',
                  orderDate: new Date().toISOString().split('T')[0],
                  deliveryDate: new Date().toISOString().split('T')[0],
                  menuDate: new Date().toISOString().split('T')[0],
                  menuName: 'Penyediaan Bahan Harian Dapur MBG',
                  status: 'Disetujui',
                  isPaid: 'Belum Dibayar',
                  items: [
                    { id: `po-item-${Date.now()}-1`, name: 'Beras Organik Ramos', category: 'Bahan Pangan', orderQuantity: 100, unit: 'kg', unitPrice: 15500, totalPrice: 1550000 },
                    { id: `po-item-${Date.now()}-2`, name: 'Daging Ayam Broiler Segar', category: 'Bahan Pangan', orderQuantity: 50, unit: 'kg', unitPrice: 38000, totalPrice: 1900000 }
                  ],
                  totalAmount: 3450000,
                  poAttachmentUrl: ''
                });
                setIsPoModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat PO Baru</span>
            </button>
          )}

          {activeTab === 'checklist' && canEdit && (
            <button
              onClick={() => {
                const targetPo = pos[0];
                setEditingChecklist({
                  poId: targetPo?.id || '',
                  poNumber: targetPo?.poNumber || '',
                  supplierName: targetPo?.supplierName || '',
                  receivingDate: new Date().toISOString().split('T')[0],
                  inspectorName: userProfile?.displayName || 'Petugas Gudang',
                  status: 'Diperiksa',
                  isInventoryUpdated: false,
                  items: targetPo?.items.map(i => ({
                    poItemId: i.id,
                    name: i.name,
                    orderQuantity: i.orderQuantity,
                    receivedQuantity: i.orderQuantity,
                    difference: 0,
                    unit: i.unit,
                    safetyStatus: 'Aman',
                    notes: 'Kondisi fisik segar & bersih'
                  })) || [],
                  photoUrls: []
                });
                setIsChecklistModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Checklist Baru</span>
            </button>
          )}

          {activeTab === 'insentif-lembaga' && canEdit && (
            <button
              onClick={() => {
                setEditingIncentive({
                  institutionId: 'inst-1',
                  institutionName: 'SDN Temenggungan 1',
                  period: `Maret ${new Date().getFullYear()}`,
                  totalBeneficiaries: 230,
                  ratePerPerson: 1000,
                  totalIncentive: 230000,
                  paymentStatus: 'Dibayar',
                  paidDate: new Date().toISOString().split('T')[0],
                  paymentProofUrl: ''
                });
                setIsIncentiveModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Bayar Insentif Lembaga</span>
            </button>
          )}

          <ExportButton
            data={activeTab === 'rab' ? rabs : (activeTab === 'po' ? pos : checklists)}
            fileName={`PLOK_${activeTab.toUpperCase()}`}
          />
        </div>
      </div>

      {/* TAB 1: RENCANA ANGGARAN BIAYA (RAB) */}
      {activeTab === 'rab' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
            {rabs.map((r) => {
              const isSelected = selectedRab?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRab(r)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs hover:border-sky-300 ${
                    isSelected ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      v{r.version}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 truncate">{r.rabNumber}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.period}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Pagu:</span>
                    <strong className="text-sky-800 text-sm">{formatIDR(r.totalBudget)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedRab ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
              <KopSurat
                documentTitle="RENCANA ANGGARAN BIAYA (RAB) SPPG"
                documentNumber={selectedRab.rabNumber}
                date={`${selectedRab.startDate} s/d ${selectedRab.endDate}`}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Periode Anggaran:</span>
                  <strong className="text-slate-900 text-sm">{selectedRab.period}</strong>
                  <span className="text-slate-500 block mt-1">Total Sasaran: <strong>{selectedRab.totalPortions} Porsi</strong></span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-slate-500 block">Total Pagu RAB:</span>
                  <strong className="text-emerald-700 text-lg font-black">{formatIDR(selectedRab.totalBudget)}</strong>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Bahan: {formatIDR(selectedRab.foodCostBudget)} | Ops: {formatIDR(selectedRab.operationalBudget)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2 border-r border-slate-300">No</th>
                      <th className="p-2 border-r border-slate-300">Kategori</th>
                      <th className="p-2 border-r border-slate-300">Uraian Bahan / Kebutuhan</th>
                      <th className="p-2 border-r border-slate-300 text-center">Volume</th>
                      <th className="p-2 border-r border-slate-300 text-right">Harga Satuan</th>
                      <th className="p-2 text-right">Total Anggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {selectedRab.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-semibold">
                            {it.category}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          {it.name}
                          {it.spec && <span className="block text-[10px] text-slate-400 font-normal">{it.spec}</span>}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right">{formatIDR(it.unitPrice)}</td>
                        <td className="p-2 text-right font-extrabold text-emerald-800">{formatIDR(it.totalPrice)}</td>
                      </tr>
                    ))}
                    <tr className="bg-sky-50 font-black text-sky-950 border-t-2 border-sky-300">
                      <td colSpan={5} className="p-2.5 border-r border-sky-200 text-center">TOTAL ANGGARAN RAB MBG</td>
                      <td className="p-2.5 text-right text-emerald-900 text-sm">{formatIDR(selectedRab.totalBudget)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Buttons in Preview */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 no-print">
                <div className="flex items-center gap-2">
                  {selectedRab.status !== 'Disetujui' && canApprove && (
                    <button
                      onClick={() => handleApproveRab(selectedRab)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      ✓ Setujui RAB (Kepala SPPG)
                    </button>
                  )}
                  {selectedRab.status === 'Disetujui' && (
                    <button
                      onClick={() => handleCreatePoFromRab(selectedRab)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      + Terbitkan Purchase Order (PO) Harian
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Status: <strong className="text-slate-800">{selectedRab.status}</strong> {selectedRab.approvedBy && `(Oleh: ${selectedRab.approvedBy})`}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
                <div>
                  <p>Disetujui Oleh,</p>
                  <p className="font-bold text-slate-900">Kepala SPPG Probolinggo Krejengan 2</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">H. AHMAD ZAINI, S.Pd.I</p>
                  <p className="text-[10px] text-slate-500">NIP. 19780512 200501 1 004</p>
                </div>
                <div>
                  <p>Direncanakan Oleh,</p>
                  <p className="font-bold text-slate-900">Pengawas Keuangan & Pengadaan (PLOK)</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">SITI MUNAWWAROH, S.E</p>
                  <p className="text-[10px] text-slate-500">Bendahara Unit Pelayanan</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: PURCHASE ORDER (PO) HARIAN */}
      {activeTab === 'po' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
            {pos.map((p) => {
              const isSelected = selectedPo?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPo(p)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs ${
                    isSelected ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-sky-800">{p.poNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {p.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{p.supplierName}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tgl Kirim: {p.deliveryDate} • Menu: {p.menuName}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                      p.isPaid === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.isPaid}
                    </span>
                    <strong className="text-emerald-700 font-black">{formatIDR(p.totalAmount)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPo ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs print-container">
              <KopSurat
                documentTitle="SURAT PESANAN / PURCHASE ORDER (PO) HARIAN"
                documentNumber={selectedPo.poNumber}
                date={selectedPo.orderDate}
              />

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block">Supplier / Rekanan:</span>
                  <strong className="text-slate-900 text-sm">{selectedPo.supplierName}</strong>
                  <span className="text-slate-500 block mt-1">Tanggal Pengiriman: <strong>{selectedPo.deliveryDate} (05:00 WIB)</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Total Nilai Pemesanan:</span>
                  <strong className="text-emerald-700 text-base font-black">{formatIDR(selectedPo.totalAmount)}</strong>
                  <span className="text-slate-500 block mt-1">Status Pembayaran: <strong>{selectedPo.isPaid}</strong></span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300">No</th>
                      <th className="p-2.5 border-r border-slate-300">Nama Bahan / Barang</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Jumlah Pesanan</th>
                      <th className="p-2.5 border-r border-slate-300 text-right">Harga Satuan</th>
                      <th className="p-2.5 text-right">Total Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPo.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{it.name}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">
                          {it.orderQuantity} {it.unit}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right">{formatIDR(it.unitPrice)}</td>
                        <td className="p-2 text-right font-extrabold text-emerald-700">{formatIDR(it.totalPrice)}</td>
                      </tr>
                    ))}
                    <tr className="bg-sky-50 font-black text-sky-950 border-t-2 border-sky-300">
                      <td colSpan={4} className="p-2.5 border-r border-sky-200 text-center">TOTAL TAGIHAN PO</td>
                      <td className="p-2.5 text-right text-emerald-900 text-sm">{formatIDR(selectedPo.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-12 pt-4 text-center text-xs">
                <div>
                  <p>Petugas Logistik / Gudang,</p>
                  <p className="font-bold text-slate-900">SPPG Krejengan Temenggungan 2</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">BUDI SANTOSO</p>
                  <p className="text-[10px] text-slate-500">Admin Gudang</p>
                </div>
                <div>
                  <p>Supplier Penyedia,</p>
                  <p className="font-bold text-slate-900">{selectedPo.supplierName}</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">( Tanda Tangan & Cap )</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: CHECKLIST PENERIMAAN BAHAN */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {checklists.map((chk) => (
              <div key={chk.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 uppercase">PO Ref: {chk.poNumber}</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      Pemeriksaan Bahan Masuk: {chk.supplierName}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Tgl: {chk.receivingDate} • Pemeriksa: <strong>{chk.inspectorName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {chk.isInventoryUpdated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stok Masuk Gudang (Terkonfirmasi)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmStock(chk)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        ✓ Konfirmasi & Tambah ke Stok Gudang
                      </button>
                    )}
                  </div>
                </div>

                {/* Items inspection list */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nama Bahan</th>
                        <th className="py-2.5 px-3 text-center">Dipesan</th>
                        <th className="py-2.5 px-3 text-center">Diterima</th>
                        <th className="py-2.5 px-3 text-center">Selisih</th>
                        <th className="py-2.5 px-3 text-center">Status Keamanan</th>
                        <th className="py-2.5 px-3">Catatan Pemeriksaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chk.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{it.name}</td>
                          <td className="py-2.5 px-3 text-center">{it.orderQuantity} {it.unit}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-sky-800">{it.receivedQuantity} {it.unit}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {it.difference !== 0 ? `${it.difference} ${it.unit}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              it.safetyStatus === 'Aman' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {it.safetyStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{it.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Photos if any */}
                {chk.photoUrls && chk.photoUrls.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto">
                    {chk.photoUrls.map((p, i) => (
                      <img key={i} src={p} alt="Dokumentasi" className="w-16 h-12 object-cover rounded-md border border-slate-200" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ABSENSI & INSENTIF RELAWAN */}
      {activeTab === 'insentif' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-sm font-bold text-slate-900">Daftar Kehadiran & Pengganti Relawan SPPG</h3>
            <button
              onClick={() => {
                setEditingVolunteer({
                  date: new Date().toISOString().split('T')[0],
                  status: 'Hadir',
                  division: 'Persiapan',
                  incentiveAmount: 75000,
                  paymentStatus: 'Belum Dibayar'
                });
                setIsVolunteerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Absensi Relawan</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama Relawan</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Divisi</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Keterangan / Pengganti</th>
                  <th className="py-3 px-3 text-right">Insentif</th>
                  <th className="py-3 px-3 text-center">Status Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {volunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{v.volunteerName}</td>
                    <td className="py-3 px-3 text-slate-500">{v.date}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{v.division}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {v.substituteName ? (
                        <span className="text-emerald-700 font-semibold">
                          Pengganti: {v.substituteName} ({v.substituteDivision || v.division})
                        </span>
                      ) : (
                        v.absenceReason || '-'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatIDR(v.incentiveAmount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                        v.paymentStatus === 'Dibayar' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INSENTIF LEMBAGA */}
      {activeTab === 'insentif-lembaga' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Insentif Operasional Lembaga Penerima Manfaat</h3>
              <p className="text-xs text-slate-500">Tarif Insentif Pemeliharaan Sarana Makan Rp 1.000 / Siswa / Bulan</p>
            </div>
            <ExportButton data={incentives} fileName="Insentif_Lembaga_MBG" />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Lembaga</th>
                  <th className="py-2.5 px-3 text-center">Periode</th>
                  <th className="py-2.5 px-3 text-center">Jumlah Sasaran</th>
                  <th className="py-2.5 px-3 text-right">Tarif / Jiwa</th>
                  <th className="py-2.5 px-3 text-right">Total Insentif</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incentives.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{inc.institutionName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{inc.period}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-sky-800">{inc.totalBeneficiaries}</td>
                    <td className="py-2.5 px-3 text-right">{formatIDR(inc.ratePerPerson)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">{formatIDR(inc.totalIncentive)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {inc.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Input Absensi */}
      <Modal
        isOpen={isVolunteerModalOpen}
        onClose={() => setIsVolunteerModalOpen(false)}
        title="Catat Absensi & Pengganti Relawan"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingVolunteer.volunteerName) return alert('Nama relawan wajib diisi.');
            await saveVolunteerAttendance(editingVolunteer);
            setIsVolunteerModalOpen(false);
            loadAll();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Relawan *</label>
            <input
              type="text"
              required
              value={editingVolunteer.volunteerName || ''}
              onChange={e => setEditingVolunteer({ ...editingVolunteer, volunteerName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              placeholder="Contoh: Khoirul Anam"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={editingVolunteer.date || ''}
                onChange={e => setEditingVolunteer({ ...editingVolunteer, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Divisi Tugas</label>
              <select
                value={editingVolunteer.division || 'Persiapan'}
                onChange={e => setEditingVolunteer({ ...editingVolunteer, division: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="Persiapan">Divisi Persiapan</option>
                <option value="Pengolahan">Divisi Pengolahan</option>
                <option value="Pemorsian">Divisi Pemorsian</option>
                <option value="Distribusi">Divisi Distribusi</option>
                <option value="Cuci Ompreng">Divisi Cuci Ompreng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status Kehadiran</label>
              <select
                value={editingVolunteer.status || 'Hadir'}
                onChange={e => setEditingVolunteer({ ...editingVolunteer, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Tanpa Keterangan">Tanpa Keterangan</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Alasan Ketidakhadiran</label>
              <input
                type="text"
                value={editingVolunteer.absenceReason || ''}
                onChange={e => setEditingVolunteer({ ...editingVolunteer, absenceReason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Bila tidak hadir"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
            <span className="text-xs font-bold text-amber-900 block">Informasi Relawan Pengganti (Jika Ada):</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Relawan Pengganti</label>
                <input
                  type="text"
                  value={editingVolunteer.substituteName || ''}
                  onChange={e => setEditingVolunteer({ ...editingVolunteer, substituteName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  placeholder="Nama pengganti"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Divisi Asal Pengganti</label>
                <select
                  value={editingVolunteer.substituteDivision || 'Persiapan'}
                  onChange={e => setEditingVolunteer({ ...editingVolunteer, substituteDivision: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Persiapan">Persiapan</option>
                  <option value="Pengolahan">Pengolahan</option>
                  <option value="Pemorsian">Pemorsian</option>
                  <option value="Distribusi">Distribusi</option>
                  <option value="Cuci Ompreng">Cuci Ompreng</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVolunteerModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Absensi
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 1: BUAT RENCANA ANGGARAN BIAYA (RAB) */}
      <Modal
        isOpen={isRabModalOpen}
        onClose={() => setIsRabModalOpen(false)}
        title={editingRab.id ? 'Edit Rencana Anggaran Biaya (RAB)' : 'Buat Rencana Anggaran Biaya (RAB) Baru'}
        maxWidth="4xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingRab.period) return alert('Nama periode RAB wajib diisi.');
            const items = editingRab.items || [];
            if (items.length === 0) return alert('Tambahkan minimal 1 item anggaran.');
            
            const foodCostBudget = items.filter(i => i.category === 'Bahan Pangan').reduce((acc, i) => acc + (i.totalPrice || 0), 0);
            const operationalBudget = items.filter(i => i.category !== 'Bahan Pangan').reduce((acc, i) => acc + (i.totalPrice || 0), 0);
            const totalBudget = foodCostBudget + operationalBudget;

            const saved = await saveRab({
              ...editingRab,
              foodCostBudget,
              operationalBudget,
              totalBudget,
              status: editingRab.status || 'Draft'
            });

            await logAuditEvent(
              userProfile?.displayName || 'User',
              userProfile?.email || '',
              'Tugas PLOK',
              editingRab.id ? 'UPDATE' : 'CREATE',
              `Menyimpan RAB ${saved.rabNumber} periode ${saved.period} total ${formatIDR(totalBudget)}`,
              saved.id
            );

            alert(`RAB ${saved.rabNumber} berhasil disimpan ke database.`);
            setIsRabModalOpen(false);
            await loadAll();
            setSelectedRab(saved);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Periode Anggaran *</label>
              <input
                type="text"
                required
                value={editingRab.period || ''}
                onChange={e => setEditingRab({ ...editingRab, period: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Contoh: April 2026 - Minggu 1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Mulai *</label>
              <input
                type="date"
                required
                value={editingRab.startDate || ''}
                onChange={e => setEditingRab({ ...editingRab, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Selesai *</label>
              <input
                type="date"
                required
                value={editingRab.endDate || ''}
                onChange={e => setEditingRab({ ...editingRab, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Total Porsi Disajikan *</label>
              <input
                type="number"
                min="1"
                required
                value={editingRab.totalPortions ?? 4860}
                onChange={e => setEditingRab({ ...editingRab, totalPortions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-sky-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status Pengajuan</label>
              <select
                value={editingRab.status || 'Draft'}
                onChange={e => setEditingRab({ ...editingRab, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
              >
                <option value="Draft">Draft (Dalam Penyusunan)</option>
                <option value="Menunggu Persetujuan">Menunggu Persetujuan Kepala SPPG</option>
                {canApprove && <option value="Disetujui">Disetujui</option>}
              </select>
            </div>
          </div>

          {/* Builder Item Belanja */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Daftar Rincian Item Belanja Anggaran:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Kategori</label>
                <select
                  value={newRabItem.category || 'Bahan Pangan'}
                  onChange={e => setNewRabItem({ ...newRabItem, category: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="Bahan Pangan">Bahan Pangan</option>
                  <option value="Barang Operasional">Barang Operasional</option>
                  <option value="Biaya Operasional">Biaya Operasional</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-500 block text-[10px] mb-0.5">Nama Item Belanja</label>
                <input
                  type="text"
                  value={newRabItem.name || ''}
                  onChange={e => setNewRabItem({ ...newRabItem, name: e.target.value })}
                  placeholder="Contoh: Beras Ramos / Gas LPG 50kg"
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Volume & Satuan</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    value={newRabItem.quantity ?? 1}
                    onChange={e => setNewRabItem({ ...newRabItem, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-1.5 rounded border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    value={newRabItem.unit || 'kg'}
                    onChange={e => setNewRabItem({ ...newRabItem, unit: e.target.value })}
                    className="w-14 px-1.5 py-1.5 rounded border border-slate-300 bg-white"
                    placeholder="kg"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Harga Satuan (Rp)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={newRabItem.unitPrice ?? 0}
                    onChange={e => setNewRabItem({ ...newRabItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newRabItem.name) return alert('Isi nama item terlebih dahulu.');
                      const qty = Number(newRabItem.quantity) || 1;
                      const price = Number(newRabItem.unitPrice) || 0;
                      const itemToAdd: RabItem = {
                        id: `rab-item-${Date.now()}-${Math.random()}`,
                        category: (newRabItem.category as any) || 'Bahan Pangan',
                        name: newRabItem.name,
                        quantity: qty,
                        unit: newRabItem.unit || 'kg',
                        unitPrice: price,
                        totalPrice: qty * price
                      };
                      setEditingRab({
                        ...editingRab,
                        items: [...(editingRab.items || []), itemToAdd]
                      });
                      setNewRabItem({
                        category: 'Bahan Pangan',
                        name: '',
                        quantity: 1,
                        unit: 'kg',
                        unitPrice: 15000
                      });
                    }}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Kategori</th>
                    <th className="p-2">Nama Item</th>
                    <th className="p-2 text-center">Volume</th>
                    <th className="p-2 text-right">Harga Satuan</th>
                    <th className="p-2 text-right">Total Anggaran</th>
                    <th className="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(editingRab.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                          {it.category}
                        </span>
                      </td>
                      <td className="p-2 font-medium text-slate-900">{it.name}</td>
                      <td className="p-2 text-center">{it.quantity} {it.unit}</td>
                      <td className="p-2 text-right">{formatIDR(it.unitPrice)}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">{formatIDR(it.totalPrice)}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRab({
                              ...editingRab,
                              items: (editingRab.items || []).filter((_, i) => i !== idx)
                            });
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(editingRab.items || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                        Belum ada item belanja. Gunakan form di atas untuk menambahkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-200">
              <span className="text-slate-600">Total Perhitungan Anggaran RAB:</span>
              <span className="text-sm text-emerald-800 font-black">
                {formatIDR((editingRab.items || []).reduce((acc, i) => acc + (i.totalPrice || 0), 0))}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRabModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan RAB ke Database
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: BUAT PURCHASE ORDER (PO) BARU */}
      <Modal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        title={editingPo.id ? 'Edit Purchase Order (PO)' : 'Buat Surat Pesanan / Purchase Order (PO) Baru'}
        maxWidth="4xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingPo.supplierName) return alert('Pilih supplier rekanan terlebih dahulu.');
            const items = editingPo.items || [];
            if (items.length === 0) return alert('Tambahkan minimal 1 item pesanan.');

            const totalAmount = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);

            const saved = await savePurchaseOrder({
              ...editingPo,
              totalAmount,
              approvedBy: userProfile?.displayName || 'Kepala SPPG'
            });

            await logAuditEvent(
              userProfile?.displayName || 'User',
              userProfile?.email || '',
              'Tugas PLOK',
              editingPo.id ? 'UPDATE' : 'CREATE',
              `Menyimpan PO ${saved.poNumber} kepada ${saved.supplierName} total ${formatIDR(totalAmount)}`,
              saved.id
            );

            alert(`PO ${saved.poNumber} berhasil disimpan ke database.`);
            setIsPoModalOpen(false);
            await loadAll();
            setSelectedPo(saved);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor PO *</label>
              <input
                type="text"
                required
                value={editingPo.poNumber || ''}
                onChange={e => setEditingPo({ ...editingPo, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier / Rekanan *</label>
              <select
                required
                value={editingPo.supplierId || ''}
                onChange={e => {
                  const sup = suppliers.find(s => s.id === e.target.value);
                  setEditingPo({
                    ...editingPo,
                    supplierId: e.target.value,
                    supplierName: sup?.name || ''
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status Pembayaran</label>
              <select
                value={editingPo.isPaid || 'Belum Dibayar'}
                onChange={e => setEditingPo({ ...editingPo, isPaid: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                <option value="Belum Dibayar">Belum Dibayar</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pesanan *</label>
              <input
                type="date"
                required
                value={editingPo.orderDate || ''}
                onChange={e => setEditingPo({ ...editingPo, orderDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pengiriman *</label>
              <input
                type="date"
                required
                value={editingPo.deliveryDate || ''}
                onChange={e => setEditingPo({ ...editingPo, deliveryDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama / Referensi Menu</label>
              <input
                type="text"
                value={editingPo.menuName || ''}
                onChange={e => setEditingPo({ ...editingPo, menuName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Penyediaan Bahan Harian"
              />
            </div>
          </div>

          {/* Builder Item PO */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Daftar Bahan / Barang Dipesan:</span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Kategori</label>
                <select
                  value={newPoItem.category || 'Bahan Pangan'}
                  onChange={e => setNewPoItem({ ...newPoItem, category: e.target.value as any })}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="Bahan Pangan">Bahan Pangan</option>
                  <option value="Barang Operasional">Barang Operasional</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-500 block text-[10px] mb-0.5">Nama Bahan</label>
                <input
                  type="text"
                  value={newPoItem.name || ''}
                  onChange={e => setNewPoItem({ ...newPoItem, name: e.target.value })}
                  placeholder="Contoh: Daging Sapi Segar"
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Jumlah & Satuan</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    value={newPoItem.orderQuantity ?? 1}
                    onChange={e => setNewPoItem({ ...newPoItem, orderQuantity: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-1.5 rounded border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    value={newPoItem.unit || 'kg'}
                    onChange={e => setNewPoItem({ ...newPoItem, unit: e.target.value })}
                    className="w-14 px-1.5 py-1.5 rounded border border-slate-300 bg-white"
                    placeholder="kg"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-500 block text-[10px] mb-0.5">Harga Satuan (Rp)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={newPoItem.unitPrice ?? 0}
                    onChange={e => setNewPoItem({ ...newPoItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPoItem.name) return alert('Isi nama bahan terlebih dahulu.');
                      const qty = Number(newPoItem.orderQuantity) || 1;
                      const price = Number(newPoItem.unitPrice) || 0;
                      const itemToAdd: PoItem = {
                        id: `po-item-${Date.now()}-${Math.random()}`,
                        category: newPoItem.category || 'Bahan Pangan',
                        name: newPoItem.name,
                        orderQuantity: qty,
                        unit: newPoItem.unit || 'kg',
                        unitPrice: price,
                        totalPrice: qty * price
                      };
                      setEditingPo({
                        ...editingPo,
                        items: [...(editingPo.items || []), itemToAdd]
                      });
                      setNewPoItem({
                        category: 'Bahan Pangan',
                        name: '',
                        orderQuantity: 10,
                        unit: 'kg',
                        unitPrice: 15000
                      });
                    }}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Table PO items */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Nama Bahan / Barang</th>
                    <th className="p-2 text-center">Jumlah Pesanan</th>
                    <th className="p-2 text-right">Harga Satuan</th>
                    <th className="p-2 text-right">Total Tagihan</th>
                    <th className="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(editingPo.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-medium text-slate-900">{it.name}</td>
                      <td className="p-2 text-center font-bold text-sky-800">{it.orderQuantity} {it.unit}</td>
                      <td className="p-2 text-right">{formatIDR(it.unitPrice)}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">{formatIDR(it.totalPrice)}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPo({
                              ...editingPo,
                              items: (editingPo.items || []).filter((_, i) => i !== idx)
                            });
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(editingPo.items || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                        Belum ada item dipesan. Gunakan baris input di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-200">
              <span className="text-slate-600">Total Nilai Pemesanan (PO):</span>
              <span className="text-sm text-emerald-800 font-black">
                {formatIDR((editingPo.items || []).reduce((acc, i) => acc + (i.totalPrice || 0), 0))}
              </span>
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={editingPo.poAttachmentUrl || ''}
            onChange={url => setEditingPo({ ...editingPo, poAttachmentUrl: url })}
            label="Upload Foto / Scan Surat Pesanan / Faktur PO Fisik"
            watermarkTag="Bukti Fisik Surat Pesanan (PO)"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPoModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Terbitkan Purchase Order (PO)
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: INPUT CHECKLIST PENERIMAAN BAHAN */}
      <Modal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        title="Input Checklist & Pemeriksaan Bahan Masuk"
        maxWidth="4xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingChecklist.poNumber) return alert('Pilih referensi PO terlebih dahulu.');

            const saved = await saveReceivingChecklist({
              ...editingChecklist,
              inspectorName: editingChecklist.inspectorName || userProfile?.displayName || 'Petugas Gudang'
            });

            await logAuditEvent(
              userProfile?.displayName || 'User',
              userProfile?.email || '',
              'Tugas PLOK',
              'CREATE',
              `Mencatat Checklist Penerimaan Bahan PO: ${saved.poNumber} dari ${saved.supplierName}`,
              saved.id
            );

            alert(`Checklist penerimaan ${saved.poNumber} berhasil disimpan.`);
            setIsChecklistModalOpen(false);
            loadAll();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Referensi PO *</label>
              <select
                required
                value={editingChecklist.poId || ''}
                onChange={e => {
                  const targetPo = pos.find(p => p.id === e.target.value);
                  if (targetPo) {
                    setEditingChecklist({
                      ...editingChecklist,
                      poId: targetPo.id,
                      poNumber: targetPo.poNumber,
                      supplierName: targetPo.supplierName,
                      items: targetPo.items.map(i => ({
                        poItemId: i.id,
                        name: i.name,
                        orderQuantity: i.orderQuantity,
                        receivedQuantity: i.orderQuantity,
                        difference: 0,
                        unit: i.unit,
                        safetyStatus: 'Aman',
                        notes: 'Segar & Bersih'
                      }))
                    });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
              >
                <option value="">Pilih Purchase Order</option>
                {pos.map(p => (
                  <option key={p.id} value={p.id}>{p.poNumber} - {p.supplierName} ({p.deliveryDate})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Penerimaan *</label>
              <input
                type="date"
                required
                value={editingChecklist.receivingDate || ''}
                onChange={e => setEditingChecklist({ ...editingChecklist, receivingDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Petugas Pemeriksa *</label>
              <input
                type="text"
                required
                value={editingChecklist.inspectorName || ''}
                onChange={e => setEditingChecklist({ ...editingChecklist, inspectorName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <span className="text-xs font-bold text-slate-800 p-3 bg-slate-50 block border-b border-slate-200">
              Pemeriksaan Fisik Kuantitas & Keamanan Pangan:
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-2.5">Nama Bahan</th>
                    <th className="p-2.5 text-center">Dipesan</th>
                    <th className="p-2.5 text-center">Diterima Fisik</th>
                    <th className="p-2.5 text-center">Status Keamanan</th>
                    <th className="p-2.5">Catatan Pemeriksaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(editingChecklist.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-900">{it.name}</td>
                      <td className="p-2.5 text-center text-slate-600">{it.orderQuantity} {it.unit}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="any"
                          value={it.receivedQuantity}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...(editingChecklist.items || [])];
                            updated[idx] = {
                              ...updated[idx],
                              receivedQuantity: val,
                              difference: val - it.orderQuantity
                            };
                            setEditingChecklist({ ...editingChecklist, items: updated });
                          }}
                          className="w-20 px-2 py-1 rounded border border-slate-300 font-bold text-sky-800 text-center"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <select
                          value={it.safetyStatus}
                          onChange={e => {
                            const updated = [...(editingChecklist.items || [])];
                            updated[idx] = { ...updated[idx], safetyStatus: e.target.value as any };
                            setEditingChecklist({ ...editingChecklist, items: updated });
                          }}
                          className="px-2 py-1 rounded border border-slate-300 text-xs"
                        >
                          <option value="Aman">Aman & Segar</option>
                          <option value="Perlu Tindak Lanjut">Perlu Sortasi</option>
                          <option value="Tidak Aman">Reject / Tolak</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={it.notes || ''}
                          onChange={e => {
                            const updated = [...(editingChecklist.items || [])];
                            updated[idx] = { ...updated[idx], notes: e.target.value };
                            setEditingChecklist({ ...editingChecklist, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                          placeholder="Catatan kondisi fisik"
                        />
                      </td>
                    </tr>
                  ))}
                  {(editingChecklist.items || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        Pilih PO di atas untuk memuat daftar bahan yang diperiksa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={(editingChecklist.photoUrls && editingChecklist.photoUrls[0]) || ''}
            onChange={url => setEditingChecklist({ ...editingChecklist, photoUrls: [url] })}
            label="Upload Foto Bukti Fisik Penerimaan Bahan (Loading Dock Gudang)"
            watermarkTag="Checklist Bahan Masuk Gudang"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsChecklistModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Hasil Checklist
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: CATAT / BAYAR INSENTIF LEMBAGA */}
      <Modal
        isOpen={isIncentiveModalOpen}
        onClose={() => setIsIncentiveModalOpen(false)}
        title="Catat & Bayar Insentif Lembaga Penerima Manfaat"
        maxWidth="2xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingIncentive.institutionName) return alert('Pilih nama lembaga penerima.');

            const totalBeneficiaries = Number(editingIncentive.totalBeneficiaries) || 0;
            const ratePerPerson = Number(editingIncentive.ratePerPerson) || 1000;
            const totalIncentive = totalBeneficiaries * ratePerPerson;

            const saved = await saveInstitutionIncentive({
              ...editingIncentive,
              totalIncentive
            });

            await logAuditEvent(
              userProfile?.displayName || 'User',
              userProfile?.email || '',
              'Tugas PLOK',
              'CREATE',
              `Mencatat pembayaran insentif lembaga ${saved.institutionName} periode ${saved.period} sejumlah ${formatIDR(totalIncentive)}`,
              saved.id
            );

            alert(`Insentif lembaga ${saved.institutionName} berhasil disimpan.`);
            setIsIncentiveModalOpen(false);
            loadAll();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Lembaga Penerima *</label>
              <input
                type="text"
                required
                value={editingIncentive.institutionName || ''}
                onChange={e => setEditingIncentive({ ...editingIncentive, institutionName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                placeholder="SDN Temenggungan 1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Periode Penyaluran *</label>
              <input
                type="text"
                required
                value={editingIncentive.period || ''}
                onChange={e => setEditingIncentive({ ...editingIncentive, period: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                placeholder="Maret 2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Sasaran Jiwa *</label>
              <input
                type="number"
                min="1"
                required
                value={editingIncentive.totalBeneficiaries ?? 230}
                onChange={e => {
                  const num = parseInt(e.target.value) || 0;
                  setEditingIncentive({
                    ...editingIncentive,
                    totalBeneficiaries: num,
                    totalIncentive: num * (editingIncentive.ratePerPerson || 1000)
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-sky-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tarif Insentif / Jiwa</label>
              <input
                type="number"
                value={editingIncentive.ratePerPerson ?? 1000}
                onChange={e => {
                  const rate = parseFloat(e.target.value) || 0;
                  setEditingIncentive({
                    ...editingIncentive,
                    ratePerPerson: rate,
                    totalIncentive: (editingIncentive.totalBeneficiaries || 0) * rate
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Total Insentif</label>
              <div className="w-full px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800">
                {formatIDR((editingIncentive.totalBeneficiaries || 0) * (editingIncentive.ratePerPerson || 1000))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Status Pembayaran</label>
              <select
                value={editingIncentive.paymentStatus || 'Dibayar'}
                onChange={e => setEditingIncentive({ ...editingIncentive, paymentStatus: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold"
              >
                <option value="Dibayar">Dibayar (Selesai Transfer)</option>
                <option value="Belum Dibayar">Belum Dibayar</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pembayaran</label>
              <input
                type="date"
                value={editingIncentive.paidDate || ''}
                onChange={e => setEditingIncentive({ ...editingIncentive, paidDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={editingIncentive.paymentProofUrl || ''}
            onChange={url => setEditingIncentive({ ...editingIncentive, paymentProofUrl: url })}
            label="Upload Bukti Transfer Bank / Tanda Terima Kuitansi Lembaga"
            watermarkTag="Insentif Sarana Lembaga MBG"
            institutionName="SPPG HAFSHAWATY 2"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsIncentiveModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Pembayaran Insentif
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
