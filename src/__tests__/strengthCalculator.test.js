import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  getMultipliersForExercise,
  calculateStrengthScore,
  calculateDetailedMuscleStrength,
  getStrengthTier,
  getIndividualMuscle
} from '../utils/strengthCalculator';

describe('strengthCalculator', () => {
  describe('getIndividualMuscle', () => {
    it('correctly maps various groups to individual muscles', () => {
      expect(getIndividualMuscle('db_bench_press', 'chest')).toBe('chest');
      expect(getIndividualMuscle('db_lateral_raise', 'shoulders')).toBe('shoulders');
      expect(getIndividualMuscle('russian_twist', 'core')).toBe('obliques');
      expect(getIndividualMuscle('crunches', 'core')).toBe('abs');
      expect(getIndividualMuscle('shrugs', 'back')).toBe('traps');
      expect(getIndividualMuscle('deadlift', 'back')).toBe('lower_back');
      expect(getIndividualMuscle('lat_pulldown', 'back')).toBe('lats');
      expect(getIndividualMuscle('skull_crusher', 'arms')).toBe('triceps');
      expect(getIndividualMuscle('wrist_curl', 'arms')).toBe('forearms');
      expect(getIndividualMuscle('bicep_curl', 'arms')).toBe('biceps');
      expect(getIndividualMuscle('calf_raise', 'legs')).toBe('calves');
      expect(getIndividualMuscle('romanian_deadlift', 'legs')).toBe('hamstrings');
      expect(getIndividualMuscle('hip_thrust', 'legs')).toBe('glutes');
      expect(getIndividualMuscle('barbell_squat', 'legs')).toBe('quads');
      expect(getIndividualMuscle('unknown_exercise', 'unknown_group')).toBeNull();
    });
  });
  describe('estimate1RM', () => {
    it('returns 0 for bodyweight or missing values', () => {
      expect(estimate1RM('BW', 10)).toBe(0);
      expect(estimate1RM(null, 5)).toBe(0);
    });

    it('returns raw weight for 1 rep or less', () => {
      expect(estimate1RM(100, 1)).toBe(100);
      expect(estimate1RM(100, 0)).toBe(100);
    });

    it('correctly applies Epley formula for multiple reps', () => {
      // 100 * (1 + 10 / 30) = 133.33
      expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    });
  });

  describe('getMultipliersForExercise', () => {
    it('returns generic multipliers for standard exercises', () => {
      const mult = getMultipliersForExercise('generic_lift');
      expect(mult.intermediate).toBe(0.60);
    });

    it('resolves key lifts like bench press and squat', () => {
      const bench = getMultipliersForExercise('barbell_bench_press');
      expect(bench.intermediate).toBe(1.00);

      const squat = getMultipliersForExercise('barbell_squat');
      expect(squat.intermediate).toBe(1.25);
    });

    it('resolves key lifts like overhead press, pullups, and lat pulldowns', () => {
      const ohp = getMultipliersForExercise('overhead_press');
      expect(ohp.intermediate).toBe(0.65);

      const pullup = getMultipliersForExercise('pull_up');
      expect(pullup.intermediate).toBe(0.45);
    });

    it('scales upper and lower body multipliers for females', () => {
      const maleBench = getMultipliersForExercise('barbell_bench_press', 'male');
      const femaleBench = getMultipliersForExercise('barbell_bench_press', 'female');
      expect(femaleBench.intermediate).toBeCloseTo(maleBench.intermediate * 0.65, 3);

      const maleSquat = getMultipliersForExercise('barbell_squat', 'male');
      const femaleSquat = getMultipliersForExercise('barbell_squat', 'female');
      expect(femaleSquat.intermediate).toBeCloseTo(maleSquat.intermediate * 0.80, 3);
    });

    it('halves standard multipliers for isolation exercises', () => {
      const curl = getMultipliersForExercise('barbell_curl');
      // Generic base [0.25, 0.40, 0.60, 0.85, 1.10] halved to [0.125, 0.20, 0.30, 0.425, 0.55]
      expect(curl.intermediate).toBe(0.30);
    });
  });

  describe('calculateStrengthScore', () => {
    const multipliers = {
      beginner: 10,
      novice: 20,
      intermediate: 30,
      advanced: 45,
      elite: 60
    };

    it('returns 0 for ratio <= 0', () => {
      expect(calculateStrengthScore(0, multipliers)).toBe(0);
      expect(calculateStrengthScore(-5, multipliers)).toBe(0);
    });

    it('interpolates ratio below beginner (0-20 score)', () => {
      expect(calculateStrengthScore(5, multipliers)).toBe(10);
    });

    it('interpolates ratio between beginner and novice (20-40 score)', () => {
      expect(calculateStrengthScore(15, multipliers)).toBe(30);
    });

    it('interpolates ratio between novice and intermediate (40-60 score)', () => {
      expect(calculateStrengthScore(25, multipliers)).toBe(50);
    });

    it('interpolates ratio between intermediate and advanced (60-75 score)', () => {
      expect(calculateStrengthScore(37.5, multipliers)).toBe(68);
    });

    it('interpolates ratio between advanced and elite (75-90 score)', () => {
      expect(calculateStrengthScore(52.5, multipliers)).toBe(83);
    });

    it('interpolates ratio above elite (90-100 score)', () => {
      expect(calculateStrengthScore(70, multipliers)).toBe(96);
    });
  });

  describe('calculateDetailedMuscleStrength', () => {
    it('handles empty PRs', () => {
      const result = calculateDetailedMuscleStrength([], { weight: 80 });
      expect(result.general.chest).toBe(28); // baseline for chest
      expect(result.individual.chest).toBe(28);
    });

    it('correctly compiles scores for muscles based on logged PRs', () => {
      const prs = [
        {
          exerciseKey: 'barbell_bench_press',
          exerciseName: 'Barbell Bench Press',
          weight: 80,
          reps: 5
        }
      ];
      const result = calculateDetailedMuscleStrength(prs, { weight: 80, gender: 'male' });
      expect(result.individual.chest).toBeGreaterThan(0);
      expect(result.general.chest).toBeGreaterThan(0);
    });

    it('handles dumbbell and cable exercise doubling', () => {
      const prs = [
        {
          exerciseKey: 'dumbbell_bench_press',
          weight: 20,
          reps: 10
        },
        {
          exerciseKey: 'cable_crossover',
          weight: 15,
          reps: 10
        }
      ];
      // Bodyweight 80, dumbbell bench press weight of 20 is doubled to 40
      const result = calculateDetailedMuscleStrength(prs, { weight: 80 });
      expect(result.general.chest).toBeGreaterThan(28); // higher than baseline
    });

    it('handles bodyweight (BW) exercises', () => {
      const prs = [
        {
          exerciseKey: 'pull_ups',
          weight: 'BW',
          reps: 8
        }
      ];
      const result = calculateDetailedMuscleStrength(prs, { weight: 80 });
      expect(result.general.back).toBeGreaterThan(32); // higher than baseline
    });

    it('returns early if est1RM <= 0 and weight is not BW', () => {
      const prs = [
        {
          exerciseKey: 'barbell_bench_press',
          weight: 0,
          reps: 0
        }
      ];
      const result = calculateDetailedMuscleStrength(prs, { weight: 80 });
      expect(result.general.chest).toBe(28); // matches baseline
    });

    it('handles exercises not in the bank with fallbacks', () => {
      const prs = [
        {
          exerciseKey: 'some_crazy_new_exercise',
          weight: 100,
          reps: 5
        }
      ];
      const result = calculateDetailedMuscleStrength(prs, { weight: 80 });
      // should run and not crash, fallback to generic
      expect(result).toBeDefined();
    });
  });


  describe('getStrengthTier', () => {
    it('returns correct tier levels for all scores', () => {
      expect(getStrengthTier(95).label).toBe('LEGENDARY');
      expect(getStrengthTier(80).label).toBe('EPIC');
      expect(getStrengthTier(65).label).toBe('ADVANCED');
      expect(getStrengthTier(45).label).toBe('INTERMEDIATE');
      expect(getStrengthTier(20).label).toBe('BEGINNER');
    });
  });
});
