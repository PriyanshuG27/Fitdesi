import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import mocks from the Firebase mocking infrastructure
import {
  mockUpdateDoc,
  mockSetDoc,
  mockAddDoc,
  mockDoc,
  mockAuth
} from '../__mocks__/firebase';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import modules under test
import { useOnboarding } from '../hooks/useOnboarding';
import { useAuthStore } from '../stores/authStore';
import { writeSession, updateUserProfile } from '../lib/firestoreUtils';
import { writeBatch } from 'firebase/firestore';

// Mock writeBatch and its returned object
const mockSet = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);
vi.mocked(writeBatch).mockReturnValue({
  set: mockSet,
  commit: mockCommit,
});

// Helper wrapper to provide Router context to hooks
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ uid: 'test-user-123', loading: false });
  });

  // 1. useOnboarding — setUserType()
  describe('setUserType()', () => {
    it('updates userType in local state, calls updateDoc, and does not advance step on failure', async () => {
      // Simulate firestore write failure
      mockUpdateDoc.mockRejectedValueOnce(new Error('Firestore write failed'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.state.userType).toBeNull();
      expect(result.current.currentStep).toBe(0);

      await act(async () => {
        await result.current.setUserType('Comeback');
      });

      // State is updated locally
      expect(result.current.state.userType).toBe('Comeback');
      // updateDoc was called with the correct payload
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'users/test-user-123' }),
        { userType: 'Comeback' }
      );
      // Step did NOT advance due to write failure
      expect(result.current.currentStep).toBe(0);
      expect(result.current.error).toBe('Failed to save user type. Please try again.');

      // Clear error and mock success for next write
      act(() => {
        result.current.setError(null);
      });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.setUserType('Consistent');
      });

      // Step successfully advanced
      expect(result.current.state.userType).toBe('Consistent');
      expect(result.current.currentStep).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });

  // 2. useOnboarding — toggleEquipment()
  describe('toggleEquipment()', () => {
    it('toggles items in equipmentList and ignores invalid ones', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.state.equipmentList).toEqual([]);

      // Toggle item on (add)
      act(() => {
        result.current.toggleEquipment('Barbell');
      });
      expect(result.current.state.equipmentList).toEqual(['Barbell']);

      // Toggle item off (remove)
      act(() => {
        result.current.toggleEquipment('Barbell');
      });
      expect(result.current.state.equipmentList).toEqual([]);

      // Ignore invalid equipment IDs (not in valid enum)
      act(() => {
        result.current.toggleEquipment('InvalidGear');
      });
      expect(result.current.state.equipmentList).toEqual([]);
    });
  });

  // 3. useOnboarding — skip()
  describe('skip()', () => {
    it('calls updateDoc with onboardingComplete: true, navigates to /home, and saves partial state', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Partially fill state
      act(() => {
        result.current.updateState('userType', 'Beginner');
        result.current.updateState('goal', 'Muscle Gain');
      });

      await act(async () => {
        await result.current.skip();
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'users/test-user-123' }),
        expect.objectContaining({
          userType: 'Beginner',
          goal: 'Muscle Gain',
          onboardingComplete: true
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });
});

describe('firestoreUtils Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 4. firestoreUtils — writeSession()
  describe('writeSession()', () => {
    it('rejects negative weight values', async () => {
      const sessionData = { sessionId: 's1', totalVolume: 100, xpEarned: 10 };
      const exercises = [{
        exerciseId: 'ex1',
        name: 'Bench Press',
        sets: [{ weight: -5, reps: 10 }]
      }];

      await expect(writeSession('uid-123', sessionData, exercises)).rejects.toThrow(
        'Validation Error: Weight must be greater than 0'
      );
    });

    it('strips HTML tags from exercise names, uses batch write, and commits exactly once', async () => {
      const sessionData = { sessionId: 'session-789', totalVolume: 1200, xpEarned: 50 };
      const exercises = [
        {
          exerciseId: 'ex-1',
          name: '<h3>Deadlift</h3> & Squat',
          sets: [{ weight: 120, reps: 5, done: true }]
        }
      ];

      await writeSession('uid-123', sessionData, exercises);

      // Uses batch write (mockSet called for session document + exercise document)
      expect(mockSet).toHaveBeenCalledTimes(2);
      
      const exercisePayload = mockSet.mock.calls[1][1];
      // HTML and script characters (<, >, &, ", ') stripped
      expect(exercisePayload.name).toBe('h3Deadlift/h3  Squat');

      // batch.commit() is called exactly once
      expect(mockCommit).toHaveBeenCalledTimes(1);
    });
  });

  // 5. firestoreUtils — updateUserProfile()
  describe('updateUserProfile()', () => {
    it('strips unknown fields, throws on empty uid, and updates whitelisted fields', async () => {
      // 1. Throws if UID is empty
      await expect(updateUserProfile('', { name: 'Atharva' })).rejects.toThrow(
        'Validation Error: A valid, non-empty UID must be provided.'
      );

      mockUpdateDoc.mockResolvedValueOnce(undefined);

      // 2. Strips unknown fields, allows whitelisted
      const payload = {
        name: 'Atharva',
        xp: 150,
        level: 2,
        gender: 'Male',
        maliciousToken: 'hack_session_data', // non-whitelisted
      };

      await updateUserProfile('uid-123', payload);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];

      expect(updatePayload.name).toBe('Atharva');
      expect(updatePayload.xp).toBe(150);
      expect(updatePayload.level).toBe(2);
      expect(updatePayload.gender).toBe('Male');
      expect(updatePayload.maliciousToken).toBeUndefined();
    });
  });
});
