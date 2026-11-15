class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private isSuspendedByLifecycle = false;

  constructor() {
    this.setupLifecycleListeners();
  }

  private setupLifecycleListeners() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAll();
        } else {
          this.resumeAll();
        }
      });
      window.addEventListener('blur', () => this.pauseAll());
      window.addEventListener('focus', () => this.resumeAll());
    }
  }

  public pauseAll() {
    this.isSuspendedByLifecycle = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAll() {
    this.isSuspendedByLifecycle = false;
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private ensureCtx(): AudioContext | null {
    if (!this.enabled || this.isSuspendedByLifecycle) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.isSuspendedByLifecycle) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public selectPlate() {
    // Apple-style crisp haptic tap tone
    this.playTone(540, 0.08, 'triangle', 0.12, 0, 720);
  }

  public deselectPlate() {
    this.playTone(440, 0.07, 'triangle', 0.08, 0, 340);
  }

  public invalidTap() {
    this.playTone(210, 0.09, 'sawtooth', 0.05, 0, 170);
    this.playTone(185, 0.11, 'sawtooth', 0.04, 0.05, 150);
  }

  public sliceMove(count: number) {
    // Light airy whoosh + soft sponge pop for each slice
    this.playTone(320, 0.11, 'sine', 0.08, 0, 560);
    const pops = Math.min(count, 4);
    for (let i = 0; i < pops; i++) {
      this.playTone(480 + i * 65, 0.08, 'triangle', 0.1, 0.07 + i * 0.05, 620 + i * 70);
    }
  }

  public cakeMerge(combo = 1) {
    // Ascending patisserie chime arpeggio
    const base = 523.25 * Math.pow(1.06, Math.min(combo - 1, 5)); // C5 shifted up by combo
    const ratios = [1, 1.25, 1.5, 2, 2.5];
    ratios.forEach((r, idx) => {
      this.playTone(base * r, 0.35, 'triangle', 0.12, idx * 0.055);
      this.playTone(base * r * 2, 0.2, 'sine', 0.05, idx * 0.055 + 0.01);
    });
  }

  public coinClink() {
    this.playTone(1318.5, 0.09, 'sine', 0.09, 0);
    this.playTone(1760, 0.16, 'sine', 0.09, 0.05);
  }

  public boosterUse() {
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((n, i) => {
      this.playTone(n, 0.18, 'sine', 0.1, i * 0.045);
    });
  }

  public levelWin() {
    // Cheerful bakery bell & victory chord
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    melody.forEach((n, i) => {
      this.playTone(n, 0.4, 'triangle', 0.14, i * 0.08);
    });
    this.playTone(1046.5, 0.65, 'sine', 0.12, 0.42);
  }
}

export const sound = new SoundEngine();
