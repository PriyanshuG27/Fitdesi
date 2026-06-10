/**
 * fatigueCalculator.js
 *
 * Implements EWMA-based Acute:Chronic Workload Ratio (ACWR) for muscle-level fatigue.
 *
 * WHY EWMA OVER SIMPLE AVERAGE?
 * ─────────────────────────────
 * Simple average treats a session from 28 days ago the same as yesterday.
 * EWMA (Exponentially Weighted Moving Average) decays older sessions — recent training
 * affects the score more, which matches how the body actually recovers.
 *
 * Reference: Hulin et al. (2016) "Spikes in acute workload are associated with increased injury risk"
 *            British Journal of Sports Medicine — EWMA-ACWR.
 *
 * MODEL PARAMETERS:
 *   Acute  window: 7 days  (λ_a = 2/8  = 0.25)   ← "how hard have you trained recently?"
 *   Chronic window: 28 days (λ_c = 2/29 ≈ 0.068)  ← "what is your baseline fitness?"
 *
 * ACWR = EWMAacute / EWMAchronic
 *   < 0.8  : Under-training   → show as low fatigue / fresh
 *   0.8–1.3: Sweet spot        → optimal training stimulus
 *   1.3–1.5: Elevated load     → watch out
 *   > 1.5  : Danger zone       → overreached → capped at 150%
 *
 * VOLUME LOAD (instead of raw set count):
 *   volumeLoad = sets × reps × effectiveWeight
 *   For BW exercises: effectiveWeight = bodyweightKg × getBWEffectiveFraction(key)
 *   This is far more meaningful than set count — 3 heavy squat sets ≠ 3 lateral raise sets.
 */

import { getIndividualMuscle as _getIndividualMuscle } from './strengthCalculator';
import { getBWEffectiveFraction } from './bwEffectiveLoad';

// ── EWMA decay constants ──────────────────────────────────────────────────────
const LAMBDA_ACUTE   = 2 / (7  + 1);   // 7-day  EWMA
const LAMBDA_CHRONIC = 2 / (28 + 1);   // 28-day EWMA
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Muscle group definitions ──────────────────────────────────────────────────
const GENERAL_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
const INDIVIDUAL_GROUPS = [
  'chest', 'traps', 'lats', 'lower_back', 'shoulders',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques',
  'quads', 'hamstrings', 'glutes', 'calves',
  'rear_delts',  // independent from front_delts
  'tibialis',    // independent from calves (shin muscle)
];

/**
 * Computes a 0–150 fatigue score per muscle using EWMA-ACWR on volume load.
 *
 * @param {Array}  sessions       — loaded session objects with `exercises` array
 * @param {number} bodyweightKg   — user's bodyweight (default 70kg if not provided)
 * @returns {{ general, detailed, individual }}
 */
