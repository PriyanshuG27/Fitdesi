import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user:    null,   // Firebase User object | null
  uid:     null,   // string | null
  profile: null,   // Firestore user document | null
  loading: true,   // true until onAuthStateChanged resolves
  error:   null,   // human-readable string | null

  setUser: (user) => set({
    user,
    uid:   user?.uid ?? null,
    error: null,
  }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  clearAuth: () => set({ user: null, uid: null, profile: null, loading: false, error: null }),
}));

