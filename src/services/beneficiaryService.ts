import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { BeneficiaryGroup, Beneficiary } from '../types';

const GROUPS_COLLECTION = 'beneficiary_groups';
const BENEFICIARIES_COLLECTION = 'beneficiaries';

export const INITIAL_GROUPS: Omit<BeneficiaryGroup, 'id'>[] = [
  {
    institutionName: 'SDN Temenggungan 1',
    category: 'SD/MI',
    address: 'Dusun Krajan RT 02 RW 01, Desa Temenggungan, Kec. Krejengan',
    picName: 'Dra. Hj. Ummi Kulsum',
    phone: '0813-3122-8901',
    bankAccount: '143-00-1928374-1',
    bankName: 'Bank Jatim',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    institutionName: 'SDN Krejengan 2',
    category: 'SD/MI',
    address: 'Jl. Raya Desa Krejengan No. 12, Kec. Krejengan',
    picName: 'Bambang Sugiharto, S.Pd',
    phone: '0852-3344-9812',
    bankAccount: '143-00-2837461-8',
    bankName: 'Bank Jatim',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    institutionName: 'MTs Hafshawaty Zainul Hasan',
    category: 'SMP/MTs',
    address: 'Kompleks Pesantren Zainul Hasan Genggong, Pajarakan - Krejengan',
    picName: 'Ust. M. Fathoni, M.Pd.I',
    phone: '0821-4455-6677',
    bankAccount: '003-88-2938475-0',
    bankName: 'BSI (Bank Syariah Indonesia)',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    institutionName: 'Posyandu Melati Temenggungan',
    category: 'Posyandu/BKB',
    address: 'Balai Desa Temenggungan, Kec. Krejengan',
    picName: 'Ibu Ratna Dewi (Bidan Desa)',
    phone: '0878-5566-7788',
    bankAccount: '143-00-3948572-3',
    bankName: 'Bank Jatim',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getBeneficiaryGroups(): Promise<BeneficiaryGroup[]> {
  try {
    const snap = await getDocs(collection(db, GROUPS_COLLECTION));
    if (snap.empty) {
      const seeded: BeneficiaryGroup[] = [];
      for (const g of INITIAL_GROUPS) {
        const docRef = doc(collection(db, GROUPS_COLLECTION));
        const newGroup: BeneficiaryGroup = { id: docRef.id, ...g };
        await setDoc(docRef, newGroup);
        seeded.push(newGroup);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BeneficiaryGroup, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, GROUPS_COLLECTION);
  }
}

export async function saveBeneficiaryGroup(item: Partial<BeneficiaryGroup>): Promise<BeneficiaryGroup> {
  try {
    const id = item.id || doc(collection(db, GROUPS_COLLECTION)).id;
    const group: BeneficiaryGroup = {
      id,
      institutionName: item.institutionName || '',
      category: item.category || 'SD/MI',
      address: item.address || '',
      picName: item.picName || '',
      phone: item.phone || '',
      bankAccount: item.bankAccount || '',
      bankName: item.bankName || '',
      status: item.status || 'aktif',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, GROUPS_COLLECTION, id), group, { merge: true });
    return group;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, GROUPS_COLLECTION);
  }
}

export async function deleteBeneficiaryGroup(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, GROUPS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${GROUPS_COLLECTION}/${id}`);
  }
}

export async function getBeneficiaries(): Promise<Beneficiary[]> {
  try {
    const snap = await getDocs(collection(db, BENEFICIARIES_COLLECTION));
    if (snap.empty) {
      // Seed default beneficiaries linked to groups
      const groups = await getBeneficiaryGroups();
      const defaultBeneficiaries: Omit<Beneficiary, 'id'>[] = [
        {
          groupId: groups[0]?.id || 'g1',
          institutionName: 'SDN Temenggungan 1',
          maleStudents: 110,
          femaleStudents: 105,
          maleTeachers: 6,
          femaleTeachers: 9,
          toddlers: 0,
          pregnantMothers: 0,
          breastfeedingMothers: 0,
          smallPortions: 110, // Kelas 1-3
          largePortions: 120, // Kelas 4-6 + Guru
          totalPortions: 230,
          status: 'aktif',
          effectiveDate: '2026-03-01',
          notes: 'Makan siang jam 10:30 WIB',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          groupId: groups[1]?.id || 'g2',
          institutionName: 'SDN Krejengan 2',
          maleStudents: 95,
          femaleStudents: 85,
          maleTeachers: 5,
          femaleTeachers: 7,
          toddlers: 0,
          pregnantMothers: 0,
          breastfeedingMothers: 0,
          smallPortions: 90,
          largePortions: 102,
          totalPortions: 192,
          status: 'aktif',
          effectiveDate: '2026-03-01',
          notes: 'Makan siang jam 10:45 WIB',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          groupId: groups[2]?.id || 'g3',
          institutionName: 'MTs Hafshawaty Zainul Hasan',
          maleStudents: 160,
          femaleStudents: 140,
          maleTeachers: 12,
          femaleTeachers: 14,
          toddlers: 0,
          pregnantMothers: 0,
          breastfeedingMothers: 0,
          smallPortions: 0,
          largePortions: 326,
          totalPortions: 326,
          status: 'aktif',
          effectiveDate: '2026-03-01',
          notes: 'Santri & Asatidz porsi besar',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          groupId: groups[3]?.id || 'g4',
          institutionName: 'Posyandu Melati Temenggungan',
          maleStudents: 0,
          femaleStudents: 0,
          maleTeachers: 0,
          femaleTeachers: 0,
          toddlers: 35,
          pregnantMothers: 12,
          breastfeedingMothers: 15,
          smallPortions: 35,
          largePortions: 27,
          totalPortions: 62,
          status: 'aktif',
          effectiveDate: '2026-03-01',
          notes: 'Menu gizi seimbang khusus balita & bumil',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const seeded: Beneficiary[] = [];
      for (const b of defaultBeneficiaries) {
        const docRef = doc(collection(db, BENEFICIARIES_COLLECTION));
        const newB: Beneficiary = { id: docRef.id, ...b };
        await setDoc(docRef, newB);
        seeded.push(newB);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Beneficiary, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BENEFICIARIES_COLLECTION);
  }
}

export async function saveBeneficiary(item: Partial<Beneficiary>): Promise<Beneficiary> {
  try {
    const id = item.id || doc(collection(db, BENEFICIARIES_COLLECTION)).id;
    const maleStudents = Number(item.maleStudents) || 0;
    const femaleStudents = Number(item.femaleStudents) || 0;
    const maleTeachers = Number(item.maleTeachers) || 0;
    const femaleTeachers = Number(item.femaleTeachers) || 0;
    const toddlers = Number(item.toddlers) || 0;
    const pregnantMothers = Number(item.pregnantMothers) || 0;
    const breastfeedingMothers = Number(item.breastfeedingMothers) || 0;

    const smallPortions = Number(item.smallPortions) ?? (toddlers + Math.floor((maleStudents + femaleStudents) / 2));
    const largePortions = Number(item.largePortions) ?? (maleTeachers + femaleTeachers + pregnantMothers + breastfeedingMothers + Math.ceil((maleStudents + femaleStudents) / 2));
    const totalPortions = smallPortions + largePortions;

    const beneficiary: Beneficiary = {
      id,
      groupId: item.groupId || '',
      institutionName: item.institutionName || '',
      maleStudents,
      femaleStudents,
      maleTeachers,
      femaleTeachers,
      toddlers,
      pregnantMothers,
      breastfeedingMothers,
      smallPortions,
      largePortions,
      totalPortions,
      status: item.status || 'aktif',
      effectiveDate: item.effectiveDate || new Date().toISOString().split('T')[0],
      notes: item.notes || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, BENEFICIARIES_COLLECTION, id), beneficiary, { merge: true });
    return beneficiary;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, BENEFICIARIES_COLLECTION);
  }
}

export async function deleteBeneficiary(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BENEFICIARIES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BENEFICIARIES_COLLECTION}/${id}`);
  }
}
