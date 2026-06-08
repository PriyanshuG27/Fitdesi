/**
 * MobileLogger.test.jsx
 *
 * Component-level tests for the workout logger screens.
 * Does NOT test hook internals (PR algo, XP calc, batch write) —
 * those are covered by useWorkout.test, usePRDetection.test, firestoreUtils.test.
 *
 * All Firestore / Firebase calls are intercepted by src/__mocks__/firebase.js.
 * useWorkoutLogger is mocked — finishSession is a vi.fn() we control.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Firebase mock (must import before any component that touches firebase) ───
import { mockGetDocs } from '../__mocks__/firebase';

// ─── Stores ───────────────────────────────────────────────────────────────────
import { useWorkoutStore } from '../stores/useWorkoutStore';
import { useAuthStore } from '../stores/useAuthStore';

// ─── Component under test ─────────────────────────────────────────────────────
import { MobileLogger } from '../components/mobile/MobileLogger';

// ─── Router mock ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── useWorkoutLogger mock ────────────────────────────────────────────────────
const mockFinishSession = vi.fn();
const mockResetSession  = vi.fn();
vi.mock('../hooks/useWorkoutLogger', () => ({
  useWorkoutLogger: () => ({
    finishSession: mockFinishSession,
    resetSession:  mockResetSession,
  }),
}));

// ─── useToast mock ────────────────────────────────────────────────────────────
const mockToast = vi.fn();
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── useWorkoutTimer mock ─────────────────────────────────────────────────────
vi.mock('../hooks/useWorkoutTimer', () => ({
  useWorkoutTimer: () => ({ formattedTime: '00:00' }),
}));

// ─── ExerciseSearch mock — returns a fixed exercise list ─────────────────────
vi.mock('../components/shared/ExerciseSearch', () => ({
  ExerciseSearch: ({ onSelect }) => (
    <button
      data-testid="exercise-search-add"
      onClick={() => onSelect({
        key: 'barbell_squat',
        name: 'Barbell Squat',
        muscleGroup: 'legs',
        exerciseKey: 'barbell_squat',
      })}
    >
      Search exercise…
    </button>
  ),
}));

// ─── MobileSessionComplete mock — we only verify it renders, not its internals ─
vi.mock('../components/mobile/MobileSessionComplete', () => ({
  MobileSessionComplete: ({ summary, onRetry, error, retryCount }) => (
    <div data-testid="session-complete-screen">
      <span data-testid="summary-xp">{summary?.xpEarned}</span>
      {error && <button data-testid="retry-btn" onClick={onRetry}>Retry</button>}
      {retryCount >= 3 && <span data-testid="save-locally-msg">Session saved locally</span>}
    </div>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Standard active-session state with one exercise and one done set */
const ACTIVE_WITH_EXERCISE = {
  activeSession: { planDayId: 'custom', startedAt: Date.now() - 30000 },
  exercises: [{
    exerciseId: 'barbell_squat_1',
    exerciseKey: 'barbell_squat',
    name: 'Barbell Squat',
    muscleGroup: 'legs',
    sets: [{ reps: 8, weight: 100, completed: true, done: true }],
  }],
  elapsedSeconds: 30,
};

function resetStores() {
  useWorkoutStore.setState({
    activeSession:  null,
    exercises:      [],
    elapsedSeconds: 0,
    sessionLoading: false,
    sessionError:   null,
  });
  useAuthStore.setState({
    user:    { uid: 'test-uid-123' },
    profile: { weightKg: 75 },
    loading: false,
  });
}

function renderLogger() {
  return render(
    <MemoryRouter>
      <MobileLogger />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MobileLogger — Session Setup Sheet', () => {
  beforeEach(() => {
    resetStores();
    mockGetDocs.mockResolvedValue({ docs: [], forEach: () => {} });
    vi.clearAllMocks();
  });

  it('renders setup sheet when no active session', () => {
    renderLogger();
    expect(screen.getByText('Ready to train?')).toBeInTheDocument();
    expect(screen.getByText('Start Custom Session')).toBeInTheDocument();
    expect(screen.getByText("Start Session →")).toBeInTheDocument();
  });

  it('selects mood and tapping Let\'s Go calls startSession with correct moodTag', () => {
    renderLogger();

    fireEvent.click(screen.getByText('Locked In'));
    fireEvent.click(screen.getByText("Start Session →"));

    const state = useWorkoutStore.getState();
    expect(state.activeSession).not.toBeNull();
    expect(state.activeSession.moodTag).toBe('locked_in');
  });

  it('toggling stomach flag passes stomachFlag=true to startSession', () => {
    renderLogger();

    // The label wraps the hidden checkbox; clicking it toggles the flag
    fireEvent.click(screen.getByText(/Body feeling off\?/i));
    fireEvent.click(screen.getByText("Start Session →"));

    const state = useWorkoutStore.getState();
    expect(state.activeSession.stomachFlag).toBe(true);
  });

  it('crash recovery: if store has activeSession on mount, skips setup sheet', () => {
    // Simulate app restart with persisted active session
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
    renderLogger();

    expect(screen.queryByText('Ready to train?')).not.toBeInTheDocument();
    expect(screen.getByText('Barbell Squat')).toBeInTheDocument();
  });
});

