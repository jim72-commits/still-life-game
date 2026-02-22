// LetterScene — reward letter for completing Chapter 1.
// The letter is a pure HTML/CSS overlay injected into document.body.
// Phaser provides the scene lifecycle and the warm ambient background.
class LetterScene extends Phaser.Scene {
  constructor() {
    super('LetterScene');
  }

  create() {
    this._el = [];
    this._closed = false;
    this._ambientOsc = null;
    this._ambientGain = null;

    // Phaser canvas: near-black background, fade in
    this.cameras.main.setBackgroundColor(0x0f0f0f);
    this.cameras.main.fadeIn(400, 15, 15, 15);

    // Disable Phaser input for this scene - all interaction is through HTML
    // This prevents mobile touch capture issues
    if (this.input) {
      this.input.enabled = false;
      console.log('[LetterScene] Phaser input disabled (scene uses HTML only)');
    }

    // Mark as read (permanent — not cleared by resetAll)
    try { localStorage.setItem(LS.letterRead(), 'true'); } catch (_) {}

    // Inject HTML elements
    this._injectSVGFilter();
    this._injectBackdrop();
    this._injectLetterPaper();
    this._injectScrollChevron();
    this._injectCloseButton();

    // Audio (reuses soundManager's unlocked AudioContext)
    this._playAudio();

    // Sequential content fade-in
    this._runSequence();

    // Ensure cleanup if scene is stopped externally
    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy', () => this._cleanup());
  }

  // ── Utilities ──────────────────────────────────────────

  _formatDate() {
    const d = new Date();
    const n = d.getDate();
    const ord = (n >= 11 && n <= 13) ? 'th'
      : n % 10 === 1 ? 'st'
      : n % 10 === 2 ? 'nd'
      : n % 10 === 3 ? 'rd' : 'th';
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${n}${ord} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  _css(el, styles) {
    Object.assign(el.style, styles);
    return el;
  }

  _append(el) {
    document.body.appendChild(el);
    this._el.push(el);
    return el;
  }

  // ── SVG paper-texture filter ───────────────────────────

  _injectSVGFilter() {
    if (document.getElementById('sl-paper-svg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'sl-paper-svg';
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
    svg.innerHTML = `<defs>
      <filter id="sl-paper-filter" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65"
          numOctaves="3" stitchTiles="stitch" result="noise"/>
        <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
        <feBlend in="SourceGraphic" in2="grey" mode="multiply"/>
      </filter>
    </defs>`;
    this._append(svg);
  }

  // ── Full-screen backdrop with radial warm glow ─────────

  _injectBackdrop() {
    const bd = document.createElement('div');
    this._css(bd, {
      position: 'fixed', inset: '0',
      background: '#0f0f0f',
      zIndex: '500',
      opacity: '0',
      transition: 'opacity 1.5s ease',
      pointerEvents: 'none',
    });
    const glow = document.createElement('div');
    this._css(glow, {
      position: 'absolute', inset: '0',
      background: 'radial-gradient(ellipse 75% 55% at 50% 48%, ' +
        'rgba(192,160,96,0.09) 0%, rgba(192,160,96,0.05) 35%, transparent 65%)',
    });
    bd.appendChild(glow);
    this._append(bd);
    this._backdrop = bd;

    // Trigger glow fade-in on next paint (two rAF ensures DOM flush)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bd.style.opacity = '1';
    }));
  }

  // ── Letter paper (HTML overlay) ────────────────────────

  _injectLetterPaper() {
    const short = window.innerHeight < 500;
    const fsSub = short ? 1 : 0;

    const paper = document.createElement('div');
    paper.id = 'sl-paper';
    this._css(paper, {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%) translateY(80px)',
      width: 'min(580px, 88vw)',
      maxHeight: short ? '85vh' : '88vh',
      overflowY: 'auto',
      background: '#f7f2e8',
      borderRadius: '2px',
      padding: short ? '36px 32px 80px 32px' : '52px 48px 80px 48px',
      boxShadow: [
        '0 2px 4px rgba(0,0,0,0.08)',
        '0 8px 24px rgba(0,0,0,0.35)',
        '0 32px 64px rgba(0,0,0,0.5)',
        'inset 0 1px 0 rgba(255,255,255,0.8)',
      ].join(', '),
      opacity: '0',
      transition: 'transform 900ms cubic-bezier(.22,1,.36,1), opacity 900ms ease-out',
      zIndex: '600',
      boxSizing: 'border-box',
      fontFamily: "'Lora', Georgia, serif",
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      pointerEvents: 'auto',
    });

