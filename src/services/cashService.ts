import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { CashTransaction } from '../types';

const COLLECTION_NAME = 'cash_transactions';

export const INITIAL_TRANSACTIONS: Omit<CashTransaction, 'id'>[] = [
  {
    proofNumber: 'BKM/SPPG-KRJ2/2026/03/001',
    date: '2026-03-01',
    type: 'Masuk',
    category: 'Dana Hibah/APBN',
    description: 'Penerimaan Termin I Dana Bantuan Operasional Satuan Pelayanan Pemenuhan Gizi (MBG)',
    amount: 150000000,
    recordedBy: 'Siti Munawwaroh, S.E',
    verificationStatus: 'Terverifikasi',
    createdAt: new Date().toISOString()
  },
  {
    proofNumber: 'BKK/SPPG-KRJ2/2026/03/001',
    date: '2026-03-02',
    type: 'Keluar',
    category: 'Operasional SPPG',
    description: 'Pengadaan Perlengkapan Dapur Higienis & Peralatan Sanitasi Dapur Temenggungan',
    amount: 8750000,
    recordedBy: 'Siti Munawwaroh, S.E',
    verificationStatus: 'Terverifikasi',
    createdAt: new Date().toISOString()
  },
  {
    proofNumber: 'BKK/SPPG-KRJ2/2026/03/002',
    date: '2026-03-05',
    type: 'Keluar',
    category: 'BBM & Transport',
    description: 'Uang Muka Operasional Distribusi & Pembelian Kupon BBM Armada MBG Krejengan',
    amount: 2500000,
    recordedBy: 'Siti Munawwaroh, S.E',
    verificationStatus: 'Terverifikasi',
    createdAt: new Date().toISOString()
  }
];

export async function getCashTransactions(): Promise<CashTransaction[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: CashTransaction[] = [];
      for (const t of INITIAL_TRANSACTIONS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newT: CashTransaction = { id: docRef.id, ...t };
        await setDoc(docRef, newT);
        seeded.push(newT);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CashTransaction, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveCashTransaction(tx: Partial<CashTransaction>): Promise<CashTransaction> {
  try {
    const id = tx.id || doc(collection(db, COLLECTION_NAME)).id;
    const amount = Math.abs(Number(tx.amount) || 0);

    const saved: CashTransaction = {
      id,
      proofNumber: tx.proofNumber || `BK${tx.type === 'Masuk' ? 'M' : 'K'}/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      date: tx.date || new Date().toISOString().split('T')[0],
      type: tx.type || 'Keluar',
      category: tx.category || 'Operasional SPPG',
      description: tx.description || '',
      amount,
      referencePoId: tx.referencePoId || '',
      recordedBy: tx.recordedBy || 'Bendahara SPPG',
      verificationStatus: tx.verificationStatus || 'Terverifikasi',
      attachmentUrl: tx.attachmentUrl || '',
      createdAt: tx.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });

    // If linked to PO, mark PO as Lunas
    if (saved.referencePoId && saved.type === 'Keluar') {
      try {
        const poRef = doc(db, 'purchase_orders', saved.referencePoId);
        await updateDoc(poRef, {
          isPaid: 'Lunas',
          paymentTransactionId: saved.id,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Could not update PO payment status:', e);
      }
    }

    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteCashTransaction(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

export function calculateCashBalance(transactions: CashTransaction[]): {
  totalIn: number;
  totalOut: number;
  balance: number;
} {
  let totalIn = 0;
  let totalOut = 0;

  for (const t of transactions) {
    if (t.verificationStatus !== 'Ditolak') {
      if (t.type === 'Masuk') {
        totalIn += Number(t.amount) || 0;
      } else {
        totalOut += Number(t.amount) || 0;
      }
    }
  }

  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut
  };
}