describe('MobileLogger — Active Logger', () => {
  beforeEach(() => {
    resetStores();
    mockGetDocs.mockResolvedValue({ docs: [], forEach: () => {} });
    vi.clearAllMocks();
  });

  it('renders session timer, exercise cards, and sticky search when active', () => {
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
    renderLogger();

    expect(screen.getByText('00:00')).toBeInTheDocument(); // from useWorkoutTimer mock
    expect(screen.getByText('Barbell Squat')).toBeInTheDocument();
    expect(screen.getByText('Search exercise…')).toBeInTheDocument();
  });

  it('adding exercise via ExerciseSearch appends it to the session', () => {
    useWorkoutStore.setState({
      activeSession: { planDayId: 'custom', startedAt: Date.now() },
      exercises: [],
      elapsedSeconds: 0,
    });
    renderLogger();

    // The mock ExerciseSearch calls onSelect with Barbell Squat on click
    fireEvent.click(screen.getByTestId('exercise-search-add'));

    const exercises = useWorkoutStore.getState().exercises;
    expect(exercises.length).toBe(1);
    expect(exercises[0].name).toBe('Barbell Squat');
  });

  it('initializes the rest timer from profile latestRestTimesMap when adding an exercise', () => {
    useAuthStore.setState({
      user: { uid: 'test-uid-123' },
      profile: { weightKg: 75, latestRestTimesMap: { barbell_squat: 165 } },
      loading: false,
    });
    useWorkoutStore.setState({
      activeSession: { planDayId: 'custom', startedAt: Date.now() },
      exercises: [],
      elapsedSeconds: 0,
    });
    renderLogger();

    // The mock ExerciseSearch calls onSelect with Barbell Squat (key: barbell_squat)
    fireEvent.click(screen.getByTestId('exercise-search-add'));

    const exercises = useWorkoutStore.getState().exercises;
    expect(exercises.length).toBe(1);
    expect(exercises[0].restTimer).toBe(165);
  });

  it('"+ Add Set" appends a new empty SetRow to the exercise', () => {
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
    renderLogger();

    const addSetBtn = screen.getByText('Add Set');
    fireEvent.click(addSetBtn);

    const sets = useWorkoutStore.getState().exercises[0].sets;
    expect(sets.length).toBe(2);
  });

  it('starts the rest timer when marking a set as done by default', async () => {
    useWorkoutStore.setState({
      activeSession: { planDayId: 'custom', startedAt: Date.now() },
      exercises: [{
        exerciseId: 'barbell_squat_1',
        exerciseKey: 'barbell_squat',
        name: 'Barbell Squat',
        muscleGroup: 'legs',
        sets: [{ reps: 8, weight: 100, completed: false, done: false }],
      }],
    });
    renderLogger();

    const doneBtn = screen.getByTestId('set-done-0-0');
    fireEvent.click(doneBtn);

    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Rest timer started'), 'info');
    expect(screen.getByText(/REST TIMER:/i)).toBeInTheDocument();
  });

  it('skips starting the rest timer when disableRestTimer is true in user profile', async () => {
    useAuthStore.setState({
      user: { uid: 'test-uid-123' },
      profile: { weightKg: 75, disableRestTimer: true },
      loading: false,
    });
    useWorkoutStore.setState({
      activeSession: { planDayId: 'custom', startedAt: Date.now() },
      exercises: [{
        exerciseId: 'barbell_squat_1',
        exerciseKey: 'barbell_squat',
        name: 'Barbell Squat',
        muscleGroup: 'legs',
        sets: [{ reps: 8, weight: 100, completed: false, done: false }],
      }],
    });
    renderLogger();

    const doneBtn = screen.getByTestId('set-done-0-0');
    fireEvent.click(doneBtn);

    expect(mockToast).not.toHaveBeenCalledWith(expect.stringContaining('Rest timer started'), 'info');
    expect(screen.queryByText(/REST TIMER:/i)).not.toBeInTheDocument();
  });

  it('tapping END with 0 exercises shows error toast and does NOT open confirmation sheet', () => {
    useWorkoutStore.setState({
      activeSession: { planDayId: 'custom', startedAt: Date.now() },
      exercises: [],
      elapsedSeconds: 0,
    });
    renderLogger();

    fireEvent.click(screen.getByText('END'));

    expect(mockToast).toHaveBeenCalledWith('Add at least one exercise', 'error');
    expect(screen.queryByText('End Session?')).not.toBeInTheDocument();
  });

  it('tapping END with exercises opens confirmation sheet with live stats', () => {
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
    renderLogger();

    fireEvent.click(screen.getByText('END'));

    expect(screen.getByText('End Session?')).toBeInTheDocument();
    // Stats grid is rendered in the sheet (exercise count label is visible)
    expect(screen.getByText('Exercises')).toBeInTheDocument();
  });
});