    // Paper texture overlay (SVG noise at 3% opacity)
    const tex = document.createElement('div');
    this._css(tex, {
      position: 'absolute', inset: '0',
      filter: 'url(#sl-paper-filter)',
      opacity: '0.03',
      pointerEvents: 'none',
      borderRadius: '2px',
      background: '#777',
    });
    paper.appendChild(tex);

    // Top edge fold shadow
    const fold = document.createElement('div');
    this._css(fold, {
      position: 'absolute', top: '0', left: '0', right: '0', height: '4px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.06) 0px, transparent 4px)',
      pointerEvents: 'none',
    });
    paper.appendChild(fold);

    // Left margin rule line
    const margin = document.createElement('div');
    this._css(margin, {
      position: 'absolute',
      left: short ? '72px' : '88px',
      top: '0', bottom: '0',
      width: '1px',
      background: 'rgba(210,180,160,0.4)',
      pointerEvents: 'none',
    });
    paper.appendChild(margin);

    // Content container (above texture overlay in z-order)
    const content = document.createElement('div');
    this._css(content, { position: 'relative', zIndex: '1' });
    this._buildLetterContent(content, fsSub);
    paper.appendChild(content);

    // Bottom scroll-fade gradient
    const fade = document.createElement('div');
    this._css(fade, {
      position: 'sticky', bottom: '0',
      left: '0', right: '0', height: '40px',
      background: 'linear-gradient(to bottom, transparent, #f7f2e8)',
      pointerEvents: 'none',
      marginTop: '-40px',
    });
    paper.appendChild(fade);

    this._append(paper);
    this._paper = paper;

    // Trigger slide-up entrance
    setTimeout(() => {
      paper.style.transform = 'translate(-50%, -50%) translateY(0)';
      paper.style.opacity = '1';
    }, 50);

