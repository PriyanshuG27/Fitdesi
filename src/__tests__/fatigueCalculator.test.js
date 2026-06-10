import { describe, it, expect } from 'vitest';
import { getSecondaryMuscles, calculateMuscleFatigue } from '../utils/fatigueCalculator';

describe('getSecondaryMuscles', () => {
  it('correctly maps chest press/push variations to triceps and shoulders', () => {
    const benchPress = getSecondaryMuscles('barbell_bench_press', 'chest');
    expect(benchPress).toContainEqual({ muscle: 'triceps', category: 'arms', weight: 0.3 });
    expect(benchPress).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });

    const pushups = getSecondaryMuscles('incline_dumbbell_press', 'chest');
    expect(pushups).toContainEqual({ muscle: 'triceps', category: 'arms', weight: 0.3 });
    expect(pushups).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });
  });

  it('correctly maps chest flyes and pullovers', () => {
    const fly = getSecondaryMuscles('cable_chest_fly', 'chest');
    expect(fly).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });

    const pullover = getSecondaryMuscles('dumbbell_pullover', 'chest');
    expect(pullover).toContainEqual({ muscle: 'lats', category: 'back', weight: 0.2 });
    expect(pullover).toContainEqual({ muscle: 'triceps', category: 'arms', weight: 0.2 });
  });

  it('correctly maps shoulder presses, shrugs, and rear delt exercises', () => {
    const ohp = getSecondaryMuscles('overhead_press', 'shoulders');
    expect(ohp).toContainEqual({ muscle: 'triceps', category: 'arms', weight: 0.3 });
    expect(ohp).toContainEqual({ muscle: 'chest', category: 'chest', weight: 0.1 });

    const shrug = getSecondaryMuscles('dumbbell_shrugs', 'shoulders');
    expect(shrug).toContainEqual({ muscle: 'traps', category: 'back', weight: 0.4 });
    expect(shrug).toContainEqual({ muscle: 'forearms', category: 'arms', weight: 0.2 });

    const rearDelt = getSecondaryMuscles('reverse_pec_deck_fly', 'shoulders');
    expect(rearDelt).toContainEqual({ muscle: 'lats', category: 'back', weight: 0.2 });
    expect(rearDelt).toContainEqual({ muscle: 'traps', category: 'back', weight: 0.2 });
  });

  it('correctly maps back row/pulldown, deadlifts, and extensions', () => {
    const row = getSecondaryMuscles('barbell_row', 'back');
    expect(row).toContainEqual({ muscle: 'biceps', category: 'arms', weight: 0.3 });
    expect(row).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });

    const deadlift = getSecondaryMuscles('barbell_deadlift', 'back');
    expect(deadlift).toContainEqual({ muscle: 'glutes', category: 'legs', weight: 0.3 });
    expect(deadlift).toContainEqual({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
    expect(deadlift).toContainEqual({ muscle: 'quads', category: 'legs', weight: 0.2 });
  });

  it('correctly maps leg squats, lunges, and Romanian deadlifts', () => {
    const squat = getSecondaryMuscles('barbell_squat', 'legs');
    expect(squat).toContainEqual({ muscle: 'glutes', category: 'legs', weight: 0.3 });
    expect(squat).toContainEqual({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });

    const lunge = getSecondaryMuscles('dumbbell_lunge', 'legs');
    expect(lunge).toContainEqual({ muscle: 'calves', category: 'legs', weight: 0.1 });
    expect(lunge).toContainEqual({ muscle: 'abs', category: 'core', weight: 0.1 });

    const rdl = getSecondaryMuscles('romanian_deadlift', 'legs');
    expect(rdl).toContainEqual({ muscle: 'lower_back', category: 'back', weight: 0.3 });
    expect(rdl).toContainEqual({ muscle: 'glutes', category: 'legs', weight: 0.3 });
  });

  it('correctly maps arm isolation curls, extensions, and carries', () => {
    const curl = getSecondaryMuscles('barbell_curl', 'arms');
    expect(curl).toContainEqual({ muscle: 'forearms', category: 'arms', weight: 0.2 });

    const extension = getSecondaryMuscles('triceps_pushdown', 'arms');
    expect(extension).toContainEqual({ muscle: 'forearms', category: 'arms', weight: 0.1 });

    const farmer = getSecondaryMuscles('farmer_s_walk', 'arms');
    expect(farmer).toContainEqual({ muscle: 'traps', category: 'back', weight: 0.3 });
  });

  it('correctly maps core planks, knee raises, crunches, and crawls', () => {
    const plank = getSecondaryMuscles('forearm_plank', 'core');
    expect(plank).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.1 });

    const kneeRaise = getSecondaryMuscles('hanging_knee_raise', 'core');
    expect(kneeRaise).toContainEqual({ muscle: 'quads', category: 'legs', weight: 0.2 });

    const crunch = getSecondaryMuscles('kneeling_cable_crunch', 'core');
    expect(crunch).toContainEqual({ muscle: 'obliques', category: 'core', weight: 0.2 });

    const climber = getSecondaryMuscles('mountain_climbers', 'core');
    expect(climber).toContainEqual({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });
    expect(climber).toContainEqual({ muscle: 'triceps', category: 'arms', weight: 0.1 });
  });

  it('correctly maps legs isolation and complex hinge movements', () => {
    const thrust = getSecondaryMuscles('hip_thrust', 'legs');
    expect(thrust).toContainEqual({ muscle: 'hamstrings', category: 'legs', weight: 0.2 });

    const pullthrough = getSecondaryMuscles('cable_pull_through', 'legs');
    expect(pullthrough).toContainEqual({ muscle: 'lower_back', category: 'back', weight: 0.2 });

    const nordic = getSecondaryMuscles('nordic_curl', 'legs');
    expect(nordic).toContainEqual({ muscle: 'glutes', category: 'legs', weight: 0.2 });
  });

  it('correctly maps arm pressing compounds', () => {
    const dips = getSecondaryMuscles('tricep_dips', 'arms');
    expect(dips).toContainEqual({ muscle: 'chest', category: 'chest', weight: 0.3 });
  });
});

describe('calculateMuscleFatigue', () => {
  it('returns all zeros for empty session history', () => {
    const res = calculateMuscleFatigue([], 70);
    expect(res.general.chest).toBe(0);
    expect(res.general.legs).toBe(0);
    expect(res.detailed.front_delts_left).toBe(0);
  });

  it('calculates fatigue when workout sessions are present', () => {
    const dateToday = new Date().toISOString();
    const sessions = [
      {
        date: dateToday,
        exercises: [
          {
            exerciseKey: 'barbell_bench_press',
            muscleGroup: 'chest',
            sets: [
              { reps: 10, weight: 80, completed: true },
              { reps: 10, weight: 80, completed: true }
            ]
          }
        ]
      }
    ];

    const res = calculateMuscleFatigue(sessions, 70);
    // General chest should have positive fatigue
    expect(res.general.chest).toBeGreaterThan(0);
    // Triceps and shoulders (secondary) should also have positive fatigue
    expect(res.detailed.triceps_left).toBeGreaterThan(0);
    expect(res.detailed.front_delts_left).toBeGreaterThan(0);
  });
});
