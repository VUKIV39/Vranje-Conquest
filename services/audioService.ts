
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Default volume 30%
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error(e));
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      // Smooth fade to avoid clicking
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(this.enabled ? 0.3 : 0, t + 0.1);
    }
    return this.enabled;
  }
  
  isEnabled() {
    return this.enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + duration);
  }

  private playNoise(duration: number) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    // Lowpass filter for explosion/thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(t);
  }

  playClick() {
    this.init();
    this.playTone(800, 'sine', 0.05);
  }

  playError() {
    this.init();
    this.playTone(150, 'sawtooth', 0.3);
  }

  playCash() {
    this.init();
    this.playTone(1200, 'sine', 0.1);
    this.playTone(1600, 'sine', 0.4, 0.08);
  }

  playBuild() {
    this.init();
    // Hammer thud
    this.playTone(100, 'square', 0.15);
    this.playTone(80, 'square', 0.15, 0.2);
  }

  playMove() {
    this.init();
    // Swoosh
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(400, t + 0.2);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playCombat() {
    this.init();
    this.playNoise(0.4); // Explosion/Gunshot
  }

  playEvent() {
    this.init();
    // Notification chime
    this.playTone(523.25, 'triangle', 0.2); // C
    this.playTone(659.25, 'triangle', 0.6, 0.15); // E
  }

  playVictory() {
    this.init();
    // Fanfare
    const now = 0;
    this.playTone(523.25, 'sawtooth', 0.4, 0);
    this.playTone(523.25, 'sawtooth', 0.4, 0.2);
    this.playTone(523.25, 'sawtooth', 0.4, 0.4);
    this.playTone(659.25, 'sawtooth', 1.5, 0.6);
  }
}

export const audio = new AudioService();
