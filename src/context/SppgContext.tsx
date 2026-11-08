import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SppgProfile } from '../types';
import { getSppgProfile, updateSppgProfile as updateProfileService, DEFAULT_SPPG_PROFILE } from '../services/sppgProfileService';

interface SppgContextType {
  profile: SppgProfile;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<SppgProfile>) => Promise<void>;
}

const SppgContext = createContext<SppgContextType | undefined>(undefined);

export function SppgProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SppgProfile>(DEFAULT_SPPG_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getSppgProfile();
      setProfile(data);
    } catch (e) {
      console.warn('Using default SPPG profile:', e);
      setProfile(DEFAULT_SPPG_PROFILE);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfile = async (data: Partial<SppgProfile>) => {
    await updateProfileService(data);
    await loadProfile();
  };

  return (
    <SppgContext.Provider
      value={{
        profile,
        isLoading,
        refreshProfile: loadProfile,
        updateProfile
      }}
    >
      {children}
    </SppgContext.Provider>
  );
}

export function useSppg() {
  const context = useContext(SppgContext);
  if (!context) {
    throw new Error('useSppg must be used within an SppgProvider');
  }
  return context;
}
