import { mockGetDocs } from '../__mocks__/firebase';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWeeklyRecap } from '../hooks/useWeeklyRecap';
import { WeeklyRecapScreen } from '../components/shared/WeeklyRecapScreen';
import { useAuthStore } from '../stores/useAuthStore';
import { useXPStore } from '../stores/useXPStore';
import { generateWeeklyStatsCardImage } from '../components/shared/weeklyRecapCardGenerator';

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../stores/useXPStore', () => ({
  useXPStore: vi.fn(),
}));

vi.mock('../components/shared/weeklyRecapCardGenerator', () => ({
  generateWeeklyStatsCardImage: vi.fn().mockResolvedValue('data:image/png;base64,ZHVtbXktaW1hZ2U='),
}));

describe('Weekly Recap System TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({ uid: 'test-uid' });
    vi.mocked(useXPStore).mockReturnValue({ streak: 5 });
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('1. useWeeklyRecap() aggregates session count, volume, xpEarned from session docs', async () => {
    vi.setSystemTime(new Date('2026-06-07T12:00:00Z')); // Sunday

    // New approach: 1 call for sessions (reads totalVolume/xpEarned from session doc),
    // then 1 call for PRs. No exercises subcollection reads.
    mockGetDocs
      .mockResolvedValueOnce({
        size: 3,
        docs: [
          { id: 'sess1', data: () => ({ totalVolume: 1000, xpEarned: 150, bestLift: null }) },
          { id: 'sess2', data: () => ({ totalVolume: 1200, xpEarned: 150, bestLift: null }) },
          { id: 'sess3', data: () => ({ totalVolume: 800, xpEarned: 150, bestLift: null }) },
        ],
      })
      .mockResolvedValueOnce({
        size: 2, // PRs broken this week
        docs: [],
      });

    const { result } = renderHook(() => useWeeklyRecap());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recap).toEqual(expect.objectContaining({
      sessionsCount: 3,
      totalVolume: 3000,
      xpEarned: 450,
      prsBrokenCount: 2,
    }));
  });

  it('2. Recap only shows on Sunday (mock Date, verify logic)', () => {
    vi.setSystemTime(new Date('2026-06-07T12:00:00Z')); // Sunday
    const { result: r1 } = renderHook(() => useWeeklyRecap());
    expect(r1.current.isRecapDay).toBe(true);

    vi.setSystemTime(new Date('2026-06-08T12:00:00Z')); // Monday
    const { result: r2 } = renderHook(() => useWeeklyRecap());
    expect(r2.current.isRecapDay).toBe(false);
  });

  it('3. After viewing, localStorage key prevents re-showing same week', () => {
    vi.setSystemTime(new Date('2026-06-07T12:00:00Z'));
    const { result } = renderHook(() => useWeeklyRecap());

    expect(result.current.hasSeen).toBe(false);

    act(() => {
      result.current.markAsSeen();
    });

    expect(result.current.hasSeen).toBe(true);
    expect(localStorage.getItem(`recap_seen_${result.current.weekId}`)).toBe('true');
  });

  it('4. shareRecap() calls navigator.share on mobile', async () => {
    global.navigator.share = vi.fn().mockResolvedValue(true);
    global.navigator.canShare = vi.fn().mockReturnValue(true);

    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="2026-W23" markAsSeen={vi.fn()} onClose={vi.fn()} />);

    const shareBtn = screen.getByText(/Share Recap/i);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(generateWeeklyStatsCardImage).toHaveBeenCalled();
      expect(global.navigator.share).toHaveBeenCalled();
    });
  });

  it('5. shareRecap() falls back to download link when navigator.share unavailable', async () => {
    global.navigator.share = undefined;
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="2026-W23" markAsSeen={vi.fn()} onClose={vi.fn()} />);

    const shareBtn = screen.getByText(/Share Recap/i);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(generateWeeklyStatsCardImage).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  it('6. handleClose calls markAsSeen and onClose', () => {
    const markAsSeenMock = vi.fn();
    const onCloseMock = vi.fn();
    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    
    render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="2026-W23" markAsSeen={markAsSeenMock} onClose={onCloseMock} />);
    
    // Close button has aria-label "Close"
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);

    expect(markAsSeenMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('7. shareRecap handles AbortError/cancel share gracefully', async () => {
    vi.mocked(generateWeeklyStatsCardImage).mockRejectedValueOnce({ name: 'AbortError', message: 'Share cancelled by user' });
    
    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="2026-W23" markAsSeen={vi.fn()} onClose={vi.fn()} />);

    const shareBtn = screen.getByText(/Share Recap/i);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(generateWeeklyStatsCardImage).toHaveBeenCalled();
    });
    // Should not show error alert on cancellation
    expect(screen.queryByText(/Could not generate image/i)).not.toBeInTheDocument();
  });

  it('8. shareRecap handles generic error and displays error message', async () => {
    vi.useFakeTimers();
    vi.mocked(generateWeeklyStatsCardImage).mockRejectedValueOnce(new Error('Fatal canvas error'));
    
    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="2026-W23" markAsSeen={vi.fn()} onClose={vi.fn()} />);

    const shareBtn = screen.getByText(/Share Recap/i);
    fireEvent.click(shareBtn);

    // Let microtasks run
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/Could not generate image/i)).toBeInTheDocument();

    // Fast-forward 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Error message should disappear
    expect(screen.queryByText(/Could not generate image/i)).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('9. renders fallback when weekId is missing or has incorrect format', () => {
    const mockRecap = { sessionsCount: 3, totalVolume: 1000, xpEarned: 100, streak: 5, prsBrokenCount: 0, motivationalLine: '' };
    const { rerender } = render(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId={null} markAsSeen={vi.fn()} onClose={vi.fn()} />);
    
    // Split doesn't run, week number becomes empty
    expect(screen.getByRole('heading', { name: /WEEK/i })).toHaveTextContent('WEEK');

    rerender(<WeeklyRecapScreen isOpen={true} recap={mockRecap} weekId="incorrect_format" markAsSeen={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /WEEK/i })).toHaveTextContent('WEEK');
  });
});
