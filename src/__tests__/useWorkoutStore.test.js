import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWorkoutStore, isBodyweightExercise, getEstimated1RM } from '../stores/useWorkoutStore';
import { useAuthStore } from '../stores/authStore';

describe('useWorkoutStore Utilities', () => {
  it('isBodyweightExercise matches bodyweight exercises correctly', () => {
    expect(isBodyweightExercise('push_ups')).toBe(true);
    expect(isBodyweightExercise('PUSH_UPS')).toBe(true);
    expect(isBodyweightExercise('push_ups', 'push_ups_123')).toBe(true);
    expect(isBodyweightExercise('bench_press')).toBe(false);
  });

  it('getEstimated1RM calculates correct 1RM', () => {
    expect(getEstimated1RM(100, 10, false)).toBeCloseTo(133.33);
    expect(getEstimated1RM(10, 10, true, 75)).toBeCloseTo(113.33);
  });
});

describe('useWorkoutStore Store Actions', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetSession();
    useAuthStore.setState({
      profile: {
        weightKg: 80,
        latestRestTimesMap: { barbell_bench_press: 120 }
      }
    });
  });

  it('starts a session with mood and stomach flag', () => {
    useWorkoutStore.getState().startSession('locked_in', true);

    const state = useWorkoutStore.getState();
    expect(state.activeSession).not.toBeNull();
    expect(state.activeSession.planDayId).toBe('custom');
    expect(state.activeSession.moodTag).toBe('locked_in');
    expect(state.activeSession.stomachFlag).toBe(true);
    expect(state.exercises.length).toBe(0);
  });

  it('starts a session from a plan day', () => {
    const planDay = {
      day: 1,
      focus: 'Push',
      exercises: [
        { name: 'Barbell Bench Press', key: 'barbell_bench_press', sets: 4, targetWeight: 60, reps: '8-10' }
      ]
    };

    useWorkoutStore.getState().startSession(planDay);

    const state = useWorkoutStore.getState();
    expect(state.activeSession.planDayId).toBe(1);
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0].exerciseKey).toBe('barbell_bench_press');
    expect(state.exercises[0].name).toBe('Barbell Bench Press');
    expect(state.exercises[0].sets.length).toBe(4);
    expect(state.exercises[0].sets[0].weight).toBe('60');
    expect(state.exercises[0].sets[0].reps).toBe('8-10');
    expect(state.exercises[0].restTimer).toBe(120);
  });

  it('adds and removes exercises', () => {
    useWorkoutStore.getState().startSession('average');

    useWorkoutStore.getState().addExercise({
      key: 'barbell_squat',
      name: 'Barbell Squat',
      muscleGroup: 'legs'
    });

    let state = useWorkoutStore.getState();
    expect(state.exercises.length).toBe(1);
    expect(state.exercises[0].name).toBe('Barbell Squat');
    expect(state.exercises[0].exerciseKey).toBe('barbell_squat');

    const addedExId = state.exercises[0].exerciseId;
    useWorkoutStore.getState().removeExercise(addedExId);

    state = useWorkoutStore.getState();
    expect(state.exercises.length).toBe(0);
  });

  it('adds, logs, updates, marks done, and removes sets', () => {
    useWorkoutStore.getState().startSession('average');
    useWorkoutStore.getState().addExercise({
      key: 'barbell_squat',
      name: 'Barbell Squat',
      muscleGroup: 'legs'
    });

    const exId = useWorkoutStore.getState().exercises[0].exerciseId;

    useWorkoutStore.getState().addSet(0);
    expect(useWorkoutStore.getState().exercises[0].sets.length).toBe(2);

    useWorkoutStore.getState().updateSet(exId, 0, 'weight', '100');
    useWorkoutStore.getState().updateSet(exId, 0, 'reps', '8');

    expect(useWorkoutStore.getState().exercises[0].sets[0].weight).toBe('100');
    expect(useWorkoutStore.getState().exercises[0].sets[0].reps).toBe('8');

    let success = useWorkoutStore.getState().markSetDone(exId, 0);
    expect(success).toBe(true);
    expect(useWorkoutStore.getState().exercises[0].sets[0].done).toBe(true);

    useWorkoutStore.getState().markSetDone(exId, 0);
    expect(useWorkoutStore.getState().exercises[0].sets[0].done).toBe(false);

    useWorkoutStore.getState().updateSet(exId, 0, 'reps', '0');
    success = useWorkoutStore.getState().markSetDone(exId, 0);
    expect(success).toBe(false);
    expect(useWorkoutStore.getState().exercises[0].sets[0].done).toBe(false);

    useWorkoutStore.getState().logSet(0, 0, { done: true, reps: '10' });
    expect(useWorkoutStore.getState().exercises[0].sets[0].reps).toBe('10');

    useWorkoutStore.getState().removeSet(0, 0);
    expect(useWorkoutStore.getState().exercises[0].sets.length).toBe(1);
  });

  it('increments timer ticks', () => {
    useWorkoutStore.getState().startSession('average');
    
    const startedAt = Date.now() - 5000;
    useWorkoutStore.setState({
      activeSession: {
        planDayId: 'custom',
        startedAt,
        exercises: [],
      }
    });

    useWorkoutStore.getState().tick();
    expect(useWorkoutStore.getState().elapsedSeconds).toBe(5);
  });

  it('updates loading and error states', () => {
    useWorkoutStore.getState().setSessionLoading(true);
    expect(useWorkoutStore.getState().sessionLoading).toBe(true);

    useWorkoutStore.getState().setSessionError('Network error');
    expect(useWorkoutStore.getState().sessionError).toBe('Network error');
  });

  it('sets overdrive and updates rest timer seconds', () => {
    useWorkoutStore.getState().startSession('average');
    useWorkoutStore.getState().addExercise({
      key: 'barbell_squat',
      name: 'Barbell Squat',
      muscleGroup: 'legs'
    });

    const exId = useWorkoutStore.getState().exercises[0].exerciseId;

    useWorkoutStore.getState().setOverdrive(true);
    expect(useWorkoutStore.getState().isOverdrive).toBe(true);

    useWorkoutStore.getState().updateExerciseRestTimer(exId, 180);
    expect(useWorkoutStore.getState().exercises[0].restTimer).toBe(180);
  });
});
