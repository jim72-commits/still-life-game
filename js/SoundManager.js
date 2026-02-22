class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.ambientSource = null;
    this.ambientGain = null;
    this.ambientFilter = null;
    this._available = true;
    this._unlocked = false;
    this._loadPreference();
    this._bindGestureListeners();
  }

  // iOS WebKit requires AudioContext creation + an oscillator.start()
  // call to happen synchronously inside a user gesture handler.
  // We listen on capture phase so Phaser's canvas can't swallow the event.
  _bindGestureListeners() {
    const handler = () => {
      this._initAndUnlock();
      this.playAmbient();
    };

    const opts = { capture: true, passive: true };

    ["touchstart", "touchend", "click", "pointerdown"].forEach(evt => {
      document.addEventListener(evt, handler, opts);
    });

    this._gestureHandler = handler;
    this._gestureOpts = opts;
  }

  _removeGestureListeners() {
    if (!this._gestureHandler) return;
    const handler = this._gestureHandler;
    const opts = this._gestureOpts;
    ["touchstart", "touchend", "click", "pointerdown"].forEach(evt => {
      document.removeEventListener(evt, handler, opts);
    });
    this._gestureHandler = null;
  }

  _initAndUnlock() {
    if (this._unlocked) return;

    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
          this._available = false;
          return;
        }
        this.ctx = new Ctor();
      } catch (_) {
        this._available = false;
        return;
      }
    }

    try {
      // Play a silent oscillator synchronously to unlock iOS audio
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.001);
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch (_) {}
      };
    } catch (_) {}

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this._unlocked = true;
    this._removeGestureListeners();
  }

  _getCtx() {
    if (!this._available || !this.ctx) return null;
    if (!this._unlocked) return null;
    try {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (_) {}
    return this.ctx;
  }

  _cleanupNodes(osc, gain) {
    osc.onended = () => {
      try { osc.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
    };
  }

  _loadPreference() {
    try {
      this.muted = localStorage.getItem(LS.muted) === "true";
    } catch (_) {}
  }

  _savePreference() {
    try {
      localStorage.setItem(LS.muted, this.muted);
    } catch (_) {}
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    this._savePreference();
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setTargetAtTime(
          this.muted ? 0 : 0.12,
          this.ctx.currentTime,
          0.1
        );
      }
    } catch (_) {}
    return this.muted;
  }

  // ── Ambient ────────────────────────────────────────────

  playAmbient() {
    try {
      const ctx = this._getCtx();
      if (!ctx || this.ambientSource) return;

      const duration = 8;
      const sr = ctx.sampleRate;
      const len = sr * duration;
      const buffer = ctx.createBuffer(2, len, sr);
      const L = buffer.getChannelData(0);
      const R = buffer.getChannelData(1);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / duration);
        L[i] =
          (Math.sin(2 * Math.PI * 174.6 * t) * 0.25 +
            Math.sin(2 * Math.PI * 220.0 * t) * 0.18 +
            Math.sin(2 * Math.PI * 261.6 * t) * 0.12) *
          env *
          0.08;
        R[i] =
          (Math.sin(2 * Math.PI * 175.0 * t) * 0.25 +
            Math.sin(2 * Math.PI * 220.5 * t) * 0.18 +
            Math.sin(2 * Math.PI * 262.0 * t) * 0.12) *
          env *
          0.08;
      }

      this.ambientFilter = ctx.createBiquadFilter();
      this.ambientFilter.type = "lowpass";
      this.ambientFilter.frequency.value = 800;

      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.value = this.muted ? 0 : 0.12;

      this.ambientSource = ctx.createBufferSource();
      this.ambientSource.buffer = buffer;
      this.ambientSource.loop = true;
      this.ambientSource.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);
      this.ambientSource.start();
    } catch (_) {}
  }

  stopAmbient() {
    try {
      if (!this.ambientSource || !this.ctx) return;
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      }
      const src = this.ambientSource;
      const gain = this.ambientGain;
      const filter = this.ambientFilter;
      this.ambientSource = null;
      this.ambientGain = null;
      this.ambientFilter = null;

      setTimeout(() => {
        try { src.stop(); } catch (_) {}
        try { src.disconnect(); } catch (_) {}
        try { filter.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      }, 2000);
    } catch (_) {}
  }

  // ── UI Sounds (Web Audio API synthesis) ────────────────

  playClick() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (_) {}
  }

  playHintOpen() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.14);
    } catch (_) {}
  }

  playHintClose() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.14);
    } catch (_) {}
  }

  playDragStart() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.04);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (_) {}
  }

  playCardPlace() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.06);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (_) {}
  }

  playCorrect() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const play = (freq, offset, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + offset);
        gain.gain.linearRampToValueAtTime(0.18, t + offset + 0.02);
        gain.gain.setValueAtTime(0.18, t + offset + dur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this._cleanupNodes(osc, gain);
        osc.start(t + offset);
        osc.stop(t + offset + dur + 0.01);
      };
      play(523.25, 0, 0.22);
      play(659.25, 0.2, 0.3);
    } catch (_) {}
  }

  playWrong() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch (_) {}
  }

  playEnding() {
    try {
      if (this.muted) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;

      const play = (freq, detune) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 1);
        gain.gain.setValueAtTime(0.1, t + 2);
        gain.gain.linearRampToValueAtTime(0, t + 3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this._cleanupNodes(osc, gain);
        osc.start(t);
        osc.stop(t + 3.1);
      };
      play(261.6, 0);
      play(329.6, 0);
      play(392.0, 3);
    } catch (_) {}
  }
}

const soundManager = new SoundManager();
