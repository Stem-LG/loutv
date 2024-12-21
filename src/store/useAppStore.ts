import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginCredentials } from '../types/iptv';

interface AppStore {
    isLoggedIn: boolean;
    credentials?: LoginCredentials;
    lastUpdate?: Date;
    login: (credentials: LoginCredentials) => void;
    logout: () => void;
    updateLastUpdate: () => void;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            login: (credentials) =>
                set({ isLoggedIn: true, credentials, lastUpdate: new Date() }),
            logout: () => set({ isLoggedIn: false, credentials: undefined }),
            updateLastUpdate: () => set({ lastUpdate: new Date() }),
        }),
        {
            name: 'app-storage',
        }
    )
); 