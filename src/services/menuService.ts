import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { MenuPlan, MenuIngredientItem } from '../types';

const COLLECTION_NAME = 'menus';

export const INITIAL_MENUS: Omit<MenuPlan, 'id'>[] = [
  {
    date: '2026-03-09',
    mealTime: 'Siang',
    name: 'Paket Bergizi Komplit: Ayam Suwir Kecap & Sayur Bening Bayam Wortel',
    category: 'Reguler',
    components: ['Nasi Putih Pulen', 'Ayam Suwir Kecap Manis', 'Tempe Mendoan Gurih', 'Sayur Bening Bayam Wortel', 'Pisang Ambon'],
    smallPortions: 235,
    largePortions: 575,
    totalPortions: 810,
    ingredients: [
      {
        ingredientId: 'ing-beras',
        ingredientName: 'Beras Ramos Super',
        unit: 'kg',
        weightGPerPortion: 120, // avg gramasi
        unitPrice: 14500,
        totalNeededKg: 97.2,
        totalCost: 1409400,
        energyKcal: 432,
        proteinG: 8.16,
        fatG: 0.84,
        carbG: 94.68,
        fiberG: 0.48
      },
      {
        ingredientId: 'ing-ayam',
        ingredientName: 'Daging Ayam Fillet Dada',
        unit: 'kg',
        weightGPerPortion: 65,
        unitPrice: 38000,
        totalNeededKg: 52.65,
        totalCost: 2000700,
        energyKcal: 193.7,
        proteinG: 11.83,
        fatG: 16.25,
        carbG: 0,
        fiberG: 0
      },
      {
        ingredientId: 'ing-tempe',
        ingredientName: 'Tempe Kedelai Murni',
        unit: 'kg',
        weightGPerPortion: 40,
        unitPrice: 14000,
        totalNeededKg: 32.4,
        totalCost: 453600,
        energyKcal: 77.2,
        proteinG: 7.6,
        fatG: 4.4,
        carbG: 3.6,
        fiberG: 0.56
      },
      {
        ingredientId: 'ing-sayur',
        ingredientName: 'Bayam & Wortel Campur',
        unit: 'kg',
        weightGPerPortion: 75,
        unitPrice: 12500,
        totalNeededKg: 60.75,
        totalCost: 759375,
        energyKcal: 24,
        proteinG: 1.4,
        fatG: 0.2,
        carbG: 4.95,
        fiberG: 1.88
      },
      {
        ingredientId: 'ing-buah',
        ingredientName: 'Pisang Cavendish / Ambon',
        unit: 'kg',
        weightGPerPortion: 90,
        unitPrice: 18000,
        totalNeededKg: 72.9,
        totalCost: 1312200,
        energyKcal: 80.1,
        proteinG: 0.99,
        fatG: 0.27,
        carbG: 20.52,
        fiberG: 2.34
      }
    ],
    totalEnergyKcal: 807,
    totalProteinG: 29.98,
    totalFatG: 21.96,
    totalCarbG: 123.75,
    totalFiberG: 5.26,
    foodCostSmall: 6200,
    foodCostLarge: 7800,
    totalCost: 5935275,
    status: 'Disetujui',
    approvedBy: 'Fitri Rahmawati, S.Gz., RD',
    notes: 'Kandungan gizi memenuhi standar AKG 35% kebutuhan harian anak sekolah & santri.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getMenus(): Promise<MenuPlan[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: MenuPlan[] = [];
      for (const m of INITIAL_MENUS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newM: MenuPlan = { id: docRef.id, ...m };
        await setDoc(docRef, newM);
        seeded.push(newM);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<MenuPlan, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export function getDayNameFromDate(dateStr: string): string {
  if (!dateStr) return 'Senin';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()] || 'Senin';
    }
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || 'Senin';
  } catch (e) {
    return 'Senin';
  }
}

export async function saveMenu(menu: Partial<MenuPlan>): Promise<MenuPlan> {
  try {
    const id = menu.id || doc(collection(db, COLLECTION_NAME)).id;
    const ingredients: MenuIngredientItem[] = menu.ingredients || [];
    const smallPortions = Number(menu.smallPortions) || 0;
    const largePortions = Number(menu.largePortions) || 0;
    const totalPortions = smallPortions + largePortions;

    // Recalculate totals
    let totalEnergyKcal = 0;
    let totalProteinG = 0;
    let totalFatG = 0;
    let totalCarbG = 0;
    let totalFiberG = 0;
    let totalCost = 0;

    for (const item of ingredients) {
      totalEnergyKcal += Number(item.energyKcal) || 0;
      totalProteinG += Number(item.proteinG) || 0;
      totalFatG += Number(item.fatG) || 0;
      totalCarbG += Number(item.carbG) || 0;
      totalFiberG += Number(item.fiberG) || 0;
      totalCost += Number(item.totalCost) || 0;
    }

    const avgCostPerPortion = totalPortions > 0 ? totalCost / totalPortions : 0;
    const foodCostSmall = menu.foodCostSmall || Math.round(avgCostPerPortion * 0.85);
    const foodCostLarge = menu.foodCostLarge || Math.round(avgCostPerPortion * 1.05);

    const dateVal = menu.date || new Date().toISOString().split('T')[0];
    const dayName = menu.dayName || getDayNameFromDate(dateVal);

    const saved: MenuPlan = {
      id,
      date: dateVal,
      dayName,
      menuPeriod: menu.menuPeriod || 'Mingguan',
      targetGroups: menu.targetGroups || ['Siswa SD/MI', 'Siswa SMP/MTs'],
      mealTime: menu.mealTime || 'Siang',
      name: menu.name || '',
      category: menu.category || 'Reguler',
      components: menu.components || [],
      dishItems: menu.dishItems || [],
      smallPortions,
      largePortions,
      totalPortions,
      ingredients,
      totalEnergyKcal: Math.round(totalEnergyKcal * 10) / 10,
      totalProteinG: Math.round(totalProteinG * 10) / 10,
      totalFatG: Math.round(totalFatG * 10) / 10,
      totalCarbG: Math.round(totalCarbG * 10) / 10,
      totalFiberG: Math.round(totalFiberG * 10) / 10,
      foodCostSmall,
      foodCostLarge,
      totalCost,
      status: menu.status || 'Draft',
      approvedBy: menu.approvedBy || '',
      notes: menu.notes || '',
      createdAt: menu.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function duplicateMenu(sourceMenu: MenuPlan, newDate?: string): Promise<MenuPlan> {
  const targetDate = newDate || new Date().toISOString().split('T')[0];
  const duplicatedData: Partial<MenuPlan> = {
    ...sourceMenu,
    id: undefined, // New ID
    name: `${sourceMenu.name} (Duplikat)`,
    date: targetDate,
    dayName: getDayNameFromDate(targetDate),
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return await saveMenu(duplicatedData);
}

export async function deleteMenu(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
