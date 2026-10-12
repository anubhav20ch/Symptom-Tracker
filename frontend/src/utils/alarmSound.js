/**
 * Comprehensive Web Audio Alarm Synthesizer with 8 Sound Styles & 8 Volume Levels.
 * Exclusively controlled by the patient user (protected from doctor modification).
 */

export const ALARM_SOUND_PRESETS = [
  { id: 'gentle_chime', name: 'Gentle Medical Chime', desc: 'Soothing three-tone clinical chime (E5-G5-C6)', icon: '🔔' },
  { id: 'morning_harp', name: 'Morning Harp Melody', desc: 'Ascending 5-note gentle harp arpeggio', icon: '🎵' },
  { id: 'digital_beep', name: 'Hospital Digital Pulse', desc: 'Crisp dual-tone modern telemetry beep', icon: '📟' },
  { id: 'zen_bell', name: 'Zen Bowl Resonance', desc: 'Tranquil 528Hz healing singing bowl with harmonic decay', icon: '🧘' },
  { id: 'soft_marimba', name: 'Acoustic Marimba', desc: 'Warm wooden acoustic strike with rich overtones', icon: '🪵' },
  { id: 'celestial_chord', name: 'Celestial Ambient Pad', desc: 'Lush 3-note harmonic major chord', icon: '✨' },
  { id: 'clinical_alert', name: 'Urgent Clinical Alert', desc: 'Crisp tri-tone staccato attention prompt', icon: '🚨' },
  { id: 'minimal_ping', name: 'Minimalist Focus Ping', desc: 'Subtle high-clarity single notification pulse', icon: '💧' },
];

export const ALARM_VOLUME_LEVELS = [
  { value: 0.0, label: 'Mute (0%)', badge: 'Silent' },
  { value: 0.15, label: 'Level 1: Whisper (15%)', badge: '15%' },
  { value: 0.30, label: 'Level 2: Quiet (30%)', badge: '30%' },
  { value: 0.45, label: 'Level 3: Soft (45%)', badge: '45%' },
  { value: 0.60, label: 'Level 4: Moderate (60%)', badge: '60%' },
  { value: 0.75, label: 'Level 5: Standard (75%)', badge: '75%' },
  { value: 0.90, label: 'Level 6: Loud (90%)', badge: '90%' },
  { value: 1.0, label: 'Level 7: Maximum (100%)', badge: '100%' },
];

class AlarmSoundService {
  constructor() {
    this.audioCtx = null;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  getVolume() {
    const saved = localStorage.getItem('symptomlog_alarm_volume');
    return saved !== null ? parseFloat(saved) : 0.75;
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, parseFloat(vol)));
    localStorage.setItem('symptomlog_alarm_volume', String(clamped));
  }

  getSelectedSound() {
    return localStorage.getItem('symptomlog_alarm_sound') || 'gentle_chime';
  }

  setSelectedSound(soundId) {
    localStorage.setItem('symptomlog_alarm_sound', soundId);
  }

  /**
   * Plays the specified sound with the specified (or stored) volume level.
   */
  playSound(soundId = null, volume = null) {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const activeSound = soundId || this.getSelectedSound();
      const masterVol = volume !== null ? parseFloat(volume) : this.getVolume();

      if (masterVol <= 0) return; // Muted

      const now = this.audioCtx.currentTime;

      switch (activeSound) {
        case 'gentle_chime':
          this._playNotes([659.25, 783.99, 1046.5], 0.18, 0.45, masterVol, 'sine');
          break;

        case 'morning_harp':
          this._playNotes([523.25, 659.25, 783.99, 987.77, 1046.5], 0.11, 0.6, masterVol * 0.9, 'triangle');
          break;

        case 'digital_beep':
          this._playPulse([880, 880], [now, now + 0.12], 0.07, masterVol * 0.8, 'square');
          break;

        case 'zen_bell':
          this._playZenBell(528, masterVol * 1.1);
          break;

        case 'soft_marimba':
          this._playMarimba([440, 554.37, 659.25], 0.14, masterVol * 1.0);
          break;

        case 'celestial_chord':
          this._playChord([523.25, 659.25, 783.99], 1.2, masterVol * 0.7);
          break;

        case 'clinical_alert':
          this._playNotes([740, 880, 1174.66], 0.12, 0.25, masterVol * 0.9, 'sawtooth');
          break;

        case 'minimal_ping':
        default:
          this._playSinglePing(1200, masterVol * 0.9);
          break;
      }
    } catch (e) {
      console.warn('[AlarmSound] Audio playback failed:', e);
    }
  }

  playChime() {
    this.playSound();
  }

  _playNotes(notes, interval, decay, volume, type = 'sine') {
    const now = this.audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + idx * interval);

      gain.gain.setValueAtTime(0, now + idx * interval);
      gain.gain.linearRampToValueAtTime(0.3 * volume, now + idx * interval + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * interval + decay);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + idx * interval);
      osc.stop(now + idx * interval + decay + 0.05);
    });
  }

  _playPulse(freqs, startTimes, duration, volume, type = 'square') {
    freqs.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;

      const t = startTimes[idx];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18 * volume, t + 0.01);
      gain.gain.setValueAtTime(0.18 * volume, t + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + duration);
    });
  }

  _playZenBell(freq, volume) {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const oscHarmonic = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.value = freq * 2.01;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35 * volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.8);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 1.9);
    oscHarmonic.stop(now + 1.9);
  }

  _playMarimba(notes, interval, volume) {
    const now = this.audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * interval);

      gain.gain.setValueAtTime(0, now + idx * interval);
      gain.gain.linearRampToValueAtTime(0.4 * volume, now + idx * interval + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * interval + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + idx * interval);
      osc.stop(now + idx * interval + 0.4);
    });
  }

  _playChord(freqs, duration, volume) {
    const now = this.audioCtx.currentTime;
    freqs.forEach((freq) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime((0.25 / freqs.length) * volume, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  _playSinglePing(freq, volume) {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 * volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const alarmSound = new AlarmSoundService();
