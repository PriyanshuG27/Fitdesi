import { describe, it, expect } from 'vitest';
import { determineWorkoutName } from '../lib/firestoreUtils';

describe('determineWorkoutName', () => {
  it('returns Custom Session for empty or undefined exercises', () => {
    expect(determineWorkoutName([])).toBe('Custom Session');
    expect(determineWorkoutName(null)).toBe('Custom Session');
  });

  it('returns Custom Session if no sets are completed', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: false, done: false }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Custom Session');
  });

  it('identifies Chest Workout for single chest exercise', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: true, done: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Chest Workout');
  });

  it('identifies Push Workout when Chest, Shoulders, and Triceps are hit', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: true }]
      },
      {
        name: 'Overhead Press',
        muscleGroup: 'shoulders',
        sets: [{ reps: 8, weight: 40, completed: true }]
      },
      {
        name: 'Tricep Pushdowns',
        muscleGroup: 'arms',
        sets: [{ reps: 12, weight: 20, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Push Workout');
  });

  it('identifies Chest & Triceps Workout for Chest + Triceps', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: true }]
      },
      {
        name: 'Tricep Pushdowns',
        muscleGroup: 'arms',
        sets: [{ reps: 12, weight: 20, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Chest & Triceps Workout');
  });

  it('identifies Pull Workout for Back + Biceps', () => {
    const exercises = [
      {
        name: 'Pull-Ups',
        muscleGroup: 'back',
        sets: [{ reps: 8, weight: 'BW', completed: true }]
      },
      {
        name: 'Bicep Curls',
        muscleGroup: 'arms',
        sets: [{ reps: 12, weight: 15, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Pull Workout');
  });

  it('identifies Legs Workout', () => {
    const exercises = [
      {
        name: 'Squat',
        muscleGroup: 'legs',
        sets: [{ reps: 5, weight: 100, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Legs Workout');
  });

  it('identifies Full Body Workout for Push + Pull + Legs', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: true }]
      },
      {
        name: 'Pull-Ups',
        muscleGroup: 'back',
        sets: [{ reps: 8, weight: 'BW', completed: true }]
      },
      {
        name: 'Squat',
        muscleGroup: 'legs',
        sets: [{ reps: 5, weight: 100, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Full Body Workout');
  });

  it('identifies Core Workout for a single core exercise', () => {
    const exercises = [
      {
        name: 'Plank',
        muscleGroup: 'core',
        sets: [{ reps: 1, weight: 0, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Core Workout');
  });

  it('identifies Upper Body Workout when Push and Pull are hit but no Legs', () => {
    const exercises = [
      {
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ reps: 10, weight: 60, completed: true }]
      },
      {
        name: 'Pull-Ups',
        muscleGroup: 'back',
        sets: [{ reps: 8, weight: 'BW', completed: true }]
      },
      {
        name: 'Overhead Press',
        muscleGroup: 'shoulders',
        sets: [{ reps: 8, weight: 40, completed: true }]
      }
    ];
    expect(determineWorkoutName(exercises)).toBe('Upper Body Workout');
  });

  it('names workout with up to 3 sorted categories when many are present', () => {
    const exercises = [
      {
        name: 'Stretching',
        muscleGroup: 'stretching',
        sets: [{ reps: 1, weight: 0, completed: true }]
      },
      {
        name: 'Crunches',
        muscleGroup: 'core',
        sets: [{ reps: 20, weight: 0, completed: true }]
      },
      {
        name: 'Barbell Curls',
        muscleGroup: 'arms',
        sets: [{ reps: 10, weight: 30, completed: true }]
      },
      {
        name: 'Calf Raises',
        muscleGroup: 'legs',
        sets: [{ reps: 15, weight: 50, completed: true }]
      }
    ];
    // hitGroups: Stretching, Core, Biceps (since barbell curls has curl/bicep in name and is arms), Legs.
    // So groups (insertion order) are: Stretching, Core, Biceps, Legs.
    // slice(0, 3) -> Stretching, Core, Biceps.
    // sort() -> Biceps, Core, Stretching.
    // returns "Biceps & Core & Stretching Workout"
    const name = determineWorkoutName(exercises);
    expect(name).toBe('Biceps & Core & Stretching Workout');
  });
});
