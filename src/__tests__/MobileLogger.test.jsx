import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileLogger } from '../components/mobile/MobileLogger';
import { useAuthStore } from '../stores/useAuthStore';
import { useWorkoutStore } from '../stores/useWorkoutStore';
import { useWorkoutLogger } from '../hooks/useWorkoutLogger';

// Mock framer-motion to bypass animation delays in testing
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props, ref) => <div ref={ref} {...props} />),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

// Mock notification helper
vi.mock('../utils/audioBeep', () => ({
  playRestTimerBeep: vi.fn(),
}));

// Mock hooks
vi.mock('../hooks/useWorkoutLogger', () => ({
  useWorkoutLogger: vi.fn(),
}));

vi.mock('../hooks/useWorkoutTimer', () => ({
  useWorkoutTimer: () => ({ formattedTime: '12:34' }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock child components that might have complex data fetching
vi.mock('../components/mobile/MobileSessionComplete', () => ({
  MobileSessionComplete: () => <div data-testid="mobile-session-complete">Session Complete</div>,
}));

vi.mock('../components/shared/ExerciseSearch', () => ({
  ExerciseSearch: ({ onAddExercise }) => (
    <button onClick={() => onAddExercise({ key: 'squat', name: 'Squat', sets: [] })}>
      Mock Add Exercise
    </button>
  ),
}));

vi.mock('../components/shared/NeubrutalistCalendar', () => ({
  NeubrutalistCalendar: ({ onSelectSession }) => (
    <button onClick={() => onSelectSession({ id: 'past1', dateString: '2023-05-01' })}>
      Mock Past Session
    </button>
  ),
}));

// Mock set row
vi.mock('../components/shared/SetRow', () => ({
  SetRow: ({ onUpdate, onToggleDone, onRemove }) => (
    <div data-testid="set-row">
      <button onClick={() => onUpdate('weight', '100')}>Update Weight</button>
      <button onClick={() => onToggleDone()}>Toggle Done</button>
      <button onClick={() => onRemove()}>Remove Set</button>
    </div>
  ),
}));

describe('MobileLogger Component', () => {
  let finishSessionMock;
  let resetSessionMock;
  let startSessionMock;
  let addExerciseMock;

  beforeEach(() => {
    vi.clearAllMocks();

    finishSessionMock = vi.fn().mockResolvedValue({ id: 'session123' });
    resetSessionMock = vi.fn();
    startSessionMock = vi.fn();
    addExerciseMock = vi.fn();

    useWorkoutLogger.mockReturnValue({
      finishSession: finishSessionMock,
      resetSession: resetSessionMock,
    });

    useAuthStore.setState({
      user: { uid: 'testuid' },
      profile: { name: 'Tester', xpBoosterUntil: Date.now() + 100000 },
    });

    useWorkoutStore.setState({
      activeSession: null,
      exercises: [],
      isOverdrive: false,
      startSession: startSessionMock,
      addExercise: addExerciseMock,
      updateSet: vi.fn(),
      markSetDone: vi.fn().mockReturnValue(true),
      addSet: vi.fn(),
      removeSet: vi.fn(),
      removeExercise: vi.fn(),
    });

    // Mock Firestore
    vi.mock('firebase/firestore', async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        collection: vi.fn(),
        getDocs: vi.fn().mockResolvedValue({ docs: [] }),
        query: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
      };
    });
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <MobileLogger />
    </MemoryRouter>
  );

  it('renders pre-session state correctly and handles start custom session', () => {
    renderComponent();

    // Setup sheet should be visible
    expect(screen.getByText('Ready to train?')).toBeInTheDocument();
    
    // Test mood toggle
    const lockedInBtn = screen.getByText('Locked In');
    fireEvent.click(lockedInBtn);
    
    // Test stomach flag toggle
    const stomachToggle = screen.getByRole('checkbox', { hidden: true });
    fireEvent.click(stomachToggle);
    
    // Start session
    const startBtn = screen.getByText('Start Session →');
    fireEvent.click(startBtn);

    expect(startSessionMock).toHaveBeenCalledWith('locked_in', true);
  });

  it('renders active session correctly', () => {
    useWorkoutStore.setState({
      activeSession: { isQuickLog: false, moodTag: 'average' },
      exercises: [],
    });

    renderComponent();

    // Header timer
    expect(screen.getByText('12:34')).toBeInTheDocument();
    expect(screen.getByText('END')).toBeInTheDocument();

    // Natural Language input
    const input = screen.getByPlaceholderText(/e.g., Bench Press/i);
    expect(input).toBeInTheDocument();

    // Typing in NLP triggers parsing preview
    fireEvent.change(input, { target: { value: 'Bench Press 60kg 3x10' } });
    expect(screen.getByText(/Quick Match Detected!/i)).toBeInTheDocument();
    
    const confirmAdd = screen.getByText('Add to Session');
    fireEvent.click(confirmAdd);
    
    expect(addExerciseMock).toHaveBeenCalled();
  });

  it('handles ending session and debrief workflow', async () => {
    useWorkoutStore.setState({
      activeSession: { isQuickLog: false },
      exercises: [
        {
          exerciseId: 'ex1',
          name: 'Bench Press',
          sets: [{ reps: '10', weight: '60', done: true, completed: true }]
        }
      ],
    });

    renderComponent();

    const endBtn = screen.getByText('END');
    fireEvent.click(endBtn);

    // End sheet should open
    expect(screen.getByText(/End Session\?/i)).toBeInTheDocument();

    // Submit session
    const finishBtn = screen.getByRole('button', { name: /Finish Session/i });
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(finishSessionMock).toHaveBeenCalled();
    });
  });

  it('shows error if trying to end with no exercises', () => {
    useWorkoutStore.setState({
      activeSession: { isQuickLog: false },
      exercises: [], // empty exercises
    });

    renderComponent();
    
    const endBtn = screen.getByText('END');
    fireEvent.click(endBtn);
    
    // Should NOT open end sheet
    expect(screen.queryByText(/End Session\?/i)).not.toBeInTheDocument();
  });
});
