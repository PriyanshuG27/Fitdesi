import { describe, it, expect } from 'vitest';
import { parseWorkoutText } from '../utils/nlpParser';

describe('nlpParser - Offline natural Language Logging', () => {
  it('should parse standard set notation with x', () => {
    const result = parseWorkoutText('bench press 60kg 3x10');
    expect(result).not.toBeNull();
    expect(result.exerciseKey).toBe('barbell_bench_press');
    expect(result.sets).toHaveLength(3);
    expect(result.sets[0].reps).toBe('10');
    expect(result.sets[0].weight).toBe('60');
  });

  it('should parse "sets of" phrase', () => {
    const result = parseWorkoutText('Dumbbell Bench Press 3 sets of 12 reps at 25kg');
    expect(result).not.toBeNull();
    expect(result.exerciseKey).toBe('dumbbell_bench_press');
    expect(result.sets).toHaveLength(3);
    expect(result.sets[0].reps).toBe('12');
    expect(result.sets[0].weight).toBe('25');
  });

  it('should fall back to bodyweight BW for bodyweight exercises', () => {
    const result = parseWorkoutText('pullups 3 sets of 10');
    expect(result).not.toBeNull();
    expect(result.exerciseKey).toBe('pull_ups');
    expect(result.sets).toHaveLength(3);
    expect(result.sets[0].reps).toBe('10');
    expect(result.sets[0].weight).toBe('BW');
  });

  it('should match clean names and ignore keywords in different order', () => {
    const result = parseWorkoutText('3 sets of 8 reps lateral raises 10');
    expect(result).not.toBeNull();
    expect(result.sets).toHaveLength(3);
    expect(result.sets[0].reps).toBe('8');
    expect(result.sets[0].weight).toBe('10');
  });

  it('should return null for invalid text or non-existent exercises', () => {
    const result = parseWorkoutText('xyz 3x10 50kg');
    expect(result).toBeNull();
  });
});
