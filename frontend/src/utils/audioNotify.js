// Web Audio API Synthesizer - 100% Client-side, zero latency, no external mp3 file dependencies
class AudioNotificationEngine {
  constructor() {
    this.audioCtx = null;
    this.titleBlinkInterval = null;
    this.originalTitle = '';
    this.isBlinking = false;
    this.soundEnabled = localStorage.getItem('ticketpro_audio_alerts_enabled') !== 'false';

    // Auto-resume audio context on first user interaction to satisfy browser autoplay policies
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });

      // Stop title blink on tab focus
      window.addEventListener('focus', () => {
        this.stopTitleBlink();
      });
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('ticketpro_audio_alerts_enabled', enabled ? 'true' : 'false');
  }

  toggleSound() {
    const newState = !this.soundEnabled;
    this.setSoundEnabled(newState);
    if (newState) {
      this.playChime();
    }
    return newState;
  }

  // Play standard gentle message chime (D5 -> A5)
  playChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (_e) {
      // Audio autoplay policy fallback
    }
  }

  // Play upbeat ticket assignment chime (C5 -> E5 -> G5)
  playAssignmentChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [
        { freq: 523.25, time: 0, dur: 0.10 },     // C5
        { freq: 659.25, time: 0.10, dur: 0.10 },   // E5
        { freq: 783.99, time: 0.20, dur: 0.20 }    // G5
      ].forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.14, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch (_e) {}
  }

  // Play urgent alert chime for Critical SLA or high priority tickets
  playUrgentAlert() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [
        { freq: 659.25, time: 0, dur: 0.12 },
        { freq: 880.00, time: 0.13, dur: 0.12 },
        { freq: 1046.50, time: 0.26, dur: 0.28 }
      ].forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.18, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch (_e) {}
  }

  // Request native OS/Browser notification permission
  async requestPushPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (_e) {}
    }
  }

  // Trigger system notification if window is minimized or unfocused
  showSystemNotification(title, options = {}) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });

        notif.onclick = () => {
          window.focus();
          if (options.data && options.data.link) {
            window.location.href = options.data.link;
          }
          notif.close();
        };

        // Auto close notification after 6 seconds
        setTimeout(() => {
          try { notif.close(); } catch (_e) {}
        }, 6000);
      } catch (_e) {}
    }
  }

  // Flash browser tab title to alert agent working on other tabs
  flashTabTitle(alertText) {
    if (typeof document === 'undefined') return;

    if (!this.isBlinking) {
      this.originalTitle = document.title || 'TicketPro Helpdesk';
    }

    this.stopTitleBlink();
    this.isBlinking = true;

    let toggle = false;
    this.titleBlinkInterval = setInterval(() => {
      document.title = toggle ? alertText : this.originalTitle;
      toggle = !toggle;
    }, 1000);
  }

  stopTitleBlink() {
    if (this.titleBlinkInterval) {
      clearInterval(this.titleBlinkInterval);
      this.titleBlinkInterval = null;
    }
    if (this.isBlinking && this.originalTitle) {
      document.title = this.originalTitle;
      this.isBlinking = false;
    }
  }
}

export const audioNotifier = new AudioNotificationEngine();
