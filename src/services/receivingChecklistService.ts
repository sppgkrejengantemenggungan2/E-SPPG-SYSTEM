import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { ReceivingChecklist, FoodIngredient } from '../types';
import { recordInventoryMovement } from './inventoryService';
import { getFoodIngredients } from './foodIngredientService';

const COLLECTION_NAME = 'receiving_checklists';

export async function getReceivingChecklists(): Promise<ReceivingChecklist[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ReceivingChecklist, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveReceivingChecklist(data: Partial<ReceivingChecklist>): Promise<ReceivingChecklist> {
  try {
    const id = data.id || doc(collection(db, COLLECTION_NAME)).id;
    const saved: ReceivingChecklist = {
      id,
      poId: data.poId || '',
      poNumber: data.poNumber || '',
      receivingDate: data.receivingDate || new Date().toISOString().split('T')[0],
      supplierName: data.supplierName || '',
      inspectorName: data.inspectorName || '',
      status: data.status || 'Diperiksa',
      isInventoryUpdated: data.isInventoryUpdated || false,
      inventoryTransactionId: data.inventoryTransactionId || '',
      items: data.items || [],
      photoUrls: data.photoUrls || [],
      notes: data.notes || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function confirmReceivingAndCreditStock(
  checklist: ReceivingChecklist,
  confirmedBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (checklist.isInventoryUpdated) {
      return { success: false, message: 'Penerimaan ini telah sebelumnya dikonfirmasi masuk gudang (mencegah penambahan stok ganda).' };
    }

    const ingredients = await getFoodIngredients();
    const ingredientMap = new Map<string, FoodIngredient>();
    ingredients.forEach(i => ingredientMap.set(i.name.toLowerCase().trim(), i));

    let creditedItemsCount = 0;

    for (const item of checklist.items) {
      if (item.safetyStatus === 'Aman' && item.receivedQuantity > 0) {
        // Find matching ingredient
        const matched = ingredients.find(
          i => i.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(i.name.toLowerCase())
        );

        if (matched) {
          await recordInventoryMovement(
            matched.id,
            'Masuk',
            item.receivedQuantity,
            checklist.poNumber,
            confirmedBy,
            `Penerimaan PO ${checklist.poNumber} dari ${checklist.supplierName}`
          );
          creditedItemsCount++;
        }
      }
    }

    // Mark checklist as confirmed and inventory updated
    await saveReceivingChecklist({
      ...checklist,
      status: 'Dikonfirmasi Masuk Gudang',
      isInventoryUpdated: true,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Berhasil mengonfirmasi penerimaan. ${creditedItemsCount} item bahan pangan berstatus AMAN telah ditambahkan ke stok gudang.`
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteReceivingChecklist(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