export function calculateMuscleFatigue(sessions = [], bodyweightKg = 70) {
  const now = Date.now();
  const bw  = parseFloat(bodyweightKg) || 70;

  // ── Step 1: Build daily volume load per muscle over last 28 days ────────────
  // We bucket sessions into discrete days (day 0 = today, day 27 = 28 days ago).
  // This lets us apply EWMA day-by-day without per-session noise.

  const DAYS = 28;
  const cutoff = now - DAYS * MS_PER_DAY;

  // { general: { chest: [0..0, sets_day27, ..., sets_day0] }, individual: {...} }
  const dailyVolumeGeneral    = {};
  const dailyVolumeIndividual = {};
  GENERAL_GROUPS.forEach(m    => { dailyVolumeGeneral[m]    = new Array(DAYS).fill(0); });
  INDIVIDUAL_GROUPS.forEach(m => { dailyVolumeIndividual[m] = new Array(DAYS).fill(0); });

  for (const s of sessions) {
    // ── Null-safe date parsing (handles Firestore Timestamp, ISO string, and undefined) ──
    let sTime;
    try {
      sTime = s.date?.toDate
        ? s.date.toDate().getTime()
        : new Date(s.date || s.dateString || null).getTime();
      if (!sTime || isNaN(sTime) || sTime > now || sTime < cutoff) continue;
    } catch {
      continue; // silently skip sessions with unparseable dates
    }

    // Which day bucket? Day 0 = today, day 27 = 28 days ago
    const daysAgo = Math.floor((now - sTime) / MS_PER_DAY);
    const dayIdx  = Math.min(daysAgo, DAYS - 1);

    for (const ex of (s.exercises || [])) {
      const completedSets = (ex.sets || []).filter(st => st.done || st.completed);
      if (completedSets.length === 0) continue;

      // ── Map exercise to muscle categories ──────────────────────────────────
      const muscle = (ex.muscleGroup || '').toLowerCase();
      let category = null;

      if      (muscle.includes('chest') || muscle.includes('pectoral'))                                                       category = 'chest';
      else if (muscle.includes('back')  || muscle.includes('lats') || muscle.includes('traps'))                               category = 'back';
      else if (muscle.includes('shoulder') || muscle.includes('deltoid'))                                                     category = 'shoulders';
      else if (muscle.includes('arm') || muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('forearm')) category = 'arms';
      else if (muscle.includes('leg') || muscle.includes('quad') || muscle.includes('hamstring') || muscle.includes('calf') || muscle.includes('glute')) category = 'legs';
      else if (muscle.includes('core') || muscle.includes('abs') || muscle.includes('abdominal'))                            category = 'core';

      if (!category) continue;

      // ── Compute volume load for this exercise ──────────────────────────────
      const exKey = ex.exerciseKey || ex.key || '';
      let exVolumeLoad = 0;
      for (const st of completedSets) {
        const reps = parseInt(st.reps, 10) || 0;
        let effectiveWeight;
        if (st.weight === 'BW') {
          effectiveWeight = bw * getBWEffectiveFraction(exKey);
        } else {
          effectiveWeight = parseFloat(st.weight) || 0;
        }
        exVolumeLoad += effectiveWeight * reps;
      }

      if (exVolumeLoad <= 0) continue;

      // ── Accumulate into daily buckets ──────────────────────────────────────
      dailyVolumeGeneral[category][dayIdx] += exVolumeLoad;

      const indivMuscle = _getIndividualMuscleExtended(exKey, category);
      if (indivMuscle && dailyVolumeIndividual[indivMuscle] !== undefined) {
        dailyVolumeIndividual[indivMuscle][dayIdx] += exVolumeLoad;
      }

      // Secondary muscle attribution (credits 30% fatigue workload)
      const secondaries = getSecondaryMuscles(exKey, category);
      for (const sec of secondaries) {
        if (dailyVolumeGeneral[sec.category] !== undefined) {
          dailyVolumeGeneral[sec.category][dayIdx] += exVolumeLoad * sec.weight;
        }
        if (dailyVolumeIndividual[sec.muscle] !== undefined) {
          dailyVolumeIndividual[sec.muscle][dayIdx] += exVolumeLoad * sec.weight;
        }
      }
    }
  }

  // ── Step 2: Apply EWMA forward from day 27 → day 0 ─────────────────────────
  // day 27 = oldest (28 days ago), day 0 = today
  // We iterate oldest → newest so EWMA accumulates naturally.
  function computeEWMA(dailyArray) {
    // dailyArray[0] = today, dailyArray[27] = 28 days ago
    // Reverse to oldest-first for EWMA iteration
    const reversed = [...dailyArray].reverse(); // index 0 = 28 days ago

    let ewmaAcute   = 0;
    let ewmaAcuteCount = 0; // track if we have any data before dividing
    let ewmaChronic = 0;

    for (let i = 0; i < reversed.length; i++) {
      const vl = reversed[i];
      ewmaChronic = LAMBDA_CHRONIC * vl + (1 - LAMBDA_CHRONIC) * ewmaChronic;
      // Acute window: only last 7 days (indices 21-27 in reversed = days 0-6 ago)
      if (i >= DAYS - 7) {
        ewmaAcute = LAMBDA_ACUTE * vl + (1 - LAMBDA_ACUTE) * ewmaAcute;
        ewmaAcuteCount++;
      }
    }

    return { ewmaAcute, ewmaChronic };
  }

  function acwrToFatigue(ewmaAcute, ewmaChronic) {
    // Dampen the ACWR calculation to prevent division-by-zero or explosion for low chronic baselines.
    // We enforce a chronic floor of 1000 volume load.
    const effectiveChronic = Math.max(1000, ewmaChronic);
    const acwr = ewmaAcute / effectiveChronic;
    
    // Map ACWR to 0-150 display score:
    // With max(1000, ewmaChronic), a fresh chest session of 6 sets (e.g. 1200 acute load)
    // gives acwr = 1.2, which maps to: (1.2 / 2.5) * 100 = 48% fatigue.
    // A 10-set session (2000 acute load) gives acwr = 2.0, mapping to 80% fatigue.
    const score = Math.round((acwr / 2.5) * 100);
    return Math.min(150, Math.max(0, score));
  }

  // ── Step 3: Compute fatigue scores ─────────────────────────────────────────
  const generalFatigue = {};
  for (const m of GENERAL_GROUPS) {
    const { ewmaAcute, ewmaChronic } = computeEWMA(dailyVolumeGeneral[m]);
    generalFatigue[m] = acwrToFatigue(ewmaAcute, ewmaChronic);
  }

  const individualFatigue = {};
  for (const m of INDIVIDUAL_GROUPS) {
    const { ewmaAcute, ewmaChronic } = computeEWMA(dailyVolumeIndividual[m]);
    individualFatigue[m] = acwrToFatigue(ewmaAcute, ewmaChronic);
  }

  // ── Step 4: Map to SVG mannequin paths ─────────────────────────────────────
  const detailedFatigue = {
    // Front
    chest_left:         individualFatigue.chest,
    chest_right:        individualFatigue.chest,
    front_delts_left:   individualFatigue.shoulders,
    front_delts_right:  individualFatigue.shoulders,
    biceps_left:        individualFatigue.biceps,
    biceps_right:       individualFatigue.biceps,
    forearm_left:       individualFatigue.forearms,
    forearm_right:      individualFatigue.forearms,
    abs:                individualFatigue.abs,
    obliques_left:      individualFatigue.obliques,
    obliques_right:     individualFatigue.obliques,
    quads_left:         individualFatigue.quads,
    quads_right:        individualFatigue.quads,
    calves_left_front:  individualFatigue.calves,
    calves_right_front: individualFatigue.calves,
    tibialis_left:      individualFatigue.tibialis,
    tibialis_right:     individualFatigue.tibialis,
    // Back
    traps:              individualFatigue.traps,
    lats_left:          individualFatigue.lats,
    lats_right:         individualFatigue.lats,
    rear_delts_left:    individualFatigue.rear_delts,
    rear_delts_right:   individualFatigue.rear_delts,
    triceps_left:       individualFatigue.triceps,
    triceps_right:      individualFatigue.triceps,
    lower_back:         individualFatigue.lower_back,
    glutes_left:        individualFatigue.glutes,
    glutes_right:       individualFatigue.glutes,
    hamstrings_left:    individualFatigue.hamstrings,
    hamstrings_right:   individualFatigue.hamstrings,
    calves_left_back:   individualFatigue.calves,
    calves_right_back:  individualFatigue.calves,
  };

  return {
    general:    generalFatigue,
    individual: individualFatigue,
    detailed:   detailedFatigue,
  };
}

