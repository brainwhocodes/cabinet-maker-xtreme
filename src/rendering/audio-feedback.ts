// Web Audio API Synthesizer for tactile 3D feedback

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Plays an ultra-subtle, crisp 8ms tick when an entity snaps to a guideline or boundary.
 * Gracefully handles browsers where AudioContext is not initialized until user interaction.
 */
export function playSnapSound(): void {
  if (!soundEnabled || typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext ??
      ('webkitAudioContext' in window
        ? (window['webkitAudioContext' as keyof Window] as typeof AudioContext)
        : undefined);
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
      return;
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // High, subtle click (880Hz to 440Hz fast pitch-drop over 12ms)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.012);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.014);
  } catch {
    // Non-critical audio failure fallback
  }
}
