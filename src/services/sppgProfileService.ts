import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { SppgProfile } from '../types';

const PROFILE_DOC_ID = 'main_profile';

export const DEFAULT_SPPG_PROFILE: SppgProfile = {
  id: PROFILE_DOC_ID,
  appName: 'E-SPPG Management System',
  institutionName: 'SPPG Probolinggo Krejengan Temenggungan 2',
  foundationName: 'Yayasan Hafshawaty',
  programName: 'Makan Bergizi Gratis (MBG)',
  sppgCode: 'SPPG-KREJ-02',
  address: 'Jl. Raya Temenggungan No. 45, Kec. Krejengan, Kab. Probolinggo, Jawa Timur 67284',
  phone: '0812-3456-7890',
  email: 'sppgkrejengantemenggungan2@gmail.com',
  headName: 'H. Ahmad Zaini, S.Pd.I',
  headNip: '19780512 200501 1 004',
  nutritionistName: 'Fitri Rahmawati, S.Gz., RD',
  nutritionistStr: 'STRGZ-3513-2024-0089',
  financeOfficerName: 'Siti Munawwaroh, S.E',
  bgnLogoUrl: '/assets/aistudio/Badan_Gizi_Nasional__BGN__Logo_-_Colored_-_zonalogo.com_5e10d066.png',
  updatedAt: new Date().toISOString()
};

export async function getSppgProfile(): Promise<SppgProfile> {
  try {
    const docRef = doc(db, 'sppg_profiles', PROFILE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<SppgProfile, 'id'>) };
    }
    // Seed default if not exists
    await setDoc(docRef, DEFAULT_SPPG_PROFILE);
    return DEFAULT_SPPG_PROFILE;
  } catch (error) {
    console.warn('Could not load profile from Firestore, using default profile:', error);
    return DEFAULT_SPPG_PROFILE;
  }
}

export async function updateSppgProfile(data: Partial<SppgProfile>): Promise<void> {
  try {
    const docRef = doc(db, 'sppg_profiles', PROFILE_DOC_ID);
    const updated: SppgProfile = {
      ...DEFAULT_SPPG_PROFILE,
      ...data,
      id: PROFILE_DOC_ID,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, updated, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'sppg_profiles');
  }
}
