import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodIngredient, InventoryTransaction, StockOpname } from '../types';

const TRANSACTIONS_COLLECTION = 'inventory_transactions';
const OPNAME_COLLECTION = 'stock_opnames';

export async function getInventoryTransactions(maxRecords = 100): Promise<InventoryTransaction[]> {
  try {
    const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy('createdAt', 'desc'), limit(maxRecords));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InventoryTransaction, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TRANSACTIONS_COLLECTION);
  }
}

export async function recordInventoryMovement(
  ingredientId: string,
  type: 'Masuk' | 'Keluar' | 'Penyesuaian Opname',
  quantity: number,
  reference: string,
  recordedBy: string,
  note?: string,
  allowNegative = false,
  proofUrl?: string
): Promise<InventoryTransaction> {
  try {
    const ingredientRef = doc(db, 'food_ingredients', ingredientId);
    const ingredientSnap = await getDoc(ingredientRef);
    if (!ingredientSnap.exists()) {
      throw new Error(`Bahan pangan dengan ID ${ingredientId} tidak ditemukan.`);
    }

    const currentData = ingredientSnap.data() as FoodIngredient;
    const prevStock = Number(currentData.currentStock) || 0;
    let finalStock = prevStock;

    if (type === 'Masuk') {
      finalStock = prevStock + Math.abs(quantity);
    } else if (type === 'Keluar') {
      if (!allowNegative && prevStock < Math.abs(quantity)) {
        throw new Error(`Stok ${currentData.name} tidak mencukupi (Tersedia: ${prevStock} ${currentData.unit}, Diminta: ${quantity} ${currentData.unit}). Penolakan stok negatif.`);
      }
      finalStock = Math.max(0, prevStock - Math.abs(quantity));
    } else {
      // Penyesuaian
      finalStock = Math.max(0, quantity);
    }

    // Update stock in food_ingredients
    await updateDoc(ingredientRef, {
      currentStock: Math.round(finalStock * 100) / 100,
      updatedAt: new Date().toISOString()
    });

    // Record unique transaction
    const txDocRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ingredientId,
      ingredientName: currentData.name,
      type,
      quantity: Math.abs(quantity),
      unit: currentData.unit,
      previousStock: prevStock,
      finalStock,
      reference,
      note: note || '',
      recordedBy: recordedBy || 'Petugas Gudang',
      proofUrl: proofUrl || '',
      createdAt: new Date().toISOString()
    });

    return {
      id: txDocRef.id,
      ingredientId,
      ingredientName: currentData.name,
      type,
      quantity: Math.abs(quantity),
      unit: currentData.unit,
      previousStock: prevStock,
      finalStock,
      reference,
      note: note || '',
      recordedBy: recordedBy || 'Petugas Gudang',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, TRANSACTIONS_COLLECTION);
  }
}

export async function getStockOpnames(): Promise<StockOpname[]> {
  try {
    const q = query(collection(db, OPNAME_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<StockOpname, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, OPNAME_COLLECTION);
  }
}

export async function saveStockOpname(opname: Partial<StockOpname>): Promise<StockOpname> {
  try {
    const id = opname.id || doc(collection(db, OPNAME_COLLECTION)).id;
    const systemStock = Number(opname.systemStock) || 0;
    const physicalStock = Number(opname.physicalStock) || 0;
    const discrepancy = physicalStock - systemStock;

    const saved: StockOpname = {
      id,
      opnameNumber: opname.opnameNumber || `OPN/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      date: opname.date || new Date().toISOString().split('T')[0],
      officerName: opname.officerName || 'Admin Gudang',
      systemStock,
      physicalStock,
      discrepancy,
      unit: opname.unit || 'kg',
      ingredientId: opname.ingredientId || '',
      ingredientName: opname.ingredientName || '',
      reason: opname.reason || '',
      status: opname.status || 'Draft',
      createdAt: opname.createdAt || new Date().toISOString()
    };

    await setDoc(doc(db, OPNAME_COLLECTION, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, OPNAME_COLLECTION);
  }
}
