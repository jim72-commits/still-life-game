class SummaryScene extends Phaser.Scene {
  constructor() {
    super("SummaryScene");
  }

  create() {
    console.log('[SummaryScene] Scene starting');
    
    // Disable canvas pointer events so HTML buttons receive touch events
    const canvas = this.sys.game.canvas;
    if (canvas) {
      canvas.style.pointerEvents = 'none';
      console.log('[SummaryScene] Canvas pointer-events set to: none (for HTML buttons)');
    }
    
    // Track HTML elements for cleanup
    this._htmlElements = [];

    // Clean up any LetterScene HTML that might still exist
    const cleanupIds = ['sl-paper-svg', 'sl-backdrop', 'sl-paper', 'sl-chevron', 'sl-close-btn'];
    cleanupIds.forEach(id => {
      try {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (_) {}
    });

    const cx = 200;
    const raw = GameScene.loadStats();
    const stats = {
      firstAttempts: this._safeNum(raw.firstAttempts),
      totalWrong: this._safeNum(raw.totalWrong),
      focusTotal: this._safeNum(raw.focusTotal),
      clueTotal: this._safeNum(raw.clueTotal),
      revealTotal: this._safeNum(raw.revealTotal),
    };
    const total = GameScene.getAllLevels().length;
    const rating = SummaryScene._calcRating(stats);
    const mono = '"Special Elite", "Courier New", monospace';
    const rule = "\u2500".repeat(28);

    this.cameras.main.setBackgroundColor(0x0a0a0a);
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.add.text(cx, 30, rule, { fontSize: "14px", fontFamily: mono, color: "#555577" }).setOrigin(0.5);

    this.add
      .text(cx, 56, "CASE FILE \u2014 CLOSED", {
        fontSize: "22px",
        fontFamily: mono,
        color: "#d8d8f0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 82, "The House \u2014 Chapter 1", {
        fontSize: "14px",
        fontFamily: mono,
        color: "#9999bb",
      })
      .setOrigin(0.5);

    this.add.text(cx, 100, rule, { fontSize: "14px", fontFamily: mono, color: "#555577" }).setOrigin(0.5);

    const cap = (n) => Math.min(n, 999);
    const lines = [
      this._line("Rooms Investigated", cap(total)),
      this._line("First Attempt Solves", cap(stats.firstAttempts)),
      this._line("Wrong Submissions", cap(stats.totalWrong)),
      "",
      "  Hints Used:",
      this._line("    Focus", cap(stats.focusTotal)),
      this._line("    Clue", cap(stats.clueTotal)),
      this._line("    Reveal", cap(stats.revealTotal)),
    ];

    this.add
      .text(cx, 205, lines.join("\n"), {
        fontSize: "14px",
        fontFamily: mono,
        color: "#aaaacc",
        align: "left",
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.add.text(cx, 305, rule, { fontSize: "14px", fontFamily: mono, color: "#555577" }).setOrigin(0.5);

    this.add
      .text(cx, 326, "INVESTIGATOR RATING:", {
        fontSize: "14px",
        fontFamily: mono,
        color: "#9999bb",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 352, rating, {
        fontSize: "20px",
        fontFamily: mono,
        color: "#eeeeff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.text(cx, 374, rule, { fontSize: "14px", fontFamily: mono, color: "#555577" }).setOrigin(0.5);

    this._createShareSection(cx, 422, rating, mono);

    this.add
      .text(cx, 490, "\u201cSome things take time to find their place.\u201d", {
        fontSize: "13px",
        fontFamily: mono,
        color: "#777799",
        align: "center",
        wordWrap: { width: 340 },
      })
      .setOrigin(0.5);

    this._createContinueButton(cx, 545, mono);

    GameScene.saveCompletion(rating, stats);
    Analytics.chapterComplete("The House", rating);
  }

  _safeNum(val) {
    if (typeof val !== "number" || isNaN(val) || val < 0) return 0;
    return Math.floor(val);
  }

  _line(label, value) {
    const s = String(value);
    const gap = 28 - label.length - s.length;
    return label + " " + ".".repeat(Math.max(gap, 2)) + " " + s;
  }

  // ── Share section ──────────────────────────────────────

  _createShareSection(cx, cy, rating, mono) {
    const noteW = 340;
    const noteH = 72;
    const noteX = cx - noteW / 2;
    const noteY = cy - noteH / 2;

    const note = this.add.graphics();
    note.fillStyle(0x2a2a1e, 0.6);
    note.fillRoundedRect(noteX, noteY, noteW, noteH, 6);
    note.lineStyle(1, 0x555540, 0.5);
    note.strokeRoundedRect(noteX, noteY, noteW, noteH, 6);

    const url = window.location.origin + window.location.pathname;
    this.shareText =
      `I just solved Still Life: The House as a ${rating}. Can you do better? ${url}`;

    this.add
      .text(cx, cy - 10, this.shareText, {
        fontSize: "12px",
        fontFamily: mono,
        color: "#aaaa88",
        align: "center",
        wordWrap: { width: noteW - 24 },
        lineSpacing: 3,
      })
      .setOrigin(0.5);

    const btnW = 160;
    const btnH = 28;
    const btnY = cy + 24;

    // Create HTML button for iOS touch compatibility
    this._createShareButton(cx, btnY, btnW, btnH, mono);
  }

  _createShareButton(cx, btnY, btnW, btnH, mono) {
    // Get canvas position
    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 400; // Canvas logical width is 400
    
    // Calculate button position
    const btnLeft = rect.left + (cx - btnW / 2) * scale;
    const btnTop = rect.top + (btnY - btnH / 2) * scale;
    const scaledW = btnW * scale;
    const scaledH = btnH * scale;
    
    // Create HTML button
    const button = document.createElement('button');
    button.textContent = this._shareButtonLabel();
    Object.assign(button.style, {
      position: 'fixed',
      left: btnLeft + 'px',
      top: btnTop + 'px',
      width: scaledW + 'px',
      height: scaledH + 'px',
      fontFamily: mono,
      fontSize: (12 * scale) + 'px',
      color: '#bbbb99',
      background: '#333328',
      border: '1px solid rgba(85,85,64,0.6)',
      borderRadius: '5px',
      cursor: 'pointer',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      zIndex: '1001',
      outline: 'none'
    });
    
    document.body.appendChild(button);
    this._htmlElements.push(button);
    
    // iOS touch handling
    let shareTapped = false;
    const copyToClipboard = async () => {
      soundManager.playClick();
      const success = await this._copyToClipboard(this.shareText);
      if (success) {
        soundManager.playCorrect();
        button.textContent = 'Copied!';
        button.style.color = '#ccddaa';
        setTimeout(() => {
          button.textContent = this._shareButtonLabel();
          button.style.color = '#bbbb99';
        }, 2000);
      } else {
        button.textContent = 'Copy failed';
        button.style.color = '#aa6666';
        setTimeout(() => {
          button.textContent = this._shareButtonLabel();
          button.style.color = '#bbbb99';
        }, 2000);
      }
    };
    
    button.ontouchend = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (shareTapped) return;
      shareTapped = true;
      copyToClipboard();
      setTimeout(() => { shareTapped = false; }, 1000);
    };
    
    button.onclick = () => {
      if (shareTapped) return;
      copyToClipboard();
    };
    
    // Hover effects
    button.onmouseenter = () => {
      button.style.background = '#44443a';
      button.style.borderColor = 'rgba(119,119,96,0.6)';
    };
    button.onmouseleave = () => {
      button.style.background = '#333328';
      button.style.borderColor = 'rgba(85,85,64,0.6)';
    };
  }

  async _copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('contenteditable', 'true');
      document.body.appendChild(textarea);
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, 999999);
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch(e) {
      return false;
    }
  }

  _shareButtonLabel() {
    return navigator.share ? "Share Result" : "Copy to Clipboard";
  }

  // ── Continue button ────────────────────────────────────

  _createContinueButton(cx, cy, mono) {
    const btnW = 220;
    const btnH = 44;

    // Get canvas position
    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 400; // Canvas logical width is 400
    
    // Calculate button position
    const btnLeft = rect.left + (cx - btnW / 2) * scale;
    const btnTop = rect.top + (cy - btnH / 2) * scale;
    const scaledW = btnW * scale;
    const scaledH = btnH * scale;
    
    // Create HTML button
    const button = document.createElement('button');
    button.textContent = '[ Return to Menu ]';
    Object.assign(button.style, {
      position: 'fixed',
      left: btnLeft + 'px',
      top: btnTop + 'px',
      width: scaledW + 'px',
      height: scaledH + 'px',
      fontFamily: mono,
      fontSize: (16 * scale) + 'px',
      color: '#aaaacc',
      background: '#2a2a42',
      border: '1px solid #555577',
      borderRadius: '10px',
      cursor: 'pointer',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      zIndex: '1001',
      outline: 'none'
    });
    
    document.body.appendChild(button);
    this._htmlElements.push(button);
    
    // iOS touch handling
    let menuTapped = false;
    const returnToMenu = () => {
      console.log('[SummaryScene] Return to Menu button - CLICKED');
      soundManager.playClick();
      button.disabled = true;
      
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        console.log('[SummaryScene] Fade complete, starting MenuScene');
        
        // Clean up HTML elements
        this._htmlElements.forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
        this._htmlElements = [];
        
        // Restore canvas touch events
        const canvas = this.sys.game.canvas;
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
        }
        
        // Transition in next frame
        requestAnimationFrame(() => {
          this.scene.start('MenuScene');
        });
      });
    };
    
    button.ontouchend = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (menuTapped) return;
      menuTapped = true;
      returnToMenu();
    };
    
    button.onclick = () => {
      if (menuTapped) return;
      returnToMenu();
    };
    
    // Hover effects
    button.onmouseenter = () => {
      button.style.background = '#3a3a5a';
      button.style.borderColor = '#7777aa';
    };
    button.onmouseleave = () => {
      button.style.background = '#2a2a42';
      button.style.borderColor = '#555577';
    };
    
    // Cleanup on scene shutdown
    this.events.once('shutdown', () => {
      this._htmlElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      this._htmlElements = [];
      
      // Restore canvas touch events
      const canvas = this.sys.game.canvas;
      if (canvas) {
        canvas.style.pointerEvents = 'auto';
      }
    });
  }

  static _calcRating(stats) {
    const fa = (typeof stats.firstAttempts === "number" && !isNaN(stats.firstAttempts)) ? stats.firstAttempts : 0;
    const rv = (typeof stats.revealTotal === "number" && !isNaN(stats.revealTotal)) ? stats.revealTotal : 0;
    if (fa >= 25 && rv === 0) return "Master Investigator";
    if (fa >= 20 && rv <= 1) return "Seasoned Detective";
    if (fa >= 15) return "Field Investigator";
    if (fa >= 10) return "Careful Observer";
    return "Patient Witness";
  }
}
