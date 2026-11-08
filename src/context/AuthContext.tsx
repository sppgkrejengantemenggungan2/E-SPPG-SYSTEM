import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { logAuditEvent } from '../services/auditService';

interface PermissionSet {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canPrint: boolean;
  canExport: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  activeRole: UserRole;
  isLoading: boolean;
  allUsers: UserProfile[];
  signInWithGoogle: () => Promise<void>;
  simulateRoleLogin: (role: UserRole, customName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  hasPermission: (module: string, action: keyof PermissionSet) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-admin',
    uid: 'admin-utama-sppg-01',
    email: 'sppgkrejengantemenggungan2@gmail.com',
    displayName: 'Admin Utama SPPG',
    role: 'Admin Utama',
    roleTitle: 'Administrator Sistem & Operasional',
    phone: '0812-3456-7890',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-kepala',
    uid: 'kepala-sppg-01',
    email: 'kepala.sppg@hafshawaty.org',
    displayName: 'H. Ahmad Zaini, S.Pd.I',
    role: 'Kepala SPPG',
    roleTitle: 'Kepala SPPG Krejengan 2',
    phone: '0813-9876-5432',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-gizi',
    uid: 'pengawas-gizi-01',
    email: 'gizi.sppg@hafshawaty.org',
    displayName: 'Fitri Rahmawati, S.Gz., RD',
    role: 'Pengawas Gizi',
    roleTitle: 'Ahli Gizi & Nutrisionis (PLOG)',
    phone: '0821-4567-8901',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-keuangan',
    uid: 'pengawas-keuangan-01',
    email: 'keuangan.sppg@hafshawaty.org',
    displayName: 'Siti Munawwaroh, S.E',
    role: 'Pengawas Keuangan',
    roleTitle: 'Bendahara & Tim PLOK',
    phone: '0852-3456-7812',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-gudang',
    uid: 'admin-gudang-01',
    email: 'gudang.sppg@hafshawaty.org',
    displayName: 'Budi Santoso',
    role: 'Admin Gudang',
    roleTitle: 'Kepala Logistik & Pergudangan',
    phone: '0819-2345-6789',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-lapangan',
    uid: 'asisten-lapangan-01',
    email: 'lapangan.sppg@hafshawaty.org',
    displayName: 'Khoirul Anam',
    role: 'Asisten Lapangan',
    roleTitle: 'Koordinator Distribusi & Lapangan',
    phone: '0878-1234-5678',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-relawan-koor',
    uid: 'koor-relawan-01',
    email: 'koor.relawan@hafshawaty.org',
    displayName: 'Nurul Hidayati',
    role: 'Koordinator Relawan',
    roleTitle: 'Koordinator Relawan & Pemorsian',
    phone: '0813-7788-9900',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-relawan',
    uid: 'relawan-01',
    email: 'relawan@hafshawaty.org',
    displayName: 'Slamet Riyadi',
    role: 'Relawan',
    roleTitle: 'Relawan Dapur Divisi Persiapan',
    phone: '0857-4433-2211',
    status: 'aktif',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(DEFAULT_USERS[0]);
  const [activeRole, setActiveRole] = useState<UserRole>('Admin Utama');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(DEFAULT_USERS);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) {
        // Seed default users in Firestore
        for (const u of DEFAULT_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
        setAllUsers(DEFAULT_USERS);
      } else {
        const loaded = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) }));
        setAllUsers(loaded);
      }
    } catch (err) {
      console.warn('Could not load users from Firestore, using initial users:', err);
      setAllUsers(DEFAULT_USERS);
    }
  };

  useEffect(() => {
    fetchUsers();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            setActiveRole(data.role);
          } else {
            // New user signed in via Google
            const isDefaultAdmin = firebaseUser.email === 'sppgkrejengantemenggungan2@gmail.com';
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Pengguna SPPG',
              role: isDefaultAdmin ? 'Admin Utama' : 'Relawan',
              roleTitle: isDefaultAdmin ? 'Administrator Utama SPPG' : 'Pengguna Baru',
              phone: firebaseUser.phoneNumber || '',
              status: 'aktif',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUserProfile(newProfile);
            setActiveRole(newProfile.role);
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
        }
      } else {
        setCurrentUser(null);
        // Default to Admin Utama simulated session so user can operate immediately
        if (!userProfile) {
          setUserProfile(DEFAULT_USERS[0]);
          setActiveRole(DEFAULT_USERS[0].role);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await logAuditEvent(
        res.user.displayName || 'User',
        res.user.email || '',
        'Autentikasi',
        'CREATE',
        'Login berhasil melalui Google Authentication'
      );
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const simulateRoleLogin = async (role: UserRole, customName?: string) => {
    const matched = allUsers.find(u => u.role === role) || DEFAULT_USERS.find(u => u.role === role) || DEFAULT_USERS[0];
    const updated: UserProfile = {
      ...matched,
      displayName: customName || matched.displayName,
      role
    };
    setUserProfile(updated);
    setActiveRole(role);
    await logAuditEvent(
      updated.displayName,
      updated.email,
      'Autentikasi',
      'CREATE',
      `Berganti role aktif menjadi [${role}]`
    );
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
    // Switch to Relawan profile or reset
    setUserProfile(DEFAULT_USERS[0]);
    setActiveRole('Admin Utama');
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      await logAuditEvent(
        userProfile?.displayName || 'Admin',
        userProfile?.email || '',
        'Pengaturan Pengguna',
        'UPDATE',
        `Mengubah role user ID ${userId} menjadi ${newRole}`,
        userId
      );
      await fetchUsers();
    } catch (e) {
      console.error('Failed to update user role:', e);
    }
  };

  // Role Based Permission Matrix
  const hasPermission = (module: string, action: keyof PermissionSet): boolean => {
    if (activeRole === 'Admin Utama') return true;

    // Kepala SPPG has approval, print, export, and view permissions across all modules
    if (activeRole === 'Kepala SPPG') {
      if (action === 'canDelete') return false;
      return true;
    }

    switch (module) {
      case 'beneficiary':
        if (['Asisten Lapangan', 'Pengawas Gizi', 'Editor Web'].includes(activeRole)) return true;
        return action === 'canView' || action === 'canPrint' || action === 'canExport';

      case 'plog': // Menu & Gizi
        if (activeRole === 'Pengawas Gizi') return true;
        if (activeRole === 'Editor Web') return action === 'canView' || action === 'canPrint';
        return action === 'canView';

      case 'plok': // RAB, PO, Checklist
        if (activeRole === 'Pengawas Keuangan') return action !== 'canDelete';
        if (activeRole === 'Admin Gudang') return action === 'canView' || action === 'canCreate' || action === 'canUpdate';
        return action === 'canView' || action === 'canPrint';

      case 'inventory':
        if (activeRole === 'Admin Gudang') return true;
        return action === 'canView' || action === 'canPrint';

      case 'division':
        if (['Koordinator Relawan', 'Relawan', 'Asisten Lapangan', 'Pengawas Gizi'].includes(activeRole)) {
          return action === 'canView' || action === 'canCreate' || action === 'canUpdate';
        }
        return action === 'canView';

      case 'distribution':
        if (activeRole === 'Asisten Lapangan') return true;
        return action === 'canView' || action === 'canPrint';

      case 'finance':
        if (activeRole === 'Pengawas Keuangan') return true;
        return false;

      case 'organoleptic':
        if (['Pengawas Gizi', 'Kepala SPPG', 'Mitra', 'Asisten Lapangan'].includes(activeRole)) return true;
        return action === 'canView' || action === 'canPrint';

      case 'administration':
        if (['Editor Web', 'Asisten Lapangan'].includes(activeRole)) return true;
        return action === 'canView' || action === 'canPrint';

      case 'settings':
        return false;

      default:
        return action === 'canView';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        isLoading,
        allUsers,
        signInWithGoogle,
        simulateRoleLogin,
        signOut,
        refreshUsers: fetchUsers,
        updateUserRole,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
