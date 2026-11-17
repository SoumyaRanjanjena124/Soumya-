// Subtle synthesized Web Audio API feedback for Flipper Zero CyberDeck

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(next: boolean) {
    this.enabled = next;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone({
    freq,
    endFreq,
    duration = 0.055,
    gain = 0.045,
    type = 'sine',
    delay = 0,
  }: {
    freq: number;
    endFreq?: number;
    duration?: number;
    gain?: number;
    type?: OscillatorType;
    delay?: number;
  }) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(endFreq, 20),
        now + duration
      );
    }

    // Smooth micro-envelope to avoid speaker click
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playPinKeyBeep(digit?: string) {
    const num = digit !== undefined ? Number(digit) : 5;
    // Subtle pitch variation across 0-9 centered around crisp hardware beep
    const baseFreq = Number.isFinite(num) ? 680 + num * 28 : 780;
    this.playTone({
      freq: baseFreq,
      endFreq: baseFreq * 1.04,
      duration: 0.048,
      gain: 0.04,
      type: 'triangle',
    });
  }

  public playPinActionBeep(action: 'backspace' | 'clear') {
    if (action === 'backspace') {
      this.playTone({
        freq: 480,
        endFreq: 340,
        duration: 0.045,
        gain: 0.035,
        type: 'sine',
      });
    } else {
      this.playTone({
        freq: 420,
        endFreq: 260,
        duration: 0.075,
        gain: 0.038,
        type: 'sine',
      });
    }
  }

  public playNfcMilestoneBeep(milestone: 25 | 50 | 75 | 100) {
    if (milestone === 25) {
      this.playTone({
        freq: 587.33, // D5
        duration: 0.055,
        gain: 0.038,
        type: 'sine',
      });
    } else if (milestone === 50) {
      this.playTone({
        freq: 739.99, // F#5
        duration: 0.06,
        gain: 0.042,
        type: 'sine',
      });
    } else if (milestone === 75) {
      this.playTone({
        freq: 880.0, // A5
        duration: 0.065,
        gain: 0.046,
        type: 'sine',
      });
    } else {
      // 100% NFC Lock Chime
      this.playTone({
        freq: 1046.5, // C6
        duration: 0.075,
        gain: 0.048,
        type: 'sine',
      });
      this.playTone({
        freq: 1318.51, // E6
        duration: 0.11,
        gain: 0.045,
        type: 'triangle',
        delay: 0.065,
      });
    }
  }

  public playScanPing() {
    this.playTone({
      freq: 520,
      endFreq: 780,
      duration: 0.085,
      gain: 0.036,
      type: 'sine',
    });
  }

  public playDeviceFoundBeep(index = 0) {
    const pitch = 760 + (index % 5) * 70;
    this.playTone({
      freq: pitch,
      endFreq: pitch * 1.06,
      duration: 0.045,
      gain: 0.032,
      type: 'triangle',
    });
  }

  public playAuthResult(result: 'granted' | 'denied') {
    if (result === 'granted') {
      this.playTone({
        freq: 659.25,
        duration: 0.07,
        gain: 0.04,
        type: 'sine',
      });
      this.playTone({
        freq: 987.77,
        duration: 0.13,
        gain: 0.045,
        type: 'sine',
        delay: 0.07,
      });
    } else {
      this.playTone({
        freq: 220,
        endFreq: 185,
        duration: 0.08,
        gain: 0.048,
        type: 'sawtooth',
      });
      this.playTone({
        freq: 195,
        endFreq: 155,
        duration: 0.1,
        gain: 0.045,
        type: 'sawtooth',
        delay: 0.095,
      });
    }
  }
}

export const cyberAudio = new CyberAudioEngine();
