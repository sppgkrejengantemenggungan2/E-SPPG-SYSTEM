import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { AuditLog } from '../types';

const COLLECTION_NAME = 'audit_logs';

export async function logAuditEvent(
  userName: string,
  userEmail: string,
  module: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'PRINT' | 'STOCK_MUTATION',
  details: string,
  recordId?: string
): Promise<void> {
  try {
    const logData: Omit<AuditLog, 'id'> = {
      userName: userName || 'Sistem',
      userEmail: userEmail || 'system@sppg.local',
      timestamp: new Date().toISOString(),
      module,
      action,
      details,
      recordId: recordId || '',
      ipAddress: '127.0.0.1'
    };
    await addDoc(collection(db, COLLECTION_NAME), logData);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Non-blocking in frontend if offline
  }
}

export async function getAuditLogs(maxRecords = 50): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'), limit(maxRecords));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<AuditLog, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}