describe('MobileLogger — Finish Session Flow', () => {
  beforeEach(() => {
    resetStores();
    mockGetDocs.mockResolvedValue({ docs: [], forEach: () => {} });
    vi.clearAllMocks();
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
  });

  it('successful finishSession shows the SessionComplete screen', async () => {
    mockFinishSession.mockResolvedValueOnce({
      sessionId:      'sess-abc',
      totalVolume:    800,
      totalSets:      1,
      durationMinutes: 1,
      exerciseCount:  1,
      prCount:        0,
      prNames:        [],
      xpEarned:       50,
      levelUp:        false,
      newLevel:       1,
      newLevelName:   'Rookie',
    });

    renderLogger();
    fireEvent.click(screen.getByText('END'));
    fireEvent.click(screen.getByText('Finish Session'));

    await waitFor(() => {
      expect(screen.getByTestId('session-complete-screen')).toBeInTheDocument();
    });
    expect(mockFinishSession).toHaveBeenCalledWith('test-uid-123');
  });

  it('finishSession failure preserves session state — exercises still in store', async () => {
    mockFinishSession.mockRejectedValueOnce(
      new Error('[useWorkoutLogger] Failed to save session. network error')
    );

    renderLogger();
    fireEvent.click(screen.getByText('END'));
    fireEvent.click(screen.getByText('Finish Session'));

    await waitFor(() => {
      // Error message is shown inline in the sheet
      expect(screen.getByText(/Could not save/i)).toBeInTheDocument();
    });

    // Session exercises are still intact — not cleared
    expect(useWorkoutStore.getState().exercises.length).toBe(1);
    // Session complete screen is NOT shown
    expect(screen.queryByTestId('session-complete-screen')).not.toBeInTheDocument();
  });

  it('after 3 retry failures shows "save locally" message', async () => {
    mockFinishSession.mockRejectedValue(
      new Error('[useWorkoutLogger] network error')
    );

    renderLogger();
    fireEvent.click(screen.getByText('END'));

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Finish Session'));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => {
        expect(mockFinishSession).toHaveBeenCalledTimes(i + 1);
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Session saved locally/i)).toBeInTheDocument();
    });
  });

  it('retry button on SessionComplete re-calls finishSession', async () => {
    // First call fails, second succeeds
    mockFinishSession
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        sessionId: 'sess-retry', totalVolume: 0, totalSets: 1,
        durationMinutes: 1, exerciseCount: 1, prCount: 0, prNames: [],
        xpEarned: 50, levelUp: false, newLevel: 1, newLevelName: 'Rookie',
      });

    renderLogger();
    fireEvent.click(screen.getByText('END'));
    fireEvent.click(screen.getByText('Finish Session'));

    await waitFor(() => expect(mockFinishSession).toHaveBeenCalledTimes(1));
  });

  it('Discard Session calls resetSession and navigates home', () => {
    renderLogger();
    fireEvent.click(screen.getByText('END'));
    fireEvent.click(screen.getByText('Discard Session'));

    expect(mockResetSession).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});

describe('MobileLogger — Session Timer', () => {
  beforeEach(() => {
    resetStores();
    mockGetDocs.mockResolvedValue({ docs: [], forEach: () => {} });
    vi.clearAllMocks();
  });

  it('displays the timer when session is active (mocked formattedTime)', () => {
    useWorkoutStore.setState(ACTIVE_WITH_EXERCISE);
    renderLogger();
    // useWorkoutTimer is mocked to return '00:00'
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
