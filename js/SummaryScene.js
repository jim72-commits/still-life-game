class SummaryScene extends Phaser.Scene {
  constructor() {
    super("SummaryScene");
  }

  create() {
    console.log('[SummaryScene] Scene starting');
    
    // Ensure the Phaser canvas can receive input
    const canvas = this.sys.game.canvas;
    if (canvas) {
      const currentPE = canvas.style.pointerEvents;
      if (!currentPE || currentPE === 'none') {
        canvas.style.pointerEvents = 'auto';
        console.log('[SummaryScene] Canvas pointer-events was:', currentPE, '→ set to: auto');
      } else {
        console.log('[SummaryScene] Canvas pointer-events already:', currentPE);
      }
    }

    // Aggressively remove any LetterScene HTML that might still exist
    const cleanupIds = ['sl-paper-svg', 'sl-backdrop', 'sl-paper', 'sl-chevron', 'sl-close-btn'];
    let foundOrphans = 0;
    cleanupIds.forEach(id => {
      try {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
          foundOrphans++;
        }
      } catch (_) {}
    });
    // Also remove any orphaned sl- prefixed elements
    document.querySelectorAll('[id^="sl-"]').forEach(el => {
      try {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
          foundOrphans++;
        }
      } catch (_) {}
    });
    console.log('[SummaryScene] Checked for orphaned HTML, removed:', foundOrphans, 'elements');
    
    // Count all body children to help debug
    const bodyChildren = document.body.children.length;
    console.log('[SummaryScene] Total body children:', bodyChildren);

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

    const btnBg = this.add.graphics();
    const drawBtn = (fill, stroke) => {
      btnBg.clear();
      btnBg.fillStyle(fill, 1);
      btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
      btnBg.lineStyle(1, stroke, 0.6);
      btnBg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
    };
    drawBtn(0x333328, 0x555540);

    const btnLabel = this.add
      .text(cx, btnY, this._shareButtonLabel(), {
        fontSize: "12px",
        fontFamily: mono,
        color: "#bbbb99",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(cx, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    zone.on("pointerover", () => {
      console.log('[SummaryScene] Share button - hover');
      drawBtn(0x44443a, 0x777760);
    });
    zone.on("pointerout", () => {
      console.log('[SummaryScene] Share button - out');
      drawBtn(0x333328, 0x555540);
    });
    zone.on("pointerdown", () => {
      console.log('[SummaryScene] Share button - CLICKED');
      soundManager.playClick();
      if (navigator.share) {
        navigator
          .share({ title: "Still Life", text: this.shareText })
          .then(() => {
            soundManager.playCorrect();
            btnLabel.setText("Shared!");
            btnLabel.setColor("#ccddaa");
          })
          .catch(() => this._fallbackCopy(btnLabel));
      } else {
        this._fallbackCopy(btnLabel);
      }
    });
  }

  _fallbackCopy(btnLabel) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.shareText).then(() => {
        soundManager.playCorrect();
        btnLabel.setText("Copied!");
        btnLabel.setColor("#ccddaa");
        this.time.delayedCall(2000, () => {
          btnLabel.setText(this._shareButtonLabel());
          btnLabel.setColor("#bbbb99");
        });
      }).catch(() => {
        btnLabel.setText("Copy failed");
        btnLabel.setColor("#aa6666");
        this.time.delayedCall(2000, () => {
          btnLabel.setText(this._shareButtonLabel());
          btnLabel.setColor("#bbbb99");
        });
      });
    }
  }

  _shareButtonLabel() {
    return navigator.share ? "Share Result" : "Copy to Clipboard";
  }

  // ── Continue button ────────────────────────────────────

  _createContinueButton(cx, cy, mono) {
    const btnW = 220;
    const btnH = 44;

    const bg = this.add.graphics();
    const draw = (fill, stroke) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 10);
      bg.lineStyle(1, stroke, 1);
      bg.strokeRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 10);
    };
    draw(0x2a2a42, 0x555577);

    this.add
      .text(cx, cy, "[ Return to Menu ]", {
        fontSize: "16px",
        fontFamily: mono,
        color: "#aaaacc",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(cx, cy, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    zone.on("pointerover", () => {
      console.log('[SummaryScene] Return to Menu button - hover');
      draw(0x3a3a5a, 0x7777aa);
    });
    zone.on("pointerout", () => {
      console.log('[SummaryScene] Return to Menu button - out');
      draw(0x2a2a42, 0x555577);
    });
    zone.on("pointerdown", () => {
      console.log('[SummaryScene] Return to Menu button - CLICKED');
      soundManager.playClick();
      zone.input.enabled = false;
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        console.log('[SummaryScene] Fade complete, starting MenuScene');
        this.scene.start("MenuScene");
      });
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
