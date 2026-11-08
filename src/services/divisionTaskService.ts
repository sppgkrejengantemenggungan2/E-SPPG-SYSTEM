import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { DivisionTask, DivisionType } from '../types';

const COLLECTION_NAME = 'division_tasks';

export const INITIAL_TASKS: Omit<DivisionTask, 'id'>[] = [
  {
    division: 'Persiapan',
    date: '2026-03-09',
    shift: 'Pagi',
    officerName: 'Slamet Riyadi',
    taskData: {
      damagedIngredients: [
        { name: 'Wortel (Ujung Busuk)', category: 'Sayuran', weightKg: 1.2, notes: 'Dipisahkan saat sortasi', photoUrl: '' },
        { name: 'Sayur Bayam Layu', category: 'Sayuran', weightKg: 0.8, notes: 'Sortasi daun kuning', photoUrl: '' }
      ],
      roomTemperatures: [
        { room: 'Ruang Persiapan', tempC: 22.5, time: '04:30 WIB', status: 'Sesuai Standar' },
        { room: 'Ruang Pengolahan', tempC: 25.0, time: '04:30 WIB', status: 'Sesuai Standar' },
        { room: 'Ruang Pemorsian', tempC: 21.0, time: '04:30 WIB', status: 'Sesuai Standar AC Steril' }
      ],
      absentVolunteers: [
        { name: 'Ahmad Fauzi', reason: 'Sakit Demam', substituteName: 'Muhammad Ridwan', substituteDivision: 'Persiapan' }
      ]
    },
    photoUrls: [],
    status: 'Selesai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    division: 'Pengolahan',
    date: '2026-03-09',
    shift: 'Pagi',
    officerName: 'Chef Samsul Arifin',
    taskData: {
      foodTemperatures: [
        { item: 'Nasi Putih Pulen', tempC: 84.5, time: '06:15 WIB', status: 'Aman (>65°C)', photoUrl: '' },
        { item: 'Ayam Suwir Kecap', tempC: 78.2, time: '06:40 WIB', status: 'Aman (>75°C Daging)', photoUrl: '' },
        { item: 'Tempe Mendoan', tempC: 76.0, time: '06:50 WIB', status: 'Aman (>65°C)', photoUrl: '' },
        { item: 'Sayur Bening Bayam Wortel', tempC: 72.8, time: '07:05 WIB', status: 'Aman (>65°C)', photoUrl: '' },
        { item: 'Pisang Segar', tempC: 23.5, time: '07:00 WIB', status: 'Suhu Kamar', photoUrl: '' }
      ],
      roomTemperatures: [
        { room: 'Ruang Persiapan', tempC: 23.0, time: '06:30 WIB', status: 'Sesuai' },
        { room: 'Ruang Pengolahan (Dapur)', tempC: 27.5, time: '06:30 WIB', status: 'Ventilasi Baik' },
        { room: 'Ruang Pemorsian', tempC: 21.2, time: '06:30 WIB', status: 'Higienis' }
      ]
    },
    photoUrls: [],
    status: 'Selesai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    division: 'Pemorsian',
    date: '2026-03-09',
    shift: 'Pagi',
    officerName: 'Nurul Hidayati, A.Md.Gz',
    taskData: {
      foodTemperatures: [
        { item: 'Nasi Putih (Suhu Packing)', tempC: 68.0, time: '08:00 WIB', status: 'Aman Packing', photoUrl: '' },
        { item: 'Lauk Hewani (Ayam)', tempC: 69.5, time: '08:10 WIB', status: 'Aman Packing', photoUrl: '' },
        { item: 'Lauk Nabati (Tempe)', tempC: 66.0, time: '08:15 WIB', status: 'Aman Packing', photoUrl: '' },
        { item: 'Sayuran', tempC: 65.5, time: '08:20 WIB', status: 'Aman Packing', photoUrl: '' }
      ],
      gramasiChecks: [
        {
          portionType: 'Porsi Kecil (SD Kelas 1-3 & Balita)',
          targetGram: 360,
          measuredGram: 365,
          tolerance: '± 5 gram (Lolos QC)',
          itemsGram: { nasi: 100, ayam: 45, tempe: 30, sayur: 60, buah: 130 },
          omprengPhotoUrl: ''
        },
        {
          portionType: 'Porsi Besar (SD Kelas 4-6, MTs & Guru)',
          targetGram: 520,
          measuredGram: 524,
          tolerance: '± 5 gram (Lolos QC)',
          itemsGram: { nasi: 160, ayam: 75, tempe: 45, sayur: 90, buah: 154 },
          omprengPhotoUrl: ''
        }
      ],
      absentVolunteers: []
    },
    photoUrls: [],
    status: 'Selesai',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getDivisionTasks(division?: DivisionType): Promise<DivisionTask[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: DivisionTask[] = [];
      for (const t of INITIAL_TASKS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newT: DivisionTask = { id: docRef.id, ...t };
        await setDoc(docRef, newT);
        seeded.push(newT);
      }
      return division ? seeded.filter(t => t.division === division) : seeded;
    }
    const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DivisionTask, 'id'>) }));
    return division ? all.filter(t => t.division === division) : all;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveDivisionTask(task: Partial<DivisionTask>): Promise<DivisionTask> {
  try {
    const id = task.id || doc(collection(db, COLLECTION_NAME)).id;
    const saved: DivisionTask = {
      id,
      division: task.division || 'Persiapan',
      date: task.date || new Date().toISOString().split('T')[0],
      shift: task.shift || 'Pagi',
      officerName: task.officerName || 'Petugas Divisi',
      taskData: task.taskData || {},
      photoUrls: task.photoUrls || [],
      status: task.status || 'Dalam Proses',
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteDivisionTask(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
