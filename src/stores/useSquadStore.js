import { create } from 'zustand';

export const useSquadStore = create((set) => ({
  squadId: null,
  squadName: '',
  members: [], // [{ uid, displayName, streak, xpThisWeek }]
  weeklyXPMultiplier: 1.0,
  dailyCheckIns: {}, // { [uid]: boolean }
  loading: false,
  error: null,

  setSquadData: (squadDoc) =>
    set({
      squadId: squadDoc?.id ?? null,
      squadName: squadDoc?.squadName ?? '',
      members: squadDoc?.members ?? [],
      weeklyXPMultiplier: squadDoc?.weeklyXPMultiplier ?? 1.0,
      dailyCheckIns: squadDoc?.dailyCheckIns ?? {},
      error: null,
    }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  clearSquad: () =>
    set({
      squadId: null,
      squadName: '',
      members: [],
      weeklyXPMultiplier: 1.0,
      dailyCheckIns: {},
      loading: false,
      error: null,
    }),
}));
