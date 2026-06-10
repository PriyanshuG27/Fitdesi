import { describe, it, expect, beforeEach } from 'vitest';
import { useSquadStore } from '../stores/useSquadStore';

describe('useSquadStore', () => {
  beforeEach(() => {
    useSquadStore.setState({
      squadId: null,
      squadName: '',
      members: [],
      weeklyXPMultiplier: 1.0,
      dailyCheckIns: {},
      loading: false,
      error: null,
    });
  });

  it('sets squad data correctly', () => {
    const mockSquad = {
      id: 'squad-123',
      squadName: 'Fitdesi Warriors',
      members: [{ uid: 'u1', displayName: 'Priyanshu', streak: 12, xpThisWeek: 450 }],
      weeklyXPMultiplier: 1.2,
      dailyCheckIns: { u1: true }
    };

    useSquadStore.getState().setSquadData(mockSquad);

    const state = useSquadStore.getState();
    expect(state.squadId).toBe('squad-123');
    expect(state.squadName).toBe('Fitdesi Warriors');
    expect(state.members).toEqual(mockSquad.members);
    expect(state.weeklyXPMultiplier).toBe(1.2);
    expect(state.dailyCheckIns).toEqual({ u1: true });
    expect(state.error).toBeNull();
    // Branch coverage: empty/null squadDoc
    useSquadStore.getState().setSquadData(null);
    const clearedState = useSquadStore.getState();
    expect(clearedState.squadId).toBeNull();
    expect(clearedState.squadName).toBe('');
    expect(clearedState.members).toEqual([]);
    expect(clearedState.weeklyXPMultiplier).toBe(1.0);
    expect(clearedState.dailyCheckIns).toEqual({});
  });

  it('sets loading and error states', () => {
    useSquadStore.getState().setLoading(true);
    expect(useSquadStore.getState().loading).toBe(true);

    useSquadStore.getState().setError('Failed to fetch squad');
    expect(useSquadStore.getState().error).toBe('Failed to fetch squad');
  });

  it('clears squad data back to default values', () => {
    useSquadStore.setState({
      squadId: 'squad-abc',
      squadName: 'Elite Club',
      members: [{ uid: 'user' }],
      weeklyXPMultiplier: 1.5,
      dailyCheckIns: { user: true },
      loading: true,
      error: 'some-error',
    });

    useSquadStore.getState().clearSquad();

    const state = useSquadStore.getState();
    expect(state.squadId).toBeNull();
    expect(state.squadName).toBe('');
    expect(state.members).toEqual([]);
    expect(state.weeklyXPMultiplier).toBe(1.0);
    expect(state.dailyCheckIns).toEqual({});
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