// ── Extended individual muscle resolver ───────────────────────────────────────
function _getIndividualMuscleExtended(exerciseKey, category) {
  const name = (exerciseKey || '').toLowerCase();

  // Rear delts: rows, reverse flies, face pulls
  if (
    name.includes('row') ||
    name.includes('reverse_fly') || name.includes('reverse fly') ||
    name.includes('face_pull')   || name.includes('face pull') ||
    name.includes('rear_delt')   || name.includes('rear delt')
  ) {
    return 'rear_delts';
  }

  // Tibialis: dorsiflexor (shin), not a calf
  if (name.includes('tibialis') || name.includes('toe_raise') || name.includes('toe raise')) {
    return 'tibialis';
  }

  return _getIndividualMuscle(exerciseKey, category);
}

// ── Secondary muscle resolver ────────────────────────────────────────────────
export function getSecondaryMuscles(exerciseKey, category) {
  const name = (exerciseKey || '').toLowerCase();
  const secondaries = [];

  if (category === 'chest') {
    if (name.includes('press') || name.includes('pushup') || name.includes('push_up') || name.includes('dip')) {
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });
    } else if (name.includes('fly') || name.includes('crossover') || name.includes('pec_deck') || name.includes('pec deck')) {
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });
    } else if (name.includes('pullover')) {
      secondaries.push({ muscle: 'lats', category: 'back', weight: 0.2 });
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.2 });
    }
  } else if (category === 'shoulders') {
    if (name.includes('press') || name.includes('ohp') || name.includes('military') || name.includes('arnold') || name.includes('handstand')) {
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.3 });
      secondaries.push({ muscle: 'chest', category: 'chest', weight: 0.1 });
    } else if (name.includes('row') || name.includes('upright') || name.includes('face_pull') || name.includes('face pull')) {
      secondaries.push({ muscle: 'biceps', category: 'arms', weight: 0.2 });
      secondaries.push({ muscle: 'lats', category: 'back', weight: 0.2 });
      secondaries.push({ muscle: 'traps', category: 'back', weight: 0.2 });
    } else if (name.includes('shrug')) {
      secondaries.push({ muscle: 'traps', category: 'back', weight: 0.4 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.2 });
    } else if (name.includes('rear') || name.includes('bent') || name.includes('reverse') || name.includes('face_pull') || name.includes('face pull')) {
      secondaries.push({ muscle: 'lats', category: 'back', weight: 0.2 });
      secondaries.push({ muscle: 'traps', category: 'back', weight: 0.2 });
    } else if (name.includes('front')) {
      secondaries.push({ muscle: 'chest', category: 'chest', weight: 0.1 });
    }
  } else if (category === 'back') {
    if (name.includes('row')) {
      secondaries.push({ muscle: 'biceps', category: 'arms', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 }); // rear delts
      secondaries.push({ muscle: 'traps', category: 'back', weight: 0.2 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.1 });
    } else if (name.includes('pull') || name.includes('chin') || name.includes('lat') || name.includes('pulldown')) {
      secondaries.push({ muscle: 'biceps', category: 'arms', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 }); // rear delts
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.1 });
    } else if (name.includes('deadlift') || name.includes('rack_pull') || name.includes('rack pull')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'quads', category: 'legs', weight: 0.2 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.2 });
    } else if (name.includes('extension') || name.includes('good_morning') || name.includes('good morning')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
    } else if (name.includes('shrug')) {
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.2 });
    }
  } else if (category === 'legs') {
    if (name.includes('squat') || name.includes('press') || name.includes('hack') || name.includes('lunge') || name.includes('step') || name.includes('split') || name.includes('thruster')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
      if (name.includes('lunge') || name.includes('split') || name.includes('step')) {
        secondaries.push({ muscle: 'calves', category: 'legs', weight: 0.1 });
        secondaries.push({ muscle: 'abs', category: 'core', weight: 0.1 });
      } else {
        secondaries.push({ muscle: 'calves', category: 'legs', weight: 0.1 });
      }
    } else if (name.includes('deadlift') || name.includes('rdl')) {
      secondaries.push({ muscle: 'lower_back', category: 'back', weight: 0.3 });
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.2 });
    } else if (name.includes('thrust') || name.includes('bridge') || name.includes('kickback')) {
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.2 });
      secondaries.push({ muscle: 'lower_back', category: 'back', weight: 0.1 });
    } else if (name.includes('pull_through') || name.includes('pull through')) {
      secondaries.push({ muscle: 'lower_back', category: 'back', weight: 0.2 });
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
    } else if (name.includes('nordic') || name.includes('glute_ham') || name.includes('glute ham')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.2 });
      secondaries.push({ muscle: 'lower_back', category: 'back', weight: 0.1 });
    }
  } else if (category === 'arms') {
    if (name.includes('curl')) {
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.2 });
    } else if (name.includes('extension') || name.includes('pushdown') || name.includes('skull') || name.includes('kickback') || name.includes('ext')) {
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.1 });
    } else if (name.includes('press') || name.includes('dip') || name.includes('pushup') || name.includes('push_up')) {
      secondaries.push({ muscle: 'chest', category: 'chest', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });
    } else if (name.includes('farmer')) {
      secondaries.push({ muscle: 'traps', category: 'back', weight: 0.3 });
      secondaries.push({ muscle: 'calves', category: 'legs', weight: 0.1 });
    }
  } else if (category === 'core') {
    if (name.includes('plank') || name.includes('rollout')) {
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.1 });
      secondaries.push({ muscle: 'lower_back', category: 'back', weight: 0.1 });
    } else if (name.includes('raise') || name.includes('toes') || name.includes('flag') || name.includes('flutter') || name.includes('scissor')) {
      secondaries.push({ muscle: 'quads', category: 'legs', weight: 0.2 });
      secondaries.push({ muscle: 'forearms', category: 'arms', weight: 0.1 });
    } else if (name.includes('crunch') || name.includes('sit_up') || name.includes('sit up') || name.includes('situp') || name.includes('woodchopper') || name.includes('chopper') || name.includes('twist') || name.includes('rotation') || name.includes('russian')) {
      secondaries.push({ muscle: 'obliques', category: 'core', weight: 0.2 });
    } else if (name.includes('climber') || name.includes('crawl')) {
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.1 });
      secondaries.push({ muscle: 'quads', category: 'legs', weight: 0.1 });
    }
  }

  return secondaries;
}
