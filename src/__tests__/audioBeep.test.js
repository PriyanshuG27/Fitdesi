import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playRestTimerBeep } from '../utils/audioBeep';

describe('audioBeep — playRestTimerBeep', () => {
  let mockOscillator;
  let mockGainNode;
  let mockAudioContext;
  let originalAudioContext;

  beforeEach(() => {
    mockOscillator = {
      connect: vi.fn(),
      type: '',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGainNode = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };

    mockAudioContext = vi.fn().mockImplementation(function() {
      return {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGainNode),
        destination: {},
        currentTime: 10,
      };
    });

    originalAudioContext = window.AudioContext;
    window.AudioContext = mockAudioContext;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('instantiates AudioContext and schedules the synthetic retro beep tone', () => {
    playRestTimerBeep();

    expect(mockAudioContext).toHaveBeenCalled();
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalled();
    
    expect(mockOscillator.type).toBe('sine');
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10);
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 10);
    expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 11);
    
    expect(mockOscillator.start).toHaveBeenCalledWith(10);
    expect(mockOscillator.stop).toHaveBeenCalledWith(11);
  });

  it('safely catches errors and warns to console when audio playback fails', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    mockAudioContext.mockImplementationOnce(function() {
      return {
        createOscillator: () => { throw new Error('Audio hardware unavailable'); }
      };
    });

    playRestTimerBeep();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[audioBeep] Failed to play synthetic rest timer beep:'),
      expect.any(Error)
    );
  });

  it('returns early if AudioContext is not supported by the browser', () => {
    const originalWebkitAudioContext = window.webkitAudioContext;
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    playRestTimerBeep();

    expect(mockAudioContext).not.toHaveBeenCalled();

    // Restore
    window.AudioContext = mockAudioContext;
    window.webkitAudioContext = originalWebkitAudioContext;
  });
});
