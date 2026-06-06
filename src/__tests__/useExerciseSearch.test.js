/**
 * useExerciseSearch.test.js
 *
 * Pure unit tests for the useExerciseSearch hook.
 * Zero Firestore reads — the hook is client-side only (exercises.json static import).
 *
 * Filter pipeline under test:
 *   1. Equipment gate   — every required item must exist in user's list
 *   2. Medical gate     — no overlap between restricted flags and user's flags
 *   3. Text match       — name or alias includes query (case-insensitive)
 *   4. Debounce         — 200ms timeout before filter runs
 *   5. Cap              — maximum 20 results
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExerciseSearch } from '../hooks/useExerciseSearch';

// The hook imports sanitizeString from firestoreUtils which imports from lib/firebase.
// Load the firebase mock so that import chain resolves without error.
import '../__mocks__/firebase';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders useExerciseSearch, waits for the 200ms debounce to fire,
 * and returns the settled results array.
 */
async function getResults({ equipmentList = [], medicalFlags = [], query = '' } = {}) {
  vi.useFakeTimers();
  const { result } = renderHook(() =>
    useExerciseSearch({ equipmentList, medicalFlags, query })
  );
  // Advance past the 200ms debounce
  await act(async () => { vi.advanceTimersByTime(250); });
  vi.useRealTimers();
  return result.current.results;
}

// ─── Equipment filtering ──────────────────────────────────────────────────────

describe('useExerciseSearch — equipment filter', () => {
  it('filters OUT exercises requiring equipment not in user list', async () => {
    // User has only dumbbells + bench — no barbell
    const results = await getResults({
      equipmentList: ['Dumbbells', 'Flat Bench'],
    });

    const names = results.map((e) => e.name);
    // Barbell Bench Press requires barbell → must be absent
    expect(names).not.toContain('Barbell Bench Press');
    // Dumbbell Bench Press requires dumbbells + bench → must be present
    expect(names).toContain('Dumbbell Bench Press');
  });

  it('always includes exercises with no equipment requirements regardless of user list', async () => {
    // User has no equipment at all
    const results = await getResults({ equipmentList: [] });

    const names = results.map((e) => e.name);
    // Push-Ups has equipmentRequired: [] → always eligible
    expect(names).toContain('Push-Ups');
  });

  it('includes barbell exercises when user has Barbell in their list', async () => {
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
    });

    const names = results.map((e) => e.name);
    expect(names).toContain('Barbell Bench Press');
    expect(names).toContain('Overhead Press');
  });
});

// ─── Medical filtering ────────────────────────────────────────────────────────

describe('useExerciseSearch — medical filter', () => {
  it('filters OUT exercises restricted for user\'s medical flags', async () => {
    // "Shoulder Impingement" maps to "shoulder_impingement"
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench', 'Pull-up Bar'],
      medicalFlags:  ['Shoulder Impingement'],
    });

    const names = results.map((e) => e.name);
    // All these have medicallyRestricted: ["shoulder_impingement"]
    expect(names).not.toContain('Barbell Bench Press');
    expect(names).not.toContain('Overhead Press');
    expect(names).not.toContain('Pull-Ups'); // also has shoulder_impingement
  });

  it('includes exercises NOT in user\'s restricted flags', async () => {
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      medicalFlags:  ['Bad Knees'],  // maps to bad_knees
    });

    const names = results.map((e) => e.name);
    // Barbell Bench Press is restricted for shoulder, not bad_knees → still present
    expect(names).toContain('Barbell Bench Press');
  });

  it('passes all exercises through if user has no medical flags', async () => {
    const allResults = await getResults({
      equipmentList: ['Barbell', 'Flat Bench', 'Dumbbells'],
      medicalFlags:  [],
    });

    const names = allResults.map((e) => e.name);
    // Exercises restricted for any flag are all included because user has no flags
    expect(names).toContain('Barbell Bench Press');
    expect(names).toContain('Overhead Press');
  });
});

// ─── Text search ──────────────────────────────────────────────────────────────

describe('useExerciseSearch — text search', () => {
  it('text search matches on name (case-insensitive)', async () => {
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      query: 'bench press',
    });

    const names = results.map((e) => e.name);
    expect(names).toContain('Barbell Bench Press');
  });

  it('text search matches on alias', async () => {
    // "flat bench" is an alias for Barbell Bench Press
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      query: 'flat bench',
    });

    const names = results.map((e) => e.name);
    expect(names).toContain('Barbell Bench Press');
  });

  it('empty query returns all equipment+medical eligible exercises', async () => {
    const noQueryResults = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      query: '',
    });
    const withQueryResults = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      query: 'bench press',
    });

    // Empty query must return >= as many results as a specific query
    expect(noQueryResults.length).toBeGreaterThanOrEqual(withQueryResults.length);
  });

  it('non-matching query returns empty array', async () => {
    const results = await getResults({
      equipmentList: ['Barbell', 'Flat Bench'],
      query: 'xyznonexistentexercise999',
    });

    expect(results).toHaveLength(0);
  });
});

// ─── Result cap ───────────────────────────────────────────────────────────────

describe('useExerciseSearch — result cap', () => {
  it('results are capped at 20 even when more exercises are eligible', async () => {
    // All equipment → maximum eligible set; empty query → all eligible returned
    const results = await getResults({
      equipmentList: [
        'Barbell', 'Dumbbells', 'Flat Bench', 'Incline Bench',
        'Cable Machine', 'Pull-up Bar', 'Leg Press', 'Leg Extension', 'Leg Curl', 'Ab Wheel',
      ],
      medicalFlags: [],
      query: '',
    });

    expect(results.length).toBeLessThanOrEqual(20);
  });
});

// ─── Debounce ─────────────────────────────────────────────────────────────────

describe('useExerciseSearch — debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('isSearching is true immediately after query change, false after 200ms', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExerciseSearch({ equipmentList: ['Barbell', 'Flat Bench'], query }),
      { initialProps: { query: '' } }
    );

    // Initial render — debounce fires immediately on mount
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.isSearching).toBe(false);

    // Change query — isSearching should become true before timer fires
    rerender({ query: 'bench' });
    expect(result.current.isSearching).toBe(true);

    // After 200ms debounce, isSearching goes false
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.isSearching).toBe(false);
  });

  it('rapid query changes produce only one filter pass — last value wins', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExerciseSearch({
        equipmentList: ['Barbell', 'Flat Bench'],
        query,
      }),
      { initialProps: { query: '' } }
    );

    // Settle initial render
    act(() => { vi.advanceTimersByTime(250); });

    // Fire 3 rapid changes within debounce window
    rerender({ query: 'b' });
    act(() => { vi.advanceTimersByTime(50); });
    rerender({ query: 'be' });
    act(() => { vi.advanceTimersByTime(50); });
    rerender({ query: 'bench' });

    // Timer hasn't fired yet — still searching
    expect(result.current.isSearching).toBe(true);

    // Advance past debounce — only the LAST query ('bench') should apply
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.isSearching).toBe(false);

    const names = result.current.results.map((e) => e.name);
    // 'bench' matches bench press exercises
    expect(names).toContain('Barbell Bench Press');
    // Should NOT have triggered filtering for 'b' or 'be' individually
    // (just verify the final state is correct for 'bench')
    names.forEach((n) => {
      expect(n.toLowerCase()).toContain('bench');
    });
  });
});
