import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Supplier } from '../types';

const COLLECTION_NAME = 'suppliers';

export const INITIAL_SUPPLIERS: Omit<Supplier, 'id'>[] = [
  {
    name: 'UD Sumber Hasil Tani Krejengan',
    contactPerson: 'H. Abdul Ghofur',
    phone: '0812-4982-1100',
    address: 'Pasar Krejengan Kios No. 14-16, Probolinggo',
    category: 'Sayur & Buah',
    bankName: 'Bank BRI',
    accountNumber: '0054-01-098273-50-1',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'CV Barokah Protein Mandiri',
    contactPerson: 'Hendra Setiawan',
    phone: '0822-3011-4455',
    address: 'Jl. Raya Kraksaan No. 88, Kab. Probolinggo',
    category: 'Daging & Unggas',
    bankName: 'Bank Mandiri',
    accountNumber: '142-00-1928374-5',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Toko Beras & Sembako Jaya Abadi',
    contactPerson: 'Koh Ahong / Rudy',
    phone: '0813-3344-7722',
    address: 'Jl. Panglima Sudirman No. 102, Probolinggo',
    category: 'Sembako',
    bankName: 'Bank BCA',
    accountNumber: '214-0987123',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: Supplier[] = [];
      for (const s of INITIAL_SUPPLIERS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newS: Supplier = { id: docRef.id, ...s };
        await setDoc(docRef, newS);
        seeded.push(newS);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Supplier, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveSupplier(item: Partial<Supplier>): Promise<Supplier> {
  try {
    const id = item.id || doc(collection(db, COLLECTION_NAME)).id;
    const sup: Supplier = {
      id,
      name: item.name || '',
      contactPerson: item.contactPerson || '',
      phone: item.phone || '',
      address: item.address || '',
      category: item.category || 'Bahan Segar',
      bankName: item.bankName || '',
      accountNumber: item.accountNumber || '',
      status: item.status || 'aktif',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), sup, { merge: true });
    return sup;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
