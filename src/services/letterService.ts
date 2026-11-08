import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { LetterRecord } from '../types';

const COLLECTION_NAME = 'letters';

export const INITIAL_LETTERS: Omit<LetterRecord, 'id'>[] = [
  {
    type: 'Surat Masuk',
    letterNumber: '045/Disdik-Probb/MBG/II/2026',
    date: '2026-02-28',
    recipientOrSender: 'Dinas Pendidikan & Kebudayaan Kab. Probolinggo',
    subject: 'Rekomendasi Pelaksanaan Program Makan Bergizi Gratis SPPG Krejengan 2',
    signatory: 'Kepala Dinas Pendidikan Kab. Probolinggo',
    category: 'Koordinasi',
    content: 'Surat rekomendasi penetapan sasaran penerima manfaat tingkat SD dan SMP di wilayah Kecamatan Krejengan.',
    createdAt: new Date().toISOString()
  },
  {
    type: 'Surat Keluar',
    letterNumber: '012/SPPG-KRJ2/YHN/III/2026',
    date: '2026-03-02',
    recipientOrSender: 'Kepala Puskesmas Krejengan',
    subject: 'Pemberitahuan & Permohonan Uji Berkala Mikrobiologi Makanan MBG',
    signatory: 'H. Ahmad Zaini, S.Pd.I',
    category: 'Koordinasi',
    content: 'Permohonan pendampingan uji sampel pangan berkala oleh Sanitarian Puskesmas Krejengan.',
    createdAt: new Date().toISOString()
  },
  {
    type: 'Surat Tugas',
    letterNumber: 'ST/08/SPPG-KRJ2/III/2026',
    date: '2026-03-09',
    recipientOrSender: 'Khoirul Anam & Tim Distribusi',
    subject: 'Surat Tugas Penyaluran Makanan Bergizi Gratis Rayon Barat Krejengan',
    signatory: 'H. Ahmad Zaini, S.Pd.I (Kepala SPPG)',
    category: 'Penyaluran',
    content: 'Menugaskan petugas distribusi mengantarkan ompreng MBG ke SDN Temenggungan 1 dan SDN Krejengan 2.',
    metadata: {
      driver: 'Khoirul Anam',
      vehicle: 'N 8412 QW',
      route: 'Krejengan - Temenggungan'
    },
    createdAt: new Date().toISOString()
  }
];

export async function getLetters(type?: string): Promise<LetterRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: LetterRecord[] = [];
      for (const l of INITIAL_LETTERS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newL: LetterRecord = { id: docRef.id, ...l };
        await setDoc(docRef, newL);
        seeded.push(newL);
      }
      return type ? seeded.filter(l => l.type === type) : seeded;
    }
    const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LetterRecord, 'id'>) }));
    return type ? all.filter(l => l.type === type) : all;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveLetter(data: Partial<LetterRecord>): Promise<LetterRecord> {
  try {
    const id = data.id || doc(collection(db, COLLECTION_NAME)).id;
    const saved: LetterRecord = {
      id,
      type: data.type || 'Surat Masuk',
      letterNumber: data.letterNumber || `NOMOR/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      date: data.date || new Date().toISOString().split('T')[0],
      recipientOrSender: data.recipientOrSender || '',
      subject: data.subject || '',
      content: data.content || '',
      signatory: data.signatory || 'Kepala SPPG',
      category: data.category || 'Administrasi',
      fileUrl: data.fileUrl || '',
      metadata: data.metadata || {},
      createdAt: data.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteLetter(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
