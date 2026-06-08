/**
 * useExerciseSearch.js
 *
 * Pure client-side filtering hook — zero Firestore reads.
 * exercises.json is a static import bundled at build time.
 *
 * Props (called as a hook, not a React component):
 *   equipmentList  string[]  — from user profile (onboarding)
 *   medicalFlags   string[]  — from user profile (onboarding)
 *   query          string    — raw search string from the input
 *
 * Returns:
 *   results        Exercise[]  — capped at 20 matching exercises
 *   isSearching    boolean     — true while debounce is pending
 *
 * Filter pipeline:
 *   1. Equipment gate  — every item in equipmentRequired must exist in equipmentList.
 *      Exception: exercises with an empty equipmentRequired ([]) are always equipment-eligible.
 *   2. Medical gate    — no overlap between medicallyRestricted and medicalFlags.
 *   3. Text match      — name or any alias includes sanitized query (case-insensitive).
 *   4. Debounce        — 200ms on the query before filtering runs.
 *   5. Cap             — maximum 20 results returned.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import exerciseBank from '../data/exercises.json';

// Import sanitizeString from the shared utility — note: the existing util uses
// the US English spelling ("sanitize"), so we match that exactly.
import { sanitizeString } from '../lib/firestoreUtils';

const MAX_RESULTS = 50;
const DEBOUNCE_MS = 200;

/**
 * Checks whether an exercise passes the equipment filter.
 * An exercise with no equipment requirements passes unconditionally.
 *
 * @param {string[]} required  — exercise.equipmentRequired
 * @param {string[]} available — user's equipmentList from profile
 * @returns {boolean}
 */
function passesEquipmentGate(required, available) {
  if (!required || required.length === 0) return true;
  const availableSet = new Set(available);
  return required.every((item) => availableSet.has(item));
}

/**
 * Checks whether an exercise passes the medical restriction filter.
 * Returns false if any restricted flag matches a user medical flag.
 *
 * @param {string[]} restricted — exercise.medicallyRestricted
 * @param {string[]} userFlags  — user's medicalFlags from profile
 * @returns {boolean}
 */
function passesMedicalGate(restricted, userFlags) {
  if (!restricted || restricted.length === 0) return true;
  if (!userFlags || userFlags.length === 0) return true;
  const flagSet = new Set(userFlags);
  return !restricted.some((flag) => flagSet.has(flag));
}

/**
 * Checks whether an exercise matches the text query.
 * Matches against name and all aliases, case-insensitively.
 *
 * @param {object} exercise — full exercise object
 * @param {string} cleanQuery — already-sanitized, lowercased query
 * @returns {boolean}
 */
function matchesQuery(exercise, cleanQuery) {
  if (!cleanQuery) return true; // empty query → show all eligible
  const nameLower = exercise.name.toLowerCase();
  if (nameLower.includes(cleanQuery)) return true;
  if (exercise.muscleGroup && exercise.muscleGroup.toLowerCase().includes(cleanQuery)) {
    return true;
  }
  if (exercise.aliases && exercise.aliases.some((a) => a.toLowerCase().includes(cleanQuery))) {
    return true;
  }
  return false;
}

/**
 * Maps onboarding equipment strings to exercise bank equipment keys.
 *
 * @param {string[]} equipmentList
 * @returns {string[]}
 */
function mapAvailableEquipment(equipmentList) {
  const mapped = new Set();
  equipmentList.forEach((item) => {
    if (!item) return;
    const normalized = item.trim();
    if (normalized === 'Barbell') mapped.add('barbell');
    else if (normalized === 'Dumbbells') mapped.add('dumbbells');
    else if (normalized === 'Cable Machine') mapped.add('cables');
    else if (normalized === 'Pull-up Bar') mapped.add('pullup_bar');
    else if (normalized === 'Leg Press') {
      mapped.add('leg_press');
      mapped.add('calf_raise');
    }
    else if (normalized === 'Leg Extension') mapped.add('leg_extension');
    else if (normalized === 'Leg Curl') mapped.add('leg_curl');
    else if (normalized === 'Ab Wheel') mapped.add('ab_roller');
    else if (['Flat Bench', 'Incline Bench', 'Decline Bench', 'Preacher Curl Bench'].includes(normalized)) {
      mapped.add('bench');
    }
    mapped.add(normalized.toLowerCase());
  });

  if (mapped.has('dumbbells') || mapped.has('barbell')) {
    mapped.add('calf_raise');
  }

  return Array.from(mapped);
}

/**
 * Maps onboarding medical restriction strings to exercise bank medical keys.
 *
 * @param {string[]} medicalFlags
 * @returns {string[]}
 */
function mapMedicalFlags(medicalFlags) {
  const mapped = new Set();
  medicalFlags.forEach((flag) => {
    if (!flag) return;
    const normalized = flag.trim();
    if (normalized === 'Shoulder Impingement' || normalized === 'Rotator Cuff Issue') {
      mapped.add('shoulder_impingement');
    } else if (normalized === 'Lower Back Issues' || normalized === 'Herniated Disc' || normalized === 'Hernia') {
      mapped.add('lower_back');
    } else if (normalized === 'Bad Knees') {
      mapped.add('bad_knees');
    } else if (normalized === 'Post-Surgery') {
      mapped.add('post_surgery');
    }
    mapped.add(normalized.toLowerCase().replace('-', '_').replace(' ', '_'));
  });
  return Array.from(mapped);
}

/**
 * useExerciseSearch
 *
 * @param {object} params
 * @param {string[]} params.equipmentList  — user's available equipment
 * @param {string[]} params.medicalFlags   — user's medical restriction flags
 * @param {string}   params.query          — raw search input string
 * @returns {{ results: object[], isSearching: boolean }}
 */
export function useExerciseSearch({ equipmentList = [], medicalFlags = [], query = '' }) {
  // Debounced query — isSearching is true while this lags behind raw query
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setIsSearching(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Map onboarding inputs to keys expected by exercise data bank
  const mappedEquipment = useMemo(() => mapAvailableEquipment(equipmentList), [equipmentList]);
  const mappedMedical = useMemo(() => mapMedicalFlags(medicalFlags), [medicalFlags]);

  // Apply text filter on debounced query directly on the entire exercise bank (no equipment/medical filters for manual search)
  const results = useMemo(() => {
    const cleanQuery = sanitizeString(debouncedQuery, 80).toLowerCase().trim();
    return exerciseBank.filter((ex) => matchesQuery(ex, cleanQuery)).slice(0, MAX_RESULTS);
  }, [debouncedQuery]);

  return { results, isSearching };
}
