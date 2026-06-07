import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mockGetDocs } from '../__mocks__/firebase';

import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { useWeeklyRecap } from '../hooks/useWeeklyRecap';
import { WeeklyRecapScreen } from '../components/shared/WeeklyRecapScreen';
import { useAuthStore } from '../stores/useAuthStore';
import { useXPStore } from '../stores/useXPStore';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockImplementation(() => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = (cb) => cb(new Blob(['dummy-image'], { type: 'image/png' }));
    return Promise.resolve(canvas);
  }),
}));

describe('Weekly Recap System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      uid: 'user-123',
      user: { uid: 'user-123' },
    });
    useXPStore.setState({
      streak: 5,
    });
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Sunday Detection & LocalStorage', () => {
    it('detects Sunday correctly and initializes isRecapDay to true', () => {
      // Mock system time to Sunday, June 7, 2026
      vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));
      
      mockGetDocs.mockResolvedValue({
        size: 0,
        docs: [],
      });

      const { result } = renderHook(() => useWeeklyRecap());

      expect(result.current.isRecapDay).toBe(true);
      expect(result.current.hasSeen).toBe(false);
    });

    it('detects weekdays correctly and sets isRecapDay to false', () => {
      // Mock system time to Wednesday, June 10, 2026
      vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
      
      mockGetDocs.mockResolvedValue({
        size: 0,
        docs: [],
      });

      const { result } = renderHook(() => useWeeklyRecap());

      expect(result.current.isRecapDay).toBe(false);
    });

    it('marks recap as seen in localStorage and sets hasSeen to true', () => {
      vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));
      
      mockGetDocs.mockResolvedValue({
        size: 0,
        docs: [],
      });

      const { result } = renderHook(() => useWeeklyRecap());

      expect(result.current.hasSeen).toBe(false);

      act(() => {
        result.current.markAsSeen();
      });

      expect(result.current.hasSeen).toBe(true);
      expect(localStorage.getItem(`recap_seen_${result.current.weekId}`)).toBe('true');
    });
  });

  describe('Stats Aggregation', () => {
    it('queries sessions and PRs and aggregates stats correctly', async () => {
      vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));

      // Setup sequential mock responses for:
      // 1. Sessions query
      // 2. Session 1 Exercises query
      // 3. PRs query
      mockGetDocs
        .mockResolvedValueOnce({
          size: 1,
          docs: [
            {
              id: 'session-abc',
              data: () => ({
                totalVolume: 4200,
                xpEarned: 80,
                date: new Date(),
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'ex-squat',
              data: () => ({
                name: 'Barbell Squat',
                sets: [
                  { weight: 140, reps: 5, done: true },
                  { weight: 150, reps: 3, done: true },
                  { weight: 160, reps: 2, done: false }, // not done, should be ignored
                ],
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          size: 3, // 3 PRs broken
          docs: [
            { id: 'pr-1', data: () => ({ date: new Date() }) },
            { id: 'pr-2', data: () => ({ date: new Date() }) },
            { id: 'pr-3', data: () => ({ date: new Date() }) },
          ],
        });

      const { result } = renderHook(() => useWeeklyRecap());

      // Wait for async loadRecapData to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.recap).toEqual({
        sessionsCount: 1,
        totalVolume: 4200,
        prsBrokenCount: 3,
        xpEarned: 80,
        streak: 5,
        bestLift: {
          name: 'Barbell Squat',
          weight: 150,
          isBW: false,
        },
        motivationalLine: '1 session logged. A small step is still progress! 🚀',
      });
    });
  });

  describe('WeeklyRecapScreen UI and Sharing', () => {
    const defaultRecap = {
      sessionsCount: 3,
      totalVolume: 12500,
      prsBrokenCount: 4,
      xpEarned: 245,
      streak: 5,
      bestLift: { name: 'Deadlift', weight: 180 },
      motivationalLine: '3 sessions logged. Consistent and strong! 🎯',
    };

    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;

    beforeAll(() => {
      navigator.share = vi.fn().mockResolvedValue(undefined);
      navigator.canShare = vi.fn().mockReturnValue(true);
    });

    afterAll(() => {
      navigator.share = originalShare;
      navigator.canShare = originalCanShare;
    });

    it('renders correct stats and motivational line', () => {
      const mockClose = vi.fn();
      const mockMark = vi.fn();

      render(
        <WeeklyRecapScreen
          isOpen={true}
          onClose={mockClose}
          recap={defaultRecap}
          weekId="2026-W23"
          markAsSeen={mockMark}
        />
      );

      expect(screen.getAllByText('WEEK 23')[0]).toBeInTheDocument();
      expect(screen.getAllByText('3')[0]).toBeInTheDocument(); // sessions Count
      expect(screen.getAllByText('12,500 kg')[0]).toBeInTheDocument(); // total volume
      expect(screen.getAllByText('4')[0]).toBeInTheDocument(); // PRs
      expect(screen.getAllByText('+245')[0]).toBeInTheDocument(); // XP
      expect(screen.getAllByText('5 days')[0]).toBeInTheDocument(); // streak
      expect(screen.getAllByText('Deadlift')[0]).toBeInTheDocument(); // Best lift
      expect(screen.getAllByText('180 kg')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/"3 sessions logged. Consistent and strong! 🎯"/)[0]).toBeInTheDocument();
    });

    it('calls navigator.share on mobile share trigger', async () => {
      const mockClose = vi.fn();
      const mockMark = vi.fn();

      render(
        <WeeklyRecapScreen
          isOpen={true}
          onClose={mockClose}
          recap={defaultRecap}
          weekId="2026-W23"
          markAsSeen={mockMark}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share recap/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(navigator.share).toHaveBeenCalledTimes(1);
      });
    });

    it('falls back to file download on desktop when sharing is unsupported', async () => {
      const mockClose = vi.fn();
      const mockMark = vi.fn();

      // Disable navigator.share to simulate desktop
      const prevShare = navigator.share;
      navigator.share = undefined;

      // Spy on document.createElement to check fallback download link click
      const createElSpy = vi.spyOn(document, 'createElement');

      render(
        <WeeklyRecapScreen
          isOpen={true}
          onClose={mockClose}
          recap={defaultRecap}
          weekId="2026-W23"
          markAsSeen={mockMark}
        />
      );

      const shareButton = screen.getByRole('button', { name: /share recap/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(createElSpy).toHaveBeenCalledWith('a');
      });

      // Restore navigator.share
      navigator.share = prevShare;
      createElSpy.mockRestore();
    });
  });
});
