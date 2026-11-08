import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { PurchaseOrder, PoItem } from '../types';

const COLLECTION_NAME = 'purchase_orders';

export const INITIAL_POS: Omit<PurchaseOrder, 'id'>[] = [
  {
    poNumber: 'PO/SPPG-KRJ2/2026/03/001',
    rabId: 'rab-1',
    orderDate: '2026-03-08',
    deliveryDate: '2026-03-09',
    menuDate: '2026-03-09',
    menuName: 'Ayam Suwir Kecap & Sayur Bening',
    supplierId: 'sup-1',
    supplierName: 'CV Barokah Protein Mandiri',
    totalAmount: 2000700,
    status: 'Disetujui',
    isPaid: 'Belum Dibayar',
    approvedBy: 'H. Ahmad Zaini, S.Pd.I',
    notes: 'Kirim maksimal jam 05:00 WIB pagi ke SPPG Krejengan Temenggungan 2',
    items: [
      {
        id: 'po-item-1',
        name: 'Daging Ayam Fillet Dada',
        category: 'Protein Hewani',
        orderQuantity: 52.65,
        receivedQuantity: 52.65,
        unit: 'kg',
        unitPrice: 38000,
        totalPrice: 2000700,
        notes: 'Segar dingin, sertifikat halal terlampir'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    poNumber: 'PO/SPPG-KRJ2/2026/03/002',
    rabId: 'rab-1',
    orderDate: '2026-03-08',
    deliveryDate: '2026-03-09',
    menuDate: '2026-03-09',
    menuName: 'Ayam Suwir Kecap & Sayur Bening',
    supplierId: 'sup-2',
    supplierName: 'UD Sumber Hasil Tani Krejengan',
    totalAmount: 2525175,
    status: 'Disetujui',
    isPaid: 'Belum Dibayar',
    approvedBy: 'H. Ahmad Zaini, S.Pd.I',
    notes: 'Sayur segar dipanen sore hari sebelum pengiriman',
    items: [
      {
        id: 'po-item-2',
        name: 'Bayam & Wortel Segar',
        category: 'Sayuran',
        orderQuantity: 60.75,
        receivedQuantity: 60.75,
        unit: 'kg',
        unitPrice: 12500,
        totalPrice: 759375
      },
      {
        id: 'po-item-3',
        name: 'Tempe Kedelai Murni',
        category: 'Protein Nabati',
        orderQuantity: 32.4,
        receivedQuantity: 32.4,
        unit: 'kg',
        unitPrice: 14000,
        totalPrice: 453600
      },
      {
        id: 'po-item-4',
        name: 'Pisang Cavendish / Ambon',
        category: 'Buah',
        orderQuantity: 72.9,
        receivedQuantity: 72.9,
        unit: 'kg',
        unitPrice: 18000,
        totalPrice: 1312200
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: PurchaseOrder[] = [];
      for (const p of INITIAL_POS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newP: PurchaseOrder = { id: docRef.id, ...p };
        await setDoc(docRef, newP);
        seeded.push(newP);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PurchaseOrder, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function savePurchaseOrder(po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  try {
    const id = po.id || doc(collection(db, COLLECTION_NAME)).id;
    const items: PoItem[] = po.items || [];
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += Number(item.totalPrice) || 0;
    }

    const saved: PurchaseOrder = {
      id,
      poNumber: po.poNumber || `PO/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      rabId: po.rabId || '',
      orderDate: po.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: po.deliveryDate || new Date().toISOString().split('T')[0],
      menuDate: po.menuDate || new Date().toISOString().split('T')[0],
      menuName: po.menuName || '',
      supplierId: po.supplierId || '',
      supplierName: po.supplierName || '',
      totalAmount,
      status: po.status || 'Draft',
      isPaid: po.isPaid || 'Belum Dibayar',
      paymentTransactionId: po.paymentTransactionId || '',
      approvedBy: po.approvedBy || '',
      notes: po.notes || '',
      items,
      createdAt: po.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
