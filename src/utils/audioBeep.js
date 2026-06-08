/**
 * Plays a loud, pleasant synthetic audio beep to alert the user
 * when a rest timer reaches zero. Bypasses typical iOS background restrictions.
 */
export function playRestTimerBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Create synthesizer nodes
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Sound settings: retro synth sine wave at A5 (880Hz)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    
    // Neubrutalist punchy fade out envelope: Start at full volume, ramp down to 0.001 exponentially
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
    
    // Play for 1 second
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1.0);
  } catch (err) {
    console.warn('[audioBeep] Failed to play synthetic rest timer beep:', err);
  }
}