    // Hide chevron when scrolled to bottom
    paper.addEventListener('scroll', () => {
      const ch = document.getElementById('sl-chevron');
      if (ch) {
        const atBottom = paper.scrollTop + paper.clientHeight >= paper.scrollHeight - 24;
        ch.style.opacity = atBottom ? '0' : '0.5';
      }
    });
  }

  _buildLetterContent(wrapper, fsSub) {
    const fs = n => `${n - fsSub}px`;

    const el = (tag, id, styles, html) => {
      const node = document.createElement(tag);
      if (id) node.id = id;
      this._css(node, {
        opacity: '0',
        transition: 'opacity 700ms ease',
        fontFamily: "'Lora', Georgia, serif",
        ...styles,
      });
      if (html !== undefined) {
        if (typeof html === 'string' && html.includes('<')) node.innerHTML = html;
        else if (html !== '') node.textContent = html;
      }
      wrapper.appendChild(node);
      return node;
    };

    // Date
    el('div', 'sl-date', {
      fontStyle: 'italic', fontSize: fs(13),
      color: '#8a7a6a', textAlign: 'right',
      marginBottom: '32px', transition: 'opacity 600ms ease',
    }, this._formatDate());

    // Salutation
    el('div', 'sl-sal', {
      fontStyle: 'italic', fontSize: fs(18), lineHeight: '1.4',
      color: '#2a1a0a', marginBottom: '28px', transition: 'opacity 700ms ease',
    }, 'To whoever read the evidence,');

    // Paragraph 1
    el('div', 'sl-p1', {
      fontSize: fs(16), lineHeight: '1.85',
      color: '#1a1a1a', marginBottom: '22px', transition: 'opacity 800ms ease',
    }, 'You didn\u2019t have to stay.<br><br>' +
       'Most people would have looked at the first room and moved on. ' +
       'But you stayed with us through all of it \u2014 the ordinary mornings, ' +
       'the quiet tensions, the nights when things felt unrepairable.');

    // Paragraph 2 — quiet acknowledgements, wider line height
    el('div', 'sl-p2', {
      fontSize: fs(16), lineHeight: '2.1',
      color: '#1a1a1a', marginBottom: '22px', transition: 'opacity 800ms ease',
    }, 'You saw the drawing torn in half.<br>' +
       'You noticed when the second cup went missing.<br>' +
       'You were there when the third coat finally came back to the hook.');

    // Paragraph 3
    el('div', 'sl-p3', {
      fontSize: fs(16), lineHeight: '1.85',
      color: '#1a1a1a', marginBottom: '22px', transition: 'opacity 800ms ease',
    }, 'We never knew anyone was watching. But somehow, knowing that you were \u2014 ' +
       'that someone bore witness to all of it \u2014 makes the year feel less like ' +
       'something that happened to us, and more like something we lived through together.');

    // Paragraph 4a — "The house is quieter now."
    el('div', 'sl-p4a', {
      fontStyle: 'italic', fontSize: fs(16), lineHeight: '2',
      color: '#2a1a0a', marginBottom: '4px', transition: 'opacity 900ms ease',
    }, 'The house is quieter now.');

    // Paragraph 4b — "In a good way." (600ms after 4a — its own breath)
    el('div', 'sl-p4b', {
      fontStyle: 'italic', fontSize: fs(16), lineHeight: '2',
      color: '#2a1a0a', marginBottom: '28px', transition: 'opacity 900ms ease',
    }, 'In a good way.');

    // Divider
    el('div', 'sl-div', {
      width: '48px', height: '1px', background: '#c0a060',
      margin: '0 auto 28px auto', transition: 'opacity 600ms ease',
    }, '');

    // Closing
    el('div', 'sl-closing', {
      fontStyle: 'italic', fontSize: fs(17), lineHeight: '1.6',
      color: '#2a1a0a', marginBottom: '20px', transition: 'opacity 700ms ease',
    }, 'Thank you for investigating.');

    // Signature
    el('div', 'sl-sig', {
      fontStyle: 'italic', fontSize: fs(20), fontWeight: '500',
      color: '#8a6a20', marginBottom: '36px', transition: 'opacity 800ms ease',
    }, '\u2014 The House');

    // Footer
    el('div', 'sl-footer', {
      fontFamily: "'Courier New', monospace",
      fontSize: `${11 - fsSub}px`, lineHeight: '1',
      color: '#aaa090', textAlign: 'center',
      letterSpacing: '.08em', transition: 'opacity 600ms ease',
    }, 'Case File: The House \u2014 Chapter 1 \u2014 Closed');
  }

  // ── Scroll chevron ─────────────────────────────────────

  _injectScrollChevron() {
    const ch = document.createElement('div');
    ch.id = 'sl-chevron';
    this._css(ch, {
      position: 'fixed',
      bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '650',
      opacity: '0',
      transition: 'opacity 400ms ease',
      pointerEvents: 'none',
      color: '#8a7a6a',
      fontSize: '22px',
      lineHeight: '1',
      userSelect: 'none',
    });
    ch.innerHTML = '&#8964;';
    this._append(ch);
    this._chevron = ch;

    // Show only if content overflows — check after letter entrance finishes
    setTimeout(() => {
      if (this._paper && this._paper.scrollHeight > this._paper.clientHeight) {
        ch.style.opacity = '0.5';
      }
    }, 1200);
  }

  // ── Close button ───────────────────────────────────────

  _injectCloseButton() {
    const btn = document.createElement('button');
    btn.id = 'sl-close-btn';
    this._css(btn, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px', lineHeight: '1',
      letterSpacing: '.12em', textTransform: 'uppercase',
      color: '#555566', background: 'transparent',
      border: '1px solid #333344', borderRadius: '2px',
      padding: '12px 32px', cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 600ms ease, color 200ms ease, border-color 200ms ease',
      position: 'fixed',
      bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: '700',
      outline: 'none', WebkitAppearance: 'none', appearance: 'none',
      pointerEvents: 'auto',
    });
    btn.textContent = 'Accomplishments';
    btn.addEventListener('mouseover', () => {
      btn.style.color = '#d8d8e8';
      btn.style.borderColor = '#666677';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.color = '#555566';
      btn.style.borderColor = '#333344';
    });
    btn.addEventListener('click', () => this._close());
    btn.addEventListener('touchend', (e) => { e.preventDefault(); this._close(); });
    this._append(btn);
  }

  // ── Sequential fade-in ─────────────────────────────────

  _runSequence() {
    const show = (id, delay) => {
      setTimeout(() => {
        if (this._closed) return;
        const node = document.getElementById(id);
        if (node) node.style.opacity = '1';
      }, delay);
    };

    show('sl-date',      900);
    show('sl-sal',      1500);
    show('sl-p1',       2200);
    show('sl-p2',       3200);
    show('sl-p3',       4300);
    show('sl-p4a',      5400);
    show('sl-p4b',      6000);  // "In a good way." — its own breath
    show('sl-div',      7000);
    show('sl-closing',  7600);
    show('sl-sig',      8400);
    show('sl-footer',   9200);
    show('sl-close-btn', 10200);
  }

  // ── Audio ──────────────────────────────────────────────

  _playAudio() {
    try {
      // Reuse soundManager's AudioContext — already unlocked by player interaction
      const ctx = soundManager && soundManager.ctx &&
                  soundManager.ctx.state === 'running' ? soundManager.ctx : null;
      if (!ctx) return;

      const t = ctx.currentTime;

      // Paper-handling sound: white noise burst through high-pass filter
      const dur = 0.5;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 2000;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      noise.connect(hpf);
      hpf.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + dur + 0.05);

      // Ambient 60hz tone — starts when the letter paper lands (t + 0.9s)
      // Very quiet; players feel warmth without consciously noticing it
      const ambT = t + 0.9;
      this._ambientOsc = ctx.createOscillator();
      this._ambientOsc.type = 'sine';
      this._ambientOsc.frequency.value = 60;
      this._ambientGain = ctx.createGain();
      this._ambientGain.gain.setValueAtTime(0, ambT);
      this._ambientGain.gain.linearRampToValueAtTime(0.04, ambT + 1.0);
      this._ambientOsc.connect(this._ambientGain);
      this._ambientGain.connect(ctx.destination);
      this._ambientOsc.start(ambT);
    } catch (_) {}
  }

  // ── Close & cleanup ────────────────────────────────────

  _close() {
    if (this._closed) return;
    this._closed = true;
    console.log('[LetterScene] Close initiated');

    // Fade out ambient tone
    try {
      if (this._ambientGain && soundManager.ctx) {
        const ctx = soundManager.ctx;
        this._ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        setTimeout(() => {
          try {
            this._ambientOsc.stop();
            this._ambientOsc.disconnect();
            this._ambientGain.disconnect();
          } catch (_) {}
        }, 700);
      }
    } catch (_) {}

    // Fade out all HTML elements simultaneously and disable their pointer events
    // so they don't block the next scene during the transition.
    this._el.forEach(el => {
      el.style.transition = 'opacity 500ms ease';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    });

    // Clean up DOM immediately (elements are already invisible + non-interactive)
    this._cleanup();
    
    // AGGRESSIVE: Force remove any LetterScene elements that might still exist
    const forceCleanup = () => {
      const ids = ['sl-paper-svg', 'sl-backdrop', 'sl-paper', 'sl-chevron', 'sl-close-btn'];
      let removed = 0;
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
          removed++;
        }
      });
      // Also check for any orphaned elements by class or attribute
      document.querySelectorAll('[id^="sl-"]').forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
          removed++;
        }
      });
      return removed;
    };
    const cleaned = forceCleanup();
    console.log('[LetterScene] HTML cleanup complete, removed:', cleaned, 'elements');
    
    // CRITICAL: Disable this scene's input system immediately (fixes mobile touch capture)
    if (this.input) {
      this.input.enabled = false;
      console.log('[LetterScene] Phaser input disabled');
    }
    
    // Mobile needs a tiny delay to ensure DOM cleanup completes
    const delay = 50; // 50ms delay for mobile browsers to process DOM removal
    setTimeout(() => {
      console.log('[LetterScene] Stopping LetterScene, starting SummaryScene');
      try {
        this.scene.stop('LetterScene');
        this.scene.start('SummaryScene');
      } catch (e) {
        console.error('[LetterScene] Error transitioning:', e);
      }
    }, delay);
  }

  _cleanup() {
    for (const el of this._el) {
      try { document.body.removeChild(el); } catch (_) {}
    }
    this._el = [];
  }
}
