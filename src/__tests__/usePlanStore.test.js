import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanStore } from '../stores/usePlanStore';

describe('usePlanStore', () => {
  beforeEach(() => {
    usePlanStore.getState().clearPlan();
  });

  it('sets plan data correctly', () => {
    const mockPlan = {
      generatedAt: '2026-06-09T18:00:00Z',
      plan: {
        days: [
          { day: 1, focus: 'Push', exercises: [] },
          { day: 2, focus: 'Rest' }
        ]
      }
    };

    usePlanStore.getState().setPlan(mockPlan);

    let state = usePlanStore.getState();
    expect(state.currentPlan).toEqual(mockPlan);
    expect(state.planDays.length).toBe(2);
    expect(state.planDays[0].focus).toBe('Push');
    expect(state.generatedAt).toBe('2026-06-09T18:00:00Z');
    expect(state.planError).toBeNull();

    // Branch coverage: planDoc.days branch
    const altPlan = {
      generatedAt: '2026-06-10',
      days: [{ day: 3, focus: 'Pull' }]
    };
    usePlanStore.getState().setPlan(altPlan);
    state = usePlanStore.getState();
    expect(state.planDays.length).toBe(1);
    expect(state.planDays[0].focus).toBe('Pull');

    // Branch coverage: null planDoc
    usePlanStore.getState().setPlan(null);
    state = usePlanStore.getState();
    expect(state.planDays).toEqual([]);
  });

  it('sets loading and error states', () => {
    usePlanStore.getState().setPlanLoading(true);
    expect(usePlanStore.getState().planLoading).toBe(true);

    usePlanStore.getState().setPlanError('Network error loading weekly plan');
    expect(usePlanStore.getState().planError).toBe('Network error loading weekly plan');
  });

  it('clears plan state to defaults', () => {
    usePlanStore.setState({
      currentPlan: { days: [] },
      planDays: [{}],
      planLoading: true,
      planError: 'error',
      generatedAt: 'time',
    });

    usePlanStore.getState().clearPlan();

    const state = usePlanStore.getState();
    expect(state.currentPlan).toBeNull();
    expect(state.planDays).toEqual([]);
    expect(state.planLoading).toBe(false);
    expect(state.planError).toBeNull();
    expect(state.generatedAt).toBeNull();
  });
});
