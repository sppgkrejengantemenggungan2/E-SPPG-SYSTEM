import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { VolunteerAttendance, InstitutionIncentive } from '../types';

const VOLUNTEER_ATTENDANCE_COLLECTION = 'volunteer_attendance';
const INSTITUTION_INCENTIVE_COLLECTION = 'institution_incentives';

export const INITIAL_VOLUNTEERS: Omit<VolunteerAttendance, 'id'>[] = [
  {
    volunteerName: 'Khoirul Anam',
    date: '2026-03-09',
    division: 'Distribusi',
    status: 'Hadir',
    incentiveAmount: 75000,
    paymentStatus: 'Dibayar',
    paymentDate: '2026-03-09',
    createdAt: new Date().toISOString()
  },
  {
    volunteerName: 'Nurul Hidayati',
    date: '2026-03-09',
    division: 'Pemorsian',
    status: 'Hadir',
    incentiveAmount: 75000,
    paymentStatus: 'Dibayar',
    paymentDate: '2026-03-09',
    createdAt: new Date().toISOString()
  },
  {
    volunteerName: 'Ahmad Fauzi',
    date: '2026-03-09',
    division: 'Persiapan',
    status: 'Sakit',
    absenceReason: 'Demam tinggi',
    substituteName: 'Muhammad Ridwan',
    substituteDivision: 'Persiapan',
    incentiveAmount: 75000, // Insentif dialihkan ke pengganti
    paymentStatus: 'Dibayar',
    paymentDate: '2026-03-09',
    createdAt: new Date().toISOString()
  }
];

export async function getVolunteerAttendances(): Promise<VolunteerAttendance[]> {
  try {
    const snap = await getDocs(collection(db, VOLUNTEER_ATTENDANCE_COLLECTION));
    if (snap.empty) {
      const seeded: VolunteerAttendance[] = [];
      for (const v of INITIAL_VOLUNTEERS) {
        const docRef = doc(collection(db, VOLUNTEER_ATTENDANCE_COLLECTION));
        const newV: VolunteerAttendance = { id: docRef.id, ...v };
        await setDoc(docRef, newV);
        seeded.push(newV);
      }
      return seeded;
    }
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VolunteerAttendance, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, VOLUNTEER_ATTENDANCE_COLLECTION);
  }
}

export async function saveVolunteerAttendance(data: Partial<VolunteerAttendance>): Promise<VolunteerAttendance> {
  try {
    const id = data.id || doc(collection(db, VOLUNTEER_ATTENDANCE_COLLECTION)).id;
    const saved: VolunteerAttendance = {
      id,
      volunteerName: data.volunteerName || '',
      date: data.date || new Date().toISOString().split('T')[0],
      division: data.division || 'Persiapan',
      status: data.status || 'Hadir',
      absenceReason: data.absenceReason || '',
      substituteName: data.substituteName || '',
      substituteDivision: data.substituteDivision,
      incentiveAmount: Number(data.incentiveAmount) ?? 75000,
      paymentStatus: data.paymentStatus || 'Belum Dibayar',
      paymentDate: data.paymentDate || '',
      createdAt: data.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, VOLUNTEER_ATTENDANCE_COLLECTION, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, VOLUNTEER_ATTENDANCE_COLLECTION);
  }
}

export async function deleteVolunteerAttendance(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, VOLUNTEER_ATTENDANCE_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${VOLUNTEER_ATTENDANCE_COLLECTION}/${id}`);
  }
}

export async function getInstitutionIncentives(): Promise<InstitutionIncentive[]> {
  try {
    const snap = await getDocs(collection(db, INSTITUTION_INCENTIVE_COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InstitutionIncentive, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, INSTITUTION_INCENTIVE_COLLECTION);
  }
}

export async function saveInstitutionIncentive(data: Partial<InstitutionIncentive>): Promise<InstitutionIncentive> {
  try {
    const id = data.id || doc(collection(db, INSTITUTION_INCENTIVE_COLLECTION)).id;
    const totalBeneficiaries = Number(data.totalBeneficiaries) || 0;
    const ratePerPerson = Number(data.ratePerPerson) || 1000; // e.g. Rp 1.000 / penerima / bulan
    const totalIncentive = data.totalIncentive ?? (totalBeneficiaries * ratePerPerson);

    const saved: InstitutionIncentive = {
      id,
      institutionId: data.institutionId || '',
      institutionName: data.institutionName || '',
      period: data.period || 'Maret 2026',
      totalBeneficiaries,
      ratePerPerson,
      totalIncentive,
      paymentStatus: data.paymentStatus || 'Belum Dibayar',
      paymentProofUrl: data.paymentProofUrl || '',
      paidDate: data.paidDate || '',
      createdAt: data.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, INSTITUTION_INCENTIVE_COLLECTION, id), saved, { merge: true });
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, INSTITUTION_INCENTIVE_COLLECTION);
  }
}
