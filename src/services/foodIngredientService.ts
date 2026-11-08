import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodIngredient } from '../types';

const COLLECTION_NAME = 'food_ingredients';

export const INITIAL_INGREDIENTS: Omit<FoodIngredient, 'id'>[] = [
  {
    name: 'Beras Ramos Super',
    category: 'Karbohidrat',
    unit: 'kg',
    referencePrice: 14500,
    energyKcal: 360,
    proteinG: 6.8,
    fatG: 0.7,
    carbG: 78.9,
    fiberG: 0.4,
    currentStock: 250,
    minimumStock: 50,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Daging Ayam Fillet Dada',
    category: 'Protein Hewani',
    unit: 'kg',
    referencePrice: 38000,
    energyKcal: 298,
    proteinG: 18.2,
    fatG: 25.0,
    carbG: 0,
    fiberG: 0,
    currentStock: 80,
    minimumStock: 25,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Telur Ayam Ras',
    category: 'Protein Hewani',
    unit: 'kg',
    referencePrice: 28000,
    energyKcal: 155,
    proteinG: 13.0,
    fatG: 11.0,
    carbG: 1.1,
    fiberG: 0,
    currentStock: 120,
    minimumStock: 30,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Tahu Putih Segar',
    category: 'Protein Nabati',
    unit: 'kg',
    referencePrice: 12000,
    energyKcal: 76,
    proteinG: 8.0,
    fatG: 4.8,
    carbG: 1.9,
    fiberG: 0.1,
    currentStock: 45,
    minimumStock: 15,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Tempe Kedelai Murni',
    category: 'Protein Nabati',
    unit: 'kg',
    referencePrice: 14000,
    energyKcal: 193,
    proteinG: 19.0,
    fatG: 11.0,
    carbG: 9.0,
    fiberG: 1.4,
    currentStock: 50,
    minimumStock: 15,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Wortel Lokal Segar',
    category: 'Sayuran',
    unit: 'kg',
    referencePrice: 15000,
    energyKcal: 41,
    proteinG: 0.9,
    fatG: 0.2,
    carbG: 9.6,
    fiberG: 2.8,
    currentStock: 35,
    minimumStock: 10,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Bayam Hijau',
    category: 'Sayuran',
    unit: 'kg',
    referencePrice: 10000,
    energyKcal: 23,
    proteinG: 2.9,
    fatG: 0.4,
    carbG: 3.6,
    fiberG: 2.2,
    currentStock: 25,
    minimumStock: 10,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Pisang Cavendish / Ambon',
    category: 'Buah',
    unit: 'kg',
    referencePrice: 18000,
    energyKcal: 89,
    proteinG: 1.1,
    fatG: 0.3,
    carbG: 22.8,
    fiberG: 2.6,
    currentStock: 75,
    minimumStock: 20,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Minyak Goreng Kelapa Sawit',
    category: 'Bumbu & Minyak',
    unit: 'liter',
    referencePrice: 16500,
    energyKcal: 884,
    proteinG: 0,
    fatG: 100.0,
    carbG: 0,
    fiberG: 0,
    currentStock: 60,
    minimumStock: 20,
    itemType: 'Bahan Pangan',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Ompreng Stainless SUS-304 (5 Sekat)',
    category: 'Barang Operasional',
    unit: 'pcs',
    referencePrice: 65000,
    energyKcal: 0,
    proteinG: 0,
    fatG: 0,
    carbG: 0,
    fiberG: 0,
    currentStock: 1200,
    minimumStock: 200,
    itemType: 'Barang Operasional',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Sendok Garpu Stainless MBG',
    category: 'Barang Operasional',
    unit: 'pcs',
    referencePrice: 6000,
    energyKcal: 0,
    proteinG: 0,
    fatG: 0,
    carbG: 0,
    fiberG: 0,
    currentStock: 1200,
    minimumStock: 200,
    itemType: 'Barang Operasional',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getFoodIngredients(): Promise<FoodIngredient[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      // Auto seed initial ingredients
      const seeded: FoodIngredient[] = [];
      for (const item of INITIAL_INGREDIENTS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newItem: FoodIngredient = { id: docRef.id, ...item };
        await setDoc(docRef, newItem);
        seeded.push(newItem);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FoodIngredient, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveFoodIngredient(item: Partial<FoodIngredient>): Promise<FoodIngredient> {
  try {
    const id = item.id || doc(collection(db, COLLECTION_NAME)).id;
    const ingredient: FoodIngredient = {
      id,
      name: item.name || '',
      category: item.category || 'Karbohidrat',
      unit: item.unit || 'kg',
      referencePrice: Number(item.referencePrice) || 0,
      energyKcal: Number(item.energyKcal) || 0,
      proteinG: Number(item.proteinG) || 0,
      fatG: Number(item.fatG) || 0,
      carbG: Number(item.carbG) || 0,
      fiberG: Number(item.fiberG) || 0,
      currentStock: Number(item.currentStock) || 0,
      minimumStock: Number(item.minimumStock) || 10,
      itemType: item.itemType || 'Bahan Pangan',
      status: item.status || 'aktif',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), ingredient, { merge: true });
    return ingredient;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteFoodIngredient(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
