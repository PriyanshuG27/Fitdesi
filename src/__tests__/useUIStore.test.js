import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUIStore } from '../stores/useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.setState({
      toasts:       [],
      activeModal:  null,
      modalPayload: null,
      theme:        'dark',
      mobileTab:    'home',
      sidebarOpen:  true,
      pwaDeferredPrompt: null,
      pwaInstallable: false,
      isStandalone: false,
      isIOS: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a toast, auto-removes it after duration', () => {
    useUIStore.getState().addToast('Workout Completed!', 'success', 2000);

    let toasts = useUIStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Workout Completed!');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].duration).toBe(2000);

    vi.advanceTimersByTime(2001);

    toasts = useUIStore.getState().toasts;
    expect(toasts.length).toBe(0);
  });

  it('removes a toast manually by ID', () => {
    useUIStore.getState().addToast('Toast 1');
    useUIStore.getState().addToast('Toast 2');

    let toasts = useUIStore.getState().toasts;
    expect(toasts.length).toBe(2);

    const firstId = toasts[0].id;
    useUIStore.getState().removeToast(firstId);

    toasts = useUIStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Toast 2');
  });

  it('opens and closes modals with payload', () => {
    useUIStore.getState().openModal('levelUp', { newLevel: 5 });

    let state = useUIStore.getState();
    expect(state.activeModal).toBe('levelUp');
    expect(state.modalPayload).toEqual({ newLevel: 5 });

    useUIStore.getState().closeModal();

    state = useUIStore.getState();
    expect(state.activeModal).toBeNull();
    expect(state.modalPayload).toBeNull();
  });

  it('sets mobile active tab correctly', () => {
    useUIStore.getState().setMobileTab('plan');
    expect(useUIStore.getState().mobileTab).toBe('plan');
  });

  it('toggles desktop sidebar collapse state', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('manages PWA deferred install prompts', () => {
    const mockPrompt = { prompt: vi.fn() };
    useUIStore.getState().setPwaDeferredPrompt(mockPrompt);

    let state = useUIStore.getState();
    expect(state.pwaDeferredPrompt).toBe(mockPrompt);
    expect(state.pwaInstallable).toBe(true);

    useUIStore.getState().clearPwaDeferredPrompt();

    state = useUIStore.getState();
    expect(state.pwaDeferredPrompt).toBeNull();
    expect(state.pwaInstallable).toBe(false);
  });

  it('updates standalone and iOS platform detection states', () => {
    useUIStore.getState().setIsStandalone(true);
    useUIStore.getState().setIsIOS(true);

    const state = useUIStore.getState();
    expect(state.isIOS).toBe(true);
    expect(state.isStandalone).toBe(true);
  });
});
