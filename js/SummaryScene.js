class SummaryScene extends Phaser.Scene {
  constructor() {
    super("SummaryScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
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

    const leftCx = W * 0.25;
    const rightCx = W * 0.75;
    const divX = W * 0.5;
    const pad = 24;

    // Vertical divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, 0x222233, 0.5);
    divGfx.lineBetween(divX, H * 0.08, divX, H * 0.92);

    // ── Left half: case file header + rating ──

    this.add.text(leftCx, H * 0.1, rule, { fontSize: "13px", fontFamily: mono, color: "#444466" }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.18, "CASE FILE \u2014 CLOSED", {
      fontSize: Math.max(18, Math.min(24, W * 0.02)) + "px",
      fontFamily: mono, color: "#c0c0dd", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.26, "The House \u2014 Chapter 1", {
      fontSize: "13px", fontFamily: mono, color: "#777799",
    }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.32, rule, { fontSize: "13px", fontFamily: mono, color: "#444466" }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.50, "INVESTIGATOR RATING:", {
      fontSize: "13px", fontFamily: mono, color: "#777799",
    }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.58, rating, {
      fontSize: "20px", fontFamily: mono, color: "#ddddff", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.68, rule, { fontSize: "13px", fontFamily: mono, color: "#444466" }).setOrigin(0.5);

    this.add.text(leftCx, H * 0.78, "\u201cSome things take time\nto find their place.\u201d", {
      fontSize: "13px", fontFamily: mono, color: "#666688", align: "center", lineSpacing: 4,
    }).setOrigin(0.5);

    // ── Right half: stats + share + continue ──

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

    this.add.text(rightCx, H * 0.12, lines.join("\n"), {
      fontSize: "13px", fontFamily: mono, color: "#9999bb",
      align: "left", lineSpacing: 4,
    }).setOrigin(0.5, 0);

    this._createShareSection(rightCx, H * 0.65, rating, mono, W);
    this._createContinueButton(rightCx, H * 0.87, mono);

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

  _createShareSection(cx, cy, rating, mono, W) {
    const noteW = Math.min(380, W * 0.4);
    const noteH = 64;

    const note = this.add.graphics();
    note.fillStyle(0x2a2a1e, 0.6);
    note.fillRoundedRect(cx - noteW / 2, cy - noteH / 2, noteW, noteH, 6);
    note.lineStyle(1, 0x555540, 0.5);
    note.strokeRoundedRect(cx - noteW / 2, cy - noteH / 2, noteW, noteH, 6);

    const url = window.location.origin + window.location.pathname;
    this.shareText = `I just solved Still Life: The House as a ${rating}. Can you do better? ${url}`;

    this.add.text(cx, cy - 8, this.shareText, {
      fontSize: "11px", fontFamily: mono, color: "#aaaa88",
      align: "center", wordWrap: { width: noteW - 20 }, lineSpacing: 2,
    }).setOrigin(0.5);

    const btnW = 140;
    const btnH = 26;
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

    const btnLabel = this.add.text(cx, btnY, this._shareButtonLabel(), {
      fontSize: "11px", fontFamily: mono, color: "#bbbb99",
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => drawBtn(0x44443a, 0x777760));
    zone.on("pointerout", () => drawBtn(0x333328, 0x555540));
    zone.on("pointerdown", () => {
      soundManager.playClick();
      if (navigator.share) {
        navigator.share({ title: "Still Life", text: this.shareText })
          .then(() => { soundManager.playCorrect(); btnLabel.setText("Shared!"); btnLabel.setColor("#ccddaa"); })
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
        this.time.delayedCall(2000, () => { btnLabel.setText(this._shareButtonLabel()); btnLabel.setColor("#bbbb99"); });
      }).catch(() => {
        btnLabel.setText("Copy failed");
        btnLabel.setColor("#aa6666");
        this.time.delayedCall(2000, () => { btnLabel.setText(this._shareButtonLabel()); btnLabel.setColor("#bbbb99"); });
      });
    }
  }

  _shareButtonLabel() {
    return navigator.share ? "Share Result" : "Copy to Clipboard";
  }

  // ── Continue button ────────────────────────────────────

  _createContinueButton(cx, cy, mono) {
    const btnW = 160;
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

    this.add.text(cx, cy, "[ View Ending ]", {
      fontSize: "15px", fontFamily: mono, color: "#aaaacc",
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => draw(0x3a3a5a, 0x7777aa));
    zone.on("pointerout", () => draw(0x2a2a42, 0x555577));
    zone.on("pointerdown", () => {
      soundManager.playClick();
      zone.input.enabled = false;
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("EndingScene");
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
