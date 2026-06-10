import { describe, it, expect } from 'vitest';
import { getBWEffectiveFraction } from '../utils/bwEffectiveLoad';

describe('getBWEffectiveFraction', () => {
  it('correctly resolves exact key fractions', () => {
    expect(getBWEffectiveFraction('push_ups')).toBe(0.64);
    expect(getBWEffectiveFraction('chest_dips')).toBe(0.75);
    expect(getBWEffectiveFraction('pull_ups')).toBe(1.00);
    expect(getBWEffectiveFraction('bodyweight_squat')).toBe(0.85);
    expect(getBWEffectiveFraction('plank')).toBe(0.69);
  });

  it('correctly resolves pattern fallbacks for similar exercises', () => {
    expect(getBWEffectiveFraction('handstand_push_up_variation')).toBe(0.64); // matches push_up pattern
    expect(getBWEffectiveFraction('weighted_chin_up_extra')).toBe(1.00); // matches chin_up pattern
    expect(getBWEffectiveFraction('isometric_wall_sit_squat')).toBe(0.85); // matches squat pattern
  });

  it('returns default fallback for unrecognized bodyweight exercises', () => {
    expect(getBWEffectiveFraction('unknown_bodyweight_movement')).toBe(0.70);
    expect(getBWEffectiveFraction(null)).toBe(0.70);
  });
});
