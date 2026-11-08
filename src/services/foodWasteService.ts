import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodWasteRecord } from '../types';

const COLLECTION_NAME = 'food_waste';

export const INITIAL_FOOD_WASTE: Omit<FoodWasteRecord, 'id'>[] = [
  {
    date: '2026-03-09',
    riceWasteKg: 3.4,
    animalProteinWasteKg: 1.1,
    plantProteinWasteKg: 1.5,
    vegetableWasteKg: 2.8,
    fruitWasteKg: 1.2,
    totalWasteKg: 10.0,
    totalProductionKg: 385.0, // total berat produksi (kg)
    wastePercentage: 2.6, // (10 / 385) * 100%
    officerName: 'Agus Subekti (Divisi Cuci Ompreng)',
    notes: 'Sisa makanan tergolong sangat rendah (<3%). Sebagian besar sisa sayur sop pada anak kelas 1.',
    photoUrls: [],
    createdAt: new Date().toISOString()
  }
];

export async function getFoodWasteRecords(): Promise<FoodWasteRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: FoodWasteRecord[] = [];
      for (const w of INITIAL_FOOD_WASTE) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newW: FoodWasteRecord = { id: docRef.id, ...w };
        await setDoc(docRef, newW);
        seeded.push(newW);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FoodWasteRecord, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveFoodWasteRecord(data: Partial<FoodWasteRecord>): Promise<FoodWasteRecord> {
  try {
    const id = data.id || doc(collection(db, COLLECTION_NAME)).id;
    const riceWasteKg = Number(data.riceWasteKg) || 0;
    const animalProteinWasteKg = Number(data.animalProteinWasteKg) || 0;
    const plantProteinWasteKg = Number(data.plantProteinWasteKg) || 0;
    const vegetableWasteKg = Number(data.vegetableWasteKg) || 0;
    const fruitWasteKg = Number(data.fruitWasteKg) || 0;

    const totalWasteKg = riceWasteKg + animalProteinWasteKg + plantProteinWasteKg + vegetableWasteKg + fruitWasteKg;
    const totalProductionKg = Math.max(1, Number(data.totalProductionKg) || 350);
    const wastePercentage = Math.round((totalWasteKg / totalProductionKg) * 1000) / 10;

    const saved: FoodWasteRecord = {
      id,
      date: data.date || new Date().toISOString().split('T')[0],
      riceWasteKg,
      animalProteinWasteKg,
      plantProteinWasteKg,
      vegetableWasteKg,
      fruitWasteKg,
      totalWasteKg: Math.round(totalWasteKg * 100) / 100,
      totalProductionKg,
      wastePercentage,
      officerName: data.officerName || 'Petugas Cuci Ompreng',
      notes: data.notes || '',
      photoUrls: data.photoUrls || [],
      createdAt: data.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteFoodWasteRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
