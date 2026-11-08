import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Rab, RabItem } from '../types';

const COLLECTION_NAME = 'rabs';

export const INITIAL_RABS: Omit<Rab, 'id'>[] = [
  {
    rabNumber: 'RAB/SPPG-KRJ2/2026/03/001',
    period: 'Maret 2026 - Periode 01 (Minggu 2)',
    startDate: '2026-03-09',
    endDate: '2026-03-14',
    totalPortions: 4860, // 810 porsi x 6 hari
    foodCostBudget: 35611650,
    operationalBudget: 6500000,
    totalBudget: 42111650,
    status: 'Disetujui',
    approvedBy: 'H. Ahmad Zaini, S.Pd.I',
    approvalDate: '2026-03-05',
    approvalNote: 'Anggaran telah disesuaikan dengan pagu DPA Program MBG Yayasan Hafshawaty.',
    version: 1,
    items: [
      {
        id: 'rab-item-1',
        category: 'Bahan Pangan',
        name: 'Beras Ramos Super',
        spec: 'Kualitas Premium Bulog/Petani Lokal',
        quantity: 585,
        unit: 'kg',
        unitPrice: 14500,
        totalPrice: 8482500,
        notes: 'Kebutuhan 6 hari operasional'
      },
      {
        id: 'rab-item-2',
        category: 'Bahan Pangan',
        name: 'Daging Ayam Fillet Dada',
        spec: 'Segar & Bersertifikat Halal',
        quantity: 315,
        unit: 'kg',
        unitPrice: 38000,
        totalPrice: 11970000,
        notes: 'Suplai harian CV Barokah Protein'
      },
      {
        id: 'rab-item-3',
        category: 'Bahan Pangan',
        name: 'Tempe Kedelai Murni',
        spec: 'Higienis Non-GMO',
        quantity: 195,
        unit: 'kg',
        unitPrice: 14000,
        totalPrice: 2730000,
        notes: 'Produsen Tempe Lokal Temenggungan'
      },
      {
        id: 'rab-item-4',
        category: 'Bahan Pangan',
        name: 'Sayuran Campur (Bayam, Wortel, Buncis)',
        spec: 'Segar Petani Kraksaan/Krejengan',
        quantity: 365,
        unit: 'kg',
        unitPrice: 13500,
        totalPrice: 4927500,
        notes: 'Pengiriman subuh harian'
      },
      {
        id: 'rab-item-5',
        category: 'Bahan Pangan',
        name: 'Buah Segar (Pisang & Jeruk)',
        spec: 'Grade A Matang Alami',
        quantity: 420,
        unit: 'kg',
        unitPrice: 17800,
        totalPrice: 7476000,
        notes: 'Distribusi buah selang-seling'
      },
      {
        id: 'rab-item-6',
        category: 'Barang Operasional',
        name: 'Gas LPG 12 Kg (Refill) & 3 Kg',
        spec: 'Tabung resmi Pertamina',
        quantity: 24,
        unit: 'tabung',
        unitPrice: 185000,
        totalPrice: 4440000,
        notes: 'Kebutuhan dapur pengolahan'
      },
      {
        id: 'rab-item-7',
        category: 'Biaya Operasional',
        name: 'BBM Kendaraan Distribusi & Operasional',
        spec: 'Pertalite / Dexlite resmi SPBU',
        quantity: 1,
        unit: 'paket',
        unitPrice: 2060000,
        totalPrice: 2060000,
        notes: 'Armada mobil & motor box'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getRabs(): Promise<Rab[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: Rab[] = [];
      for (const r of INITIAL_RABS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newR: Rab = { id: docRef.id, ...r };
        await setDoc(docRef, newR);
        seeded.push(newR);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Rab, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveRab(rab: Partial<Rab>): Promise<Rab> {
  try {
    const id = rab.id || doc(collection(db, COLLECTION_NAME)).id;
    const items: RabItem[] = rab.items || [];
    let foodCostBudget = 0;
    let operationalBudget = 0;

    for (const item of items) {
      if (item.category === 'Bahan Pangan') {
        foodCostBudget += Number(item.totalPrice) || 0;
      } else {
        operationalBudget += Number(item.totalPrice) || 0;
      }
    }
    const totalBudget = foodCostBudget + operationalBudget;

    const saved: Rab = {
      id,
      rabNumber: rab.rabNumber || `RAB/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      period: rab.period || 'Periode Anggaran',
      startDate: rab.startDate || new Date().toISOString().split('T')[0],
      endDate: rab.endDate || new Date().toISOString().split('T')[0],
      totalPortions: Number(rab.totalPortions) || 0,
      foodCostBudget,
      operationalBudget,
      totalBudget,
      status: rab.status || 'Draft',
      approvedBy: rab.approvedBy || '',
      approvalDate: rab.approvalDate || '',
      approvalNote: rab.approvalNote || '',
      version: Number(rab.version) || 1,
      items,
      createdAt: rab.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function reviseRab(existingRab: Rab, newItems: RabItem[], reason: string): Promise<Rab> {
  try {
    // Increment version, keep history
    const updated = await saveRab({
      ...existingRab,
      version: existingRab.version + 1,
      items: newItems,
      status: 'Menunggu Persetujuan',
      approvalNote: `Revisi v${existingRab.version + 1}: ${reason}`
    });
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteRab(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
