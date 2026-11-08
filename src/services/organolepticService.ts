import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { OrganolepticRecord } from '../types';

const COLLECTION_NAME = 'organoleptic_records';

export const INITIAL_ORGANOLEPTIC: Omit<OrganolepticRecord, 'id'>[] = [
  {
    type: 'PLOG',
    recordNumber: 'ORG-PLOG/SPPG-KRJ2/2026/03/001',
    date: '2026-03-09',
    time: '08:30 WIB',
    menuName: 'Ayam Suwir Kecap & Sayur Bening Bayam Wortel',
    inspectorName: 'Fitri Rahmawati, S.Gz., RD',
    institution: 'Dapur SPPG Krejengan Temenggungan 2',
    color: 'Sangat Menarik',
    aroma: 'Sangat Sedap/Khas',
    taste: 'Sangat Lezat & Pas',
    texture: 'Sangat Empuk/Pas',
    appearance: 'Sangat Bersih & Menarik',
    conclusion: 'Sangat Layak Konsumsi',
    notes: 'Kematangan ayam sempurna, sayur segar tidak layu/overcooked, rasa gurih pas rendah natrium.',
    photoUrls: [],
    signatureName: 'Fitri Rahmawati, S.Gz., RD',
    createdAt: new Date().toISOString()
  },
  {
    type: 'PIC',
    recordNumber: 'ORG-PIC/SDN-TMG1/2026/03/001',
    date: '2026-03-09',
    time: '10:15 WIB',
    menuName: 'Ayam Suwir Kecap & Sayur Bening Bayam Wortel',
    inspectorName: 'Dra. Hj. Ummi Kulsum (Kepsek SDN Temenggungan 1)',
    institution: 'SDN Temenggungan 1',
    color: 'Menarik',
    aroma: 'Sedap',
    taste: 'Lezat',
    texture: 'Empuk',
    appearance: 'Bersih & Menarik',
    conclusion: 'Sangat Layak Konsumsi',
    notes: 'Siswa sangat antusias, makanan diterima hangat dan higienis.',
    photoUrls: [],
    signatureName: 'Dra. Hj. Ummi Kulsum',
    createdAt: new Date().toISOString()
  }
];

export async function getOrganolepticRecords(type?: 'PIC' | 'PLOG'): Promise<OrganolepticRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: OrganolepticRecord[] = [];
      for (const o of INITIAL_ORGANOLEPTIC) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newO: OrganolepticRecord = { id: docRef.id, ...o };
        await setDoc(docRef, newO);
        seeded.push(newO);
      }
      return type ? seeded.filter(o => o.type === type) : seeded;
    }
    const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<OrganolepticRecord, 'id'>) }));
    return type ? all.filter(o => o.type === type) : all;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveOrganolepticRecord(data: Partial<OrganolepticRecord>): Promise<OrganolepticRecord> {
  try {
    const id = data.id || doc(collection(db, COLLECTION_NAME)).id;
    const type = data.type || 'PLOG';
    const saved: OrganolepticRecord = {
      id,
      type,
      recordNumber: data.recordNumber || `ORG-${type}/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '08:30 WIB',
      menuName: data.menuName || '',
      inspectorName: data.inspectorName || '',
      institution: data.institution || '',
      color: data.color || 'Menarik',
      aroma: data.aroma || 'Sedap',
      taste: data.taste || 'Lezat',
      texture: data.texture || 'Empuk',
      appearance: data.appearance || 'Bersih & Menarik',
      conclusion: data.conclusion || 'Layak Konsumsi',
      notes: data.notes || '',
      photoUrls: data.photoUrls || [],
      signatureName: data.signatureName || data.inspectorName || '',
      createdAt: data.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteOrganolepticRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
