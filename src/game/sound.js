export class SoundFX {
  constructor(initialEnabled = true) {
    this.ctx = null;
    this.enabled = initialEnabled;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.suspend();
    }
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore audio restriction errors
    }
  }

  suspend() {
    try {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  resume() {
    if (!this.enabled) return;
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  playTone(freq, type = 'sine', duration = 0.12, vol = 0.18, slideFreq = null) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
      }

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Fallback silently
    }
  }

  pickup() {
    this.playTone(320, 'sine', 0.08, 0.15, 480);
  }

  invalid() {
    this.playTone(210, 'triangle', 0.14, 0.15, 140);
  }

  place() {
    this.playTone(180, 'triangle', 0.09, 0.24, 290);
    setTimeout(() => this.playTone(390, 'sine', 0.06, 0.12), 25);
  }

  hammer() {
    this.playTone(140, 'sawtooth', 0.18, 0.22, 65);
    setTimeout(() => this.playTone(440, 'triangle', 0.12, 0.14, 260), 30);
  }

  defuse() {
    this.playTone(620, 'sine', 0.09, 0.18, 880);
    setTimeout(() => this.playTone(987.77, 'triangle', 0.14, 0.18), 55);
  }

  clear(linesCount, combo) {
    if (!this.enabled) return;
    this.init();
    const baseNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    const pitchBoost = Math.min(combo * 45, 350);
    const count = Math.min(linesCount + 2, 6);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const freq = baseNotes[i % baseNotes.length] + pitchBoost;
        this.playTone(freq, 'triangle', 0.22, 0.22, freq * 1.04);
      }, i * 55);
    }
  }

  allClear() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    fanfare.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.28, 0.24), idx * 65);
    });
  }

  levelWin() {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.24, 0.22), idx * 80);
    });
  }

  gameOver() {
    const notes = [392, 349.23, 329.63, 261.63];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.28, 0.12, f * 0.92), idx * 140);
    });
  }
}
