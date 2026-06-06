import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mockUpdateDoc,
  mockSetDoc,
  mockAddDoc,
  mockDoc,
} from '../__mocks__/firebase';

import {
  updateUserProfile,
  writeSession,
  updatePR,
  addXPLog
} from '../lib/firestoreUtils';

import { writeBatch } from 'firebase/firestore';

// Mock writeBatch and its returned object
const mockSet = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);
vi.mocked(writeBatch).mockReturnValue({
  set: mockSet,
  commit: mockCommit,
});

describe('firestoreUtils — updateUserProfile()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws validation error if uid is empty', async () => {
    await expect(updateUserProfile('', { name: 'Pri' })).rejects.toThrow(
      'Validation Error: A valid, non-empty UID must be provided.'
    );
    await expect(updateUserProfile(null, { name: 'Pri' })).rejects.toThrow(
      'Validation Error: A valid, non-empty UID must be provided.'
    );
  });

  it('silently filters out non-whitelisted keys and processes values', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const dataPayload = {
      name: ' Priyanshu  ', // needs trim
      xp: 120,
      badKey: 'hack_attempt', // should be stripped
      equipmentList: ['Barbell', 'Dumbbells', 'Barbell', 'CustomMachine'], // duplicate + needs filtering
    };

    await updateUserProfile('test-uid', dataPayload);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];

    expect(updateData.name).toBe('Priyanshu');
    expect(updateData.xp).toBe(120);
    expect(updateData.badKey).toBeUndefined();
    // Unique list: Barbell, Dumbbells, CustomMachine
    expect(updateData.equipmentList).toEqual(['Barbell', 'Dumbbells', 'CustomMachine']);
  });
});

describe('firestoreUtils — writeSession()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws validation error if volume or xp is negative', async () => {
    const sessionData = { sessionId: 's1', totalVolume: -10, xpEarned: 50 };
    const exercises = [{ exerciseId: 'ex1', name: 'Squat', sets: [{ weight: 10, reps: 5 }] }];

    await expect(writeSession('uid-123', sessionData, exercises)).rejects.toThrow(
      'Validation Error: Total volume cannot be negative.'
    );
  });

  it('strips html and script tags from exercise names', async () => {
    const sessionData = { sessionId: 's1', totalVolume: 1000, xpEarned: 50 };
    const exercises = [{
      exerciseId: 'ex1',
      name: '<script>alert("hack")</script>Bench Press & Barbell',
      sets: [{ weight: 60, reps: 8, done: true }]
    }];

    await writeSession('uid-123', sessionData, exercises);

    expect(mockSet).toHaveBeenCalledTimes(2); // session + exercise
    const exercisePayload = mockSet.mock.calls[1][1];
    expect(exercisePayload.name).toBe('scriptalert(hack)/scriptBench Press  Barbell'); // HTML elements (<, >, &) stripped
  });

  it('throws validation error if weight or reps <= 0', async () => {
    const sessionData = { sessionId: 's1', totalVolume: 100, xpEarned: 10 };
    const exercises = [{
      exerciseId: 'ex1',
      name: 'Curl',
      sets: [{ weight: -10, reps: 10 }]
    }];

    await expect(writeSession('uid-123', sessionData, exercises)).rejects.toThrow(
      'Validation Error: Weight must be greater than 0'
    );
  });
});

describe('firestoreUtils — updatePR()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates exerciseKey alphanumeric and underscore pattern', async () => {
    await expect(updatePR('uid1', 'invalid-key!', { weight: 10, reps: 5 })).rejects.toThrow(
      'Validation Error: Exercise key must only contain lowercase alphanumeric characters and underscores.'
    );
  });

  it('rejects non-positive weight and reps', async () => {
    await expect(updatePR('uid1', 'bench_press', { weight: 0, reps: 5 })).rejects.toThrow(
      'Validation Error: PR weight must be greater than 0.'
    );
    await expect(updatePR('uid1', 'bench_press', { weight: 50, reps: -2 })).rejects.toThrow(
      'Validation Error: PR reps must be greater than 0.'
    );
  });
});

describe('firestoreUtils — addXPLog()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates XP source belongs to allowed enums', async () => {
    await expect(addXPLog('uid1', 'invalid_source', 100)).rejects.toThrow(
      'Validation Error: Invalid XP source "invalid_source".'
    );
  });

  it('validates XP amount is positive', async () => {
    await expect(addXPLog('uid1', 'session_logged', -50)).rejects.toThrow(
      'Validation Error: XP log amount must be a positive integer.'
    );
  });
});
