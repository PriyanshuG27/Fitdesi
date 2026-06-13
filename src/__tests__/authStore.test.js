import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('authStore with localStorage caching', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('hydrates profile from localStorage cache on load if present', async () => {
    const fakeProfile = { uid: 'cached-uid', name: 'Cached User' };
    localStorage.setItem('zenkai_profile_cache', JSON.stringify(fakeProfile));

    // Import the store after setting the cache so the module-level init code sees it
    const { useAuthStore } = await import('../stores/authStore');

    const state = useAuthStore.getState();
    expect(state.profile).toEqual(fakeProfile);
    expect(state.cacheHydrated).toBe(true);
  });

  it('handles corrupted json in profile cache gracefully', async () => {
    localStorage.setItem('zenkai_profile_cache', 'invalid-json');

    const { useAuthStore } = await import('../stores/authStore');

    const state = useAuthStore.getState();
    expect(state.profile).toBeNull();
    expect(state.cacheHydrated).toBe(false);
  });

  it('handles localStorage read exception gracefully', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Localstorage blocked');
    });

    const { useAuthStore } = await import('../stores/authStore');

    const state = useAuthStore.getState();
    expect(state.profile).toBeNull();
    expect(state.cacheHydrated).toBe(false);

    getItemSpy.mockRestore();
  });

  it('writes to localStorage cache when setProfile is called', async () => {
    const { useAuthStore } = await import('../stores/authStore');
    
    useAuthStore.getState().setProfile({ name: 'Live User' });

    expect(JSON.parse(localStorage.getItem('zenkai_profile_cache'))).toEqual({ name: 'Live User' });
    expect(useAuthStore.getState().profile).toEqual({ name: 'Live User' });
    expect(useAuthStore.getState().cacheHydrated).toBe(true);
  });

  it('strips PII fields from localStorage cache when setProfile is called', async () => {
    const { useAuthStore } = await import('../stores/authStore');
    
    useAuthStore.getState().setProfile({
      uid: 'u123',
      name: 'Live User',
      email: 'live@email.com',
      age: 25,
      heightCm: 180,
      weightKg: 75,
      goal: 'Get Fit',
      workoutFrequency: '3 days',
      sessionDuration: '60 mins',
      dietType: 'Vegan',
      currentSupplements: ['Creatine'],
      equipmentList: ['Barbell'],
      medicalFlags: ['knee_pain'],
      examStartDate: '2026-06-14',
      examEndDate: '2026-06-20',
    });

    const cached = JSON.parse(localStorage.getItem('zenkai_profile_cache'));
    expect(cached.uid).toBe('u123');
    expect(cached.name).toBe('Live User');
    
    // PII fields should be undefined in the cache
    expect(cached.email).toBeUndefined();
    expect(cached.age).toBeUndefined();
    expect(cached.heightCm).toBeUndefined();
    expect(cached.weightKg).toBeUndefined();
    expect(cached.goal).toBeUndefined();
    expect(cached.workoutFrequency).toBeUndefined();
    expect(cached.sessionDuration).toBeUndefined();
    expect(cached.dietType).toBeUndefined();
    expect(cached.currentSupplements).toBeUndefined();
    expect(cached.equipmentList).toBeUndefined();
    expect(cached.medicalFlags).toBeUndefined();
    expect(cached.examStartDate).toBeUndefined();
    expect(cached.examEndDate).toBeUndefined();
  });

  it('handles write errors silently in writeProfileCache', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { useAuthStore } = await import('../stores/authStore');
    
    // Should not throw
    expect(() => {
      useAuthStore.getState().setProfile({ name: 'Live User' });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('clears localStorage cache on clearAuth', async () => {
    const fakeProfile = { uid: 'cached-uid', name: 'Cached User' };
    localStorage.setItem('zenkai_profile_cache', JSON.stringify(fakeProfile));

    const { useAuthStore } = await import('../stores/authStore');
    
    useAuthStore.getState().clearAuth();

    expect(localStorage.getItem('zenkai_profile_cache')).toBeNull();
    const state = useAuthStore.getState();
    expect(state.profile).toBeNull();
    expect(state.cacheHydrated).toBe(false);
  });

  it('handles removeItem exception silently on clearAuth', async () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Blocked');
    });

    const { useAuthStore } = await import('../stores/authStore');
    
    expect(() => {
      useAuthStore.getState().clearAuth();
    }).not.toThrow();

    removeItemSpy.mockRestore();
  });

  it('sets user, loading, and error states correctly', async () => {
    const { useAuthStore } = await import('../stores/authStore');

    // Initial state
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().uid).toBeNull();

    // Set user
    useAuthStore.getState().setUser({ uid: 'user-123' });
    expect(useAuthStore.getState().user).toEqual({ uid: 'user-123' });
    expect(useAuthStore.getState().uid).toBe('user-123');

    // Set null user
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().uid).toBeNull();

    // Set loading
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);

    // Set and clear error
    useAuthStore.getState().setError('Error occurred');
    expect(useAuthStore.getState().error).toBe('Error occurred');
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
