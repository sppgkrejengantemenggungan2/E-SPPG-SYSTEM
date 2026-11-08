import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { DistributionRecord } from '../types';
import { saveLetter } from './letterService';

const COLLECTION_NAME = 'distribution_records';

export const INITIAL_DISTRIBUTIONS: Omit<DistributionRecord, 'id'>[] = [
  {
    distributionNumber: 'DIST/SPPG-KRJ2/2026/03/001',
    date: '2026-03-09',
    institutionId: 'inst-1',
    institutionName: 'SDN Temenggungan 1',
    picName: 'Dra. Hj. Ummi Kulsum',
    phone: '0813-3122-8901',
    smallPortions: 110,
    largePortions: 120,
    totalPortions: 230,
    departureTime: '09:45 WIB',
    arrivalTime: '10:05 WIB',
    driverName: 'Khoirul Anam',
    vehicleNumber: 'N 8412 QW (Mobil Box MBG 01)',
    fuelCost: 65000,
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST-TERIMA/SPPG-KRJ2/2026/03/001',
    bastStatus: 'Diterbitkan',
    photoUrls: [],
    notes: 'Serah terima langsung di ruang guru SDN Temenggungan 1, ompreng bersih tersegel.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    distributionNumber: 'DIST/SPPG-KRJ2/2026/03/002',
    date: '2026-03-09',
    institutionId: 'inst-2',
    institutionName: 'SDN Krejengan 2',
    picName: 'Bambang Sugiharto, S.Pd',
    phone: '0852-3344-9812',
    smallPortions: 90,
    largePortions: 102,
    totalPortions: 192,
    departureTime: '10:00 WIB',
    arrivalTime: '10:20 WIB',
    driverName: 'Hasan Basri',
    vehicleNumber: 'N 8933 RT (Mobil Box MBG 02)',
    fuelCost: 55000,
    status: 'Selesai Serah Terima',
    bastNumber: 'BAST-TERIMA/SPPG-KRJ2/2026/03/002',
    bastStatus: 'Diterbitkan',
    photoUrls: [],
    notes: 'Diterima oleh Kepala Sekolah & guru piket.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getDistributionRecords(): Promise<DistributionRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      const seeded: DistributionRecord[] = [];
      for (const d of INITIAL_DISTRIBUTIONS) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newD: DistributionRecord = { id: docRef.id, ...d };
        await setDoc(docRef, newD);
        seeded.push(newD);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DistributionRecord, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveDistributionRecord(item: Partial<DistributionRecord>): Promise<DistributionRecord> {
  try {
    const id = item.id || doc(collection(db, COLLECTION_NAME)).id;
    const smallPortions = Number(item.smallPortions) || 0;
    const largePortions = Number(item.largePortions) || 0;
    const totalPortions = smallPortions + largePortions;

    const saved: DistributionRecord = {
      id,
      distributionNumber: item.distributionNumber || `DIST/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      date: item.date || new Date().toISOString().split('T')[0],
      institutionId: item.institutionId || '',
      institutionName: item.institutionName || '',
      picName: item.picName || '',
      phone: item.phone || '',
      smallPortions,
      largePortions,
      totalPortions,
      departureTime: item.departureTime || '09:30 WIB',
      arrivalTime: item.arrivalTime || '10:00 WIB',
      driverName: item.driverName || 'Driver SPPG',
      vehicleNumber: item.vehicleNumber || 'N 8412 QW (Mobil Box 01)',
      fuelCost: Number(item.fuelCost) || 0,
      status: item.status || 'Dipersiapkan',
      bastNumber: item.bastNumber || '',
      bastStatus: item.bastStatus || 'Draft',
      photoUrls: item.photoUrls || [],
      notes: item.notes || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, COLLECTION_NAME, id), saved, { merge: true });

    // Auto-record BAST into letters / outgoing letters if bastStatus is 'Diterbitkan' and bastNumber exists
    if (saved.bastNumber && saved.bastStatus === 'Diterbitkan') {
      await saveLetter({
        type: 'BAST Penerimaan',
        letterNumber: saved.bastNumber,
        date: saved.date,
        recipientOrSender: saved.institutionName,
        subject: `Berita Acara Serah Terima (BAST) Makanan Bergizi Gratis - ${saved.institutionName}`,
        signatory: saved.driverName,
        category: 'Penyaluran',
        content: `Telah diserahterimakan paket Makan Bergizi Gratis sejumlah ${saved.totalPortions} porsi (${saved.smallPortions} kecil, ${saved.largePortions} besar) kepada ${saved.picName} di ${saved.institutionName}.`,
        metadata: {
          distributionId: saved.id,
          smallPortions: saved.smallPortions,
          largePortions: saved.largePortions,
          picPhone: saved.phone
        }
      });
    }

    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

export async function deleteDistributionRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
