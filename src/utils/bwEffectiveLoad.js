/**
 * bwEffectiveLoad.js
 *
 * Effective bodyweight percentage per exercise, derived from published biomechanics
 * research (force plate and EMG studies).
 *
 * References:
 *  - Suprak et al. (2011): push-up load distribution — 64% BW standard, 69% wide, 53% incline, 74% decline
 *  - Dips / pull-ups: near-full body suspension ≈ 75–100% BW
 *  - Squats / lunges: Fortenbaugh et al. ground reaction data ≈ 85% BW
 *  - Hanging leg raise: only lower-body segment mass ≈ 17–22% BW
 *  - Plank: Winter (2009) centre-of-mass analysis ≈ 69% BW
 *
 * Usage:
 *   import { getBWEffectiveFraction } from './bwEffectiveLoad';
 *   const effectiveKg = getBWEffectiveFraction('push_ups') * bodyweightKg;
 */

/**
 * Exact key → fraction of bodyweight that is mechanically loaded.
 * All values ∈ (0, 1]. Default fallback = 0.70 (conservative mid-estimate).
 */
const BW_FRACTION_BY_KEY = {
  // ── Upper body push ────────────────────────────────────────────────────────
  push_ups:             0.64,
  wide_grip_push_ups:   0.69,
  incline_push_ups:     0.53,   // feet lower → less load on arms
  decline_push_ups:     0.74,   // feet elevated → more upper-chest load
  diamond_push_ups:     0.64,
  archer_push_ups:      0.64,
  handstand_push_ups:   1.00,   // near-full BW overhead
  plyometric_push_ups:  0.64,
  clapping_push_ups:    0.64,
  deficit_push_ups:     0.64,
  weighted_push_ups:    0.64,   // added weight handled separately as a normal weight set

  // ── Dips ──────────────────────────────────────────────────────────────────
  chest_dips:           0.75,
  weighted_chest_dips:  0.75,
  tricep_dips:          0.75,
  weighted_tricep_dips: 0.75,

  // ── Upper body pull ───────────────────────────────────────────────────────
  pull_ups:                    1.00,
  chin_ups:                    1.00,
  neutral_grip_pull_ups:       1.00,
  wide_grip_pull_ups:          1.00,
  close_grip_pull_ups:         1.00,
  behind_the_neck_pull_ups:    1.00,
  weighted_pull_ups:           1.00,
  weighted_chin_ups:           1.00,
  inverted_row:                0.70,
  australian_pull_ups:         0.70,
  archer_pull_ups:             1.00,

  // ── Lower body ────────────────────────────────────────────────────────────
  bodyweight_squat:     0.85,
  jump_squat:           0.85,
  pistol_squat:         0.85,   // same total load, single leg
  lunge:                0.85,
  walking_lunges:       0.85,
  reverse_lunge:        0.85,
  lateral_lunge:        0.85,
  step_up:              0.85,
  box_jump:             0.85,
  glute_bridge:         0.50,   // hip hinge, upper body supported
  single_leg_glute_bridge: 0.50,
  nordic_hamstring_curl: 0.65,
  wall_sit:             0.70,   // isometric

  // ── Core ──────────────────────────────────────────────────────────────────
  plank:                   0.69,
  side_plank:              0.69,
  hanging_leg_raise:       0.20,   // only lower-body segment
  hanging_knee_raise:      0.15,
  dragon_flag:             0.80,   // nearly full BW horizontal lever
  ab_wheel_rollout:        0.60,
  mountain_climbers:       0.60,
  burpees:                 0.65,
  tuck_crunch:             0.15,
  bicycle_crunch:          0.15,
  sit_ups:                 0.20,

  // ── Gymnastics / calisthenics ─────────────────────────────────────────────
  muscle_up:            1.00,
  front_lever:          1.00,
  back_lever:           1.00,
  human_flag:           1.00,
  l_sit:                1.00,
};

// ── Pattern fallbacks (for keys not in the exact map) ──────────────────────
// Checked in order — first match wins.
const BW_FRACTION_BY_PATTERN = [
  { test: (k) => k.includes('pull_up') || k.includes('chin_up'),   fraction: 1.00 },
  { test: (k) => k.includes('push_up'),                            fraction: 0.64 },
  { test: (k) => k.includes('dip'),                                fraction: 0.75 },
  { test: (k) => k.includes('plank'),                              fraction: 0.69 },
  { test: (k) => k.includes('squat') || k.includes('lunge'),       fraction: 0.85 },
  { test: (k) => k.includes('bridge') || k.includes('thrust'),     fraction: 0.50 },
  { test: (k) => k.includes('hanging') || k.includes('leg_raise'), fraction: 0.20 },
  { test: (k) => k.includes('burpee'),                             fraction: 0.65 },
  { test: (k) => k.includes('climb'),                              fraction: 0.60 },
];

const DEFAULT_FRACTION = 0.70;  // conservative fallback

/**
 * Returns the fraction of bodyweight that is effective load for a given exercise key.
 * @param {string} exerciseKey
 * @returns {number}  0.0–1.0
 */
export function getBWEffectiveFraction(exerciseKey) {
  const key = (exerciseKey || '').toLowerCase();

  // Exact match first
  if (BW_FRACTION_BY_KEY[key] !== undefined) {
    return BW_FRACTION_BY_KEY[key];
  }

  // Pattern fallback
  for (const { test, fraction } of BW_FRACTION_BY_PATTERN) {
    if (test(key)) return fraction;
  }

  return DEFAULT_FRACTION;
}
