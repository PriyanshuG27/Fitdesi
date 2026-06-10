import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      uid: null,
      profile: null,
      loading: true,
      error: null,
    });
  });

  it('sets user and uid correctly, clears error', () => {
    useAuthStore.getState().setError('some-error');
    useAuthStore.getState().setUser({ uid: 'uid-test-456', email: 'test@zenkai.com' });

    const state = useAuthStore.getState();
    expect(state.user).toEqual({ uid: 'uid-test-456', email: 'test@zenkai.com' });
    expect(state.uid).toBe('uid-test-456');
    expect(state.error).toBeNull();
    // Branch coverage: null user
    useAuthStore.getState().setUser(null);
    const nullState = useAuthStore.getState();
    expect(nullState.user).toBeNull();
    expect(nullState.uid).toBeNull();
  });

  it('sets profile correctly', () => {
    useAuthStore.getState().setProfile({ name: 'FitDesi Athlete', weightKg: 80 });
    expect(useAuthStore.getState().profile).toEqual({ name: 'FitDesi Athlete', weightKg: 80 });
  });

  it('sets loading state correctly', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('sets and clears error correctly', () => {
    useAuthStore.getState().setError('Fatal Auth Error');
    expect(useAuthStore.getState().error).toBe('Fatal Auth Error');

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('clears all auth state correctly', () => {
    useAuthStore.setState({
      user: { uid: 'some-uid' },
      uid: 'some-uid',
      profile: { name: 'athlete' },
      loading: true,
      error: 'some-error',
    });

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.uid).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
