import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  deriveLevelFromXP, 
  evaluateStreak, 
  isAuraActive, 
  isTitleActive, 
  getAvatarStyle 
} from '../lib/xpHelpers';

describe('xpHelpers — deriveLevelFromXP', () => {
  it('handles Rookie level thresholds correctly', () => {
    expect(deriveLevelFromXP(0)).toEqual({ level: 1, levelName: 'Rookie', xpToNextLevel: 200 });
    expect(deriveLevelFromXP(100)).toEqual({ level: 1, levelName: 'Rookie', xpToNextLevel: 100 });
    expect(deriveLevelFromXP(200)).toEqual({ level: 2, levelName: 'Rookie', xpToNextLevel: 200 });
    expect(deriveLevelFromXP(999)).toEqual({ level: 5, levelName: 'Rookie', xpToNextLevel: 1 });
  });

  it('handles Challenger level thresholds correctly', () => {
    expect(deriveLevelFromXP(1000)).toEqual({ level: 6, levelName: 'Challenger', xpToNextLevel: 600 });
    expect(deriveLevelFromXP(1600)).toEqual({ level: 7, levelName: 'Challenger', xpToNextLevel: 600 });
    expect(deriveLevelFromXP(6999)).toEqual({ level: 15, levelName: 'Challenger', xpToNextLevel: 1 });
  });

  it('handles Athlete level thresholds correctly', () => {
    expect(deriveLevelFromXP(7000)).toEqual({ level: 16, levelName: 'Athlete', xpToNextLevel: 1533 });
    expect(deriveLevelFromXP(8533)).toEqual({ level: 17, levelName: 'Athlete', xpToNextLevel: 1533 });
    expect(deriveLevelFromXP(29999)).toEqual({ level: 30, levelName: 'Athlete', xpToNextLevel: -4 });
  });

  it('handles Elite level thresholds correctly', () => {
    // Elite tier: 2000 XP/level (raised from 1000 to be more expensive than Athlete's ~1533/level)
    expect(deriveLevelFromXP(30000)).toEqual({ level: 31, levelName: 'Elite', xpToNextLevel: 2000 });
    expect(deriveLevelFromXP(32000)).toEqual({ level: 32, levelName: 'Elite', xpToNextLevel: 2000 });
    expect(deriveLevelFromXP(50000)).toEqual({ level: 41, levelName: 'Elite', xpToNextLevel: 2000 });
  });

  it('safely handles negative XP', () => {
    expect(deriveLevelFromXP(-500)).toEqual({ level: 1, levelName: 'Rookie', xpToNextLevel: 200 });
  });
});

describe('xpHelpers — evaluateStreak', () => {
  it('returns streak of 1 if no lastDate provided', () => {
    expect(evaluateStreak(null, 0)).toEqual({ newStreak: 1, streakBonuses: [] });
    expect(evaluateStreak(undefined, 5)).toEqual({ newStreak: 1, streakBonuses: [] });
  });

  it('keeps streak unchanged if logged today', () => {
    const today = new Date();
    expect(evaluateStreak(today, 5)).toEqual({ newStreak: 5, streakBonuses: [] });
  });

  it('increments streak if logged yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(evaluateStreak(yesterday, 5)).toEqual({ newStreak: 6, streakBonuses: [] });
  });

  it('resets streak to 1 if logged two days ago or more', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(evaluateStreak(twoDaysAgo, 5)).toEqual({ newStreak: 1, streakBonuses: [] });
  });

  it('awards streak bonuses appropriately', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(evaluateStreak(yesterday, 6)).toEqual({ newStreak: 7, streakBonuses: ['streak_7'] });
    expect(evaluateStreak(yesterday, 29)).toEqual({ newStreak: 30, streakBonuses: ['streak_30'] });
  });
});

describe('xpHelpers — Aura & Title Activity', () => {
  let mockNow;
  beforeEach(() => {
    mockNow = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isAuraActive returns false if powerUps is falsy or does not contain active aura until time', () => {
    expect(isAuraActive('crimson', null)).toBe(false);
    expect(isAuraActive('crimson', {})).toBe(false);
  });

  it('isAuraActive correctly evaluates Firestore timestamp and Date string/MS until times', () => {
    const mockToDate = vi.fn().mockReturnValue(new Date(mockNow + 1000));
    expect(isAuraActive('crimson', { unlocked_aura_crimson_until: { toDate: mockToDate } })).toBe(true);
    expect(mockToDate).toHaveBeenCalled();

    expect(isAuraActive('crimson', { unlocked_aura_crimson_until: mockNow - 1000 })).toBe(false);
    expect(isAuraActive('crimson', { unlocked_aura_crimson_until: new Date(mockNow + 5000).toISOString() })).toBe(true);
  });

  it('isTitleActive returns false if powerUps is falsy or does not contain active title until time', () => {
    expect(isTitleActive('champion', null)).toBe(false);
    expect(isTitleActive('champion', {})).toBe(false);
  });

  it('isTitleActive correctly evaluates Firestore timestamp and Date string/MS until times', () => {
    const mockToDate = vi.fn().mockReturnValue(new Date(mockNow + 1000));
    expect(isTitleActive('champion', { unlocked_title_champion_until: { toDate: mockToDate } })).toBe(true);
    expect(mockToDate).toHaveBeenCalled();

    expect(isTitleActive('champion', { unlocked_title_champion_until: mockNow - 1000 })).toBe(false);
  });
});

describe('xpHelpers — getAvatarStyle', () => {
  let mockNow;
  beforeEach(() => {
    mockNow = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default borders if resolved aura is not active/valid and level is low', () => {
    const style = getAvatarStyle(null, 1, {});
    expect(style).toEqual({
      boxShadow: 'none',
      borderColor: 'var(--border)',
      borderWidth: '2px',
      borderStyle: 'solid'
    });
  });

  it('evaluates active custom aura colors', () => {
    const powerUps = { unlocked_aura_crimson_until: mockNow + 1000 };
    expect(getAvatarStyle('crimson', 1, powerUps).borderColor).toBe('#ef4444');
    expect(getAvatarStyle('golden', 1, { unlocked_aura_golden_until: mockNow + 1000 }).borderColor).toBe('#eab308');
    expect(getAvatarStyle('shadow', 1, { unlocked_aura_shadow_until: mockNow + 1000 }).borderColor).toBe('#a855f7');
  });

  it('falls back to level-based styles if custom aura is expired or invalid', () => {
    const expiredPowerUps = { unlocked_aura_crimson_until: mockNow - 1000 };
    // Crimson expired, fallback to level-based styling
    // lvl >= 21: golden
    expect(getAvatarStyle('crimson', 25, expiredPowerUps).borderColor).toBe('#eab308');
    // lvl >= 11: crimson
    expect(getAvatarStyle('crimson', 15, expiredPowerUps).borderColor).toBe('#ef4444');
    // lvl >= 6: cyan
    expect(getAvatarStyle('crimson', 8, expiredPowerUps).borderColor).toBe('#06b6d4');
    // lvl < 6: default
    expect(getAvatarStyle('crimson', 3, expiredPowerUps).borderColor).toBe('var(--border)');
  });
});
