class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? GameScene.loadProgress();
  }

  create() {
    const levels = GameScene.getAllLevels();
    const level = levels[this.levelIndex];

    if (!level) {
      this.scene.start("SummaryScene");
      return;
    }

    GameScene.saveProgress(this.levelIndex);
    Analytics.levelStart(this.levelIndex + 1);

    this.levelStats = { wrong: 0, focus: 0, clue: 0, reveal: 0, skipped: false };

    const W = this.scale.width;
    const H = this.scale.height;

    this._drawDivider(W, H);
    this._drawRoom(level, W, H);
    this._drawSlots(level, W, H);
    this._createCards(level, W, H);

    this._createMuteToggle(W, H);
    this._createMenuButton(W, H);
    this._buildMenuOverlay(W, H);

    this.scene.launch("UIScene", {
      getSequence: () => this.cardManager.getSequence(),
      correctSequence: level.correctSequence,
      resetCards: () => this.cardManager.resetCards(),
      onCorrect: () => this._advanceLevel(levels),
      cardManager: this.cardManager,
      cards: level.cards,
      chapterId: GameScene.getChapterForLevel(this.levelIndex),
      levelStats: this.levelStats,
      levelIndex: this.levelIndex,
    });

    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── Left panel: room info ────────────────────────────────

  _drawDivider(W, H) {
    const divX = Math.floor(W * 0.38);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x222233, 1);
    gfx.lineBetween(divX, 0, divX, H);
  }

  _drawRoom(level, W, H) {
    const leftW = W * 0.38;
    const padL = 20;
    const padT = 16;
    const cx = leftW / 2;
    const typo = '"Special Elite", "Courier New", monospace';
    const serif = '"Playfair Display", Georgia, serif';

    const levelNum = this.levelIndex + 1;
    const totalLevels = GameScene.getAllLevels().length;
    const actNames = ["Togetherness", "Separation", "Reconciliation"];
    const actNum = level.act || 1;
    const actLabel = actNames[actNum - 1] || "";

    this.add
      .text(padL, padT + 50, `Act ${actNum}: ${actLabel}`, {
        fontSize: "11px",
        fontFamily: typo,
        color: "#555577",
      })
      .setOrigin(0, 0);

    this.add
      .text(cx, H * 0.22, level.room, {
        fontSize: "20px",
        fontFamily: serif,
        fontStyle: "italic",
        color: "#d8d8e8",
        align: "center",
        wordWrap: { width: leftW - padL * 2 },
      })
      .setOrigin(0.5);

    const divY = H * 0.34;
    const rule = this.add.graphics();
    rule.lineStyle(1, 0x333344, 0.6);
    rule.lineBetween(padL, divY, leftW - padL, divY);

    this.add
      .text(cx, divY + 20, level.roomDescription, {
        fontSize: "13px",
        fontFamily: typo,
        fontStyle: "italic",
        color: "#9999aa",
        align: "center",
        wordWrap: { width: leftW - padL * 2 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, H - padT - 6, `Room ${levelNum} of ${totalLevels}`, {
        fontSize: "11px",
        fontFamily: typo,
        color: "#444466",
      })
      .setOrigin(0.5, 1);
  }

  // ── Right panel: slots + cards (2×2 grids) ───────────────

  _calcLayout(W, H) {
    const leftW = W * 0.38;
    const rightW = W * 0.62;
    const pad = 16;
    const hGap = 16;
    const vGap = 8;
    const betweenGap = 12;
    const submitH = 48;
    const topPad = 16;
    const bottomPad = 20;

    const cardW = (rightW - 48) / 2;

    const contentTop = topPad;
    const contentBottom = H - bottomPad - submitH - betweenGap;
    const totalContentH = contentBottom - contentTop;
    const totalVGaps = vGap + betweenGap + vGap;
    const rowH = Math.min(Math.max(56, (totalContentH - totalVGaps) / 4), 130);

    const col0x = leftW + pad + cardW / 2;
    const col1x = leftW + pad + cardW + hGap + cardW / 2;

    const slotRow0Y = contentTop + rowH / 2;
    const slotRow1Y = slotRow0Y + rowH + vGap;
    const cardRow0Y = slotRow1Y + rowH + betweenGap;
    const cardRow1Y = cardRow0Y + rowH + vGap;

    const submitCx = leftW + rightW / 2;
    const submitBy = H - bottomPad - submitH / 2;
    const submitBtnW = rightW - pad * 2;

    return {
      leftW, rightW, pad, cardW, rowH,
      col0x, col1x,
      slotRow0Y, slotRow1Y,
      cardRow0Y, cardRow1Y,
      submitCx, submitBy, submitBtnW, submitH,
    };
  }

  _drawSlots(level, W, H) {
    const L = this._calcLayout(W, H);
    const typo = '"Special Elite", "Courier New", monospace';

    this._layout = L;
    this.slotGfx = [];
    this.slots = [];

    const rows = [L.slotRow0Y, L.slotRow1Y];
    const cols = [L.col0x, L.col1x];

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = cols[col];
      const sy = rows[row];

      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0x444466, 0.7);
      gfx.strokeRoundedRect(sx - L.cardW / 2, sy - L.rowH / 2, L.cardW, L.rowH, 10);

      this.add
        .text(sx - L.cardW / 2 + 8, sy - L.rowH / 2 + 4, `${i + 1}`, {
          fontSize: "14px",
          fontFamily: typo,
          color: "#2a2a44",
        });

      this.slotGfx.push(gfx);
      this.slots.push({ x: sx, y: sy, w: L.cardW, h: L.rowH });
    }
  }

  _createCards(level, W, H) {
    const L = this._layout;
    const rows = [L.cardRow0Y, L.cardRow1Y];
    const cols = [L.col0x, L.col1x];

    const positions = [
      { x: cols[0], y: rows[0] },
      { x: cols[1], y: rows[0] },
      { x: cols[0], y: rows[1] },
      { x: cols[1], y: rows[1] },
    ];

    let shuffled = [...level.cards];
    const matchesCorrect = (arr) =>
      arr.every((c, i) => c.id === level.correctSequence[i]);

    let attempts = 0;
    do {
      Phaser.Utils.Array.Shuffle(shuffled);
      attempts++;
    } while (matchesCorrect(shuffled) && attempts < 20);

    this.cardManager = new CardManager(this, shuffled, this.slots);
    this.cardManager.createCards(positions, L.cardW, L.rowH);
  }

  _advanceLevel(levels) {
    this._commitLevelStats();
    Analytics.levelComplete(this.levelIndex + 1, this.levelStats.wrong + 1);
    const next = this.levelIndex + 1;
    const isActBreak = this.levelIndex === 9 || this.levelIndex === 19;

    this.scene.stop("UIScene");

    if (isActBreak && next < levels.length) {
      this._showActBreak(next, levels);
    } else {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;

      const loadingDot = this.add
        .text(cx, cy, "\u2022", {
          fontSize: "24px",
          color: "#666688",
        })
        .setOrigin(0.5)
        .setDepth(300)
        .setAlpha(0);

      this.tweens.add({
        targets: loadingDot,
        alpha: 0.8,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });

      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (next >= levels.length) {
          GameScene.saveProgress(next);
          this.scene.start("SummaryScene");
        } else {
          GameScene.saveProgress(next);
          this.scene.restart({ levelIndex: next });
        }
      });
    }
  }

  _showActBreak(next, levels) {
    const typo = '"Special Elite", "Courier New", monospace';
    const actLines = {
      10: "Something changed in the house.",
      20: "The rooms remember what the people forgot.",
    };
    const line = actLines[next] || "A new chapter begins.";

    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.children.removeAll(true);
      this.cameras.main.setBackgroundColor(0x000000);
      this.cameras.main.setAlpha(1);

      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;
      const actNum = next < 20 ? 2 : 3;
      const actNames = ["Togetherness", "Separation", "Reconciliation"];
      const roomsCompleted = next === 10 ? "10" : "20";

      const label = this.add
        .text(cx, cy - 45, `\u2713  ${roomsCompleted} rooms catalogued`, {
          fontSize: "11px", fontFamily: typo, color: "#66aa77",
        })
        .setOrigin(0.5).setAlpha(0);

      const actLabel = this.add
        .text(cx, cy - 20, `Act ${actNum}: ${actNames[actNum - 1]}`, {
          fontSize: "13px", fontFamily: typo, color: "#555577",
        })
        .setOrigin(0.5).setAlpha(0);

      const text = this.add
        .text(cx, cy + 10, line, {
          fontSize: "18px", fontFamily: typo, color: "#c0c0d0",
          align: "center", wordWrap: { width: Math.min(600, this.scale.width * 0.7) },
        })
        .setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: label, alpha: 1, duration: 1000, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: actLabel, alpha: 1, duration: 1000, delay: 200, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: text, alpha: 1, duration: 1200, delay: 600, ease: "Cubic.easeOut" });

      this.time.delayedCall(4000, () => {
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          GameScene.saveProgress(next);
          this.scene.restart({ levelIndex: next });
        });
      });
    });
  }

  _commitLevelStats() {
    const s = this.levelStats;
    const agg = GameScene.loadStats();
    if (s.wrong === 0 && !s.skipped) agg.firstAttempts++;
    agg.totalWrong += s.wrong;
    agg.focusTotal += s.focus;
    agg.clueTotal += s.clue;
    agg.revealTotal += s.reveal;
    GameScene.saveStats(agg);
  }

  // ── Mute toggle ────────────────────────────────────────

  _createMuteToggle(W, H) {
    const leftW = W * 0.38;
    const x = leftW - 20;
    const y = 20;
    const typo = '"Special Elite", "Courier New", monospace';

    this.muteIcon = this.add
      .text(x, y, "\u266a", {
        fontSize: "18px",
        fontFamily: typo,
        color: soundManager.isMuted() ? "#333344" : "#8888aa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.muteStrike = this.add.graphics();
    this._drawMuteState(x, y);

    this.muteIcon.on("pointerdown", () => {
      soundManager.toggleMute();
      this._drawMuteState(x, y);
    });
  }

  _drawMuteState(x, y) {
    this.muteStrike.clear();
    if (soundManager.isMuted()) {
      this.muteIcon.setColor("#333344");
      this.muteStrike.lineStyle(2, 0x884444, 0.7);
      this.muteStrike.lineBetween(x - 9, y - 9, x + 9, y + 9);
    } else {
      this.muteIcon.setColor("#8888aa");
    }
  }

  // ── Menu button & overlay ──────────────────────────────

  _createMenuButton(W, H) {
    const typo = '"Special Elite", "Courier New", monospace';
    const btnX = 14;
    const btnY = 16;

    this._menuBtn = this.add
      .text(btnX, btnY, "\u2261 Menu", {
        fontSize: "13px",
        fontFamily: typo,
        color: "#555566",
      })
      .setOrigin(0, 0)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-6, -6, 80, 52),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });

    this._menuBtn.on("pointerover", () => this._menuBtn.setColor("#8888aa"));
    this._menuBtn.on("pointerout", () => this._menuBtn.setColor("#555566"));
    this._menuBtn.on("pointerdown", () => {
      soundManager.playClick();
      this._openMenuOverlay();
    });
  }

  _buildMenuOverlay(W, H) {
    const cx = W / 2;
    const cy = H / 2;
    const typoOv = '"Special Elite", "Courier New", monospace';

    this._menuOverlayGroup = this.add.container(0, 0).setDepth(200).setVisible(false);

    const backdrop = this.add.rectangle(cx, cy, W, H, 0x000000, 0.7);
    backdrop.setInteractive();

    const pw = Math.min(340, W * 0.5);
    const ph = Math.min(210, H * 0.7);
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x444466, 1);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);

    const title = this.add
      .text(cx, cy - ph / 4, "[ Paused ]", {
        fontSize: "20px", fontFamily: typoOv, color: "#c0c0e0",
      })
      .setOrigin(0.5);

    const resumeBtn = this._makeOverlayButton(cx, cy + 10, "Resume", () => {
      soundManager.playClick();
      this._closeMenuOverlay();
    });

    const menuBtn = this._makeOverlayButton(cx, cy + 55, "Return to Menu", () => {
      soundManager.playClick();
      this.scene.stop("UIScene");
      this.scene.start("MenuScene");
    });

    this._menuOverlayGroup.add([backdrop, panel, title, ...resumeBtn, ...menuBtn]);
  }

  _makeOverlayButton(cx, cy, label, callback) {
    const btnW = 104;
    const btnH = 35;
    const hitW = 130;
    const hitH = 44;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a44, 1);
    bg.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 7);
    bg.lineStyle(1, 0x444466, 1);
    bg.strokeRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 7);

    const txt = this.add
      .text(cx, cy, label, {
        fontSize: "12px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#c0c0e0",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(cx, cy, hitW, hitH)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => txt.setColor("#ffffff"));
    zone.on("pointerout", () => txt.setColor("#c0c0e0"));
    zone.on("pointerdown", callback);

    return [bg, txt, zone];
  }

  _openMenuOverlay() {
    if (this._menuOverlayGroup.visible) return;
    this._menuOverlayGroup.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this._menuOverlayGroup,
      alpha: 1,
      duration: 200,
      ease: "Cubic.easeOut",
    });
    this.scene.pause("UIScene");
    this._escListener = () => this._closeMenuOverlay();
    this.input.keyboard.on("keydown-ESC", this._escListener);
  }

  _closeMenuOverlay() {
    this._menuOverlayGroup.setVisible(false);
    this.scene.resume("UIScene");
    if (this._escListener) {
      this.input.keyboard.off("keydown-ESC", this._escListener);
      this._escListener = null;
    }
  }

  // ── Static helpers ─────────────────────────────────────

  static getChapterForLevel(levelIndex) {
    let count = 0;
    for (const chapter of LevelData.chapters) {
      if (levelIndex < count + chapter.levels.length) return chapter.id;
      count += chapter.levels.length;
    }
    const last = LevelData.chapters[LevelData.chapters.length - 1];
    return last ? last.id : "unknown";
  }

  static getAllLevels() {
    const all = [];
    for (const chapter of LevelData.chapters) all.push(...chapter.levels);
    return all;
  }

  static _safeGetInt(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return 0;
      const num = parseInt(raw, 10);
      return (isNaN(num) || num < 0) ? 0 : num;
    } catch (_) { return 0; }
  }

  static _safeSetInt(key, val) {
    try { localStorage.setItem(key, val); } catch (_) {}
  }

  static validateStorage() {
    const total = GameScene.getAllLevels().length;
    try {
      const raw = localStorage.getItem(LS.level());
      if (raw === null || raw === undefined) return;
      const val = parseInt(raw, 10);
      if (isNaN(val) || val < 0 || val > total) localStorage.setItem(LS.level(), "0");
    } catch (_) {}
    const statKeys = [LS.firstAttempts, LS.wrongTotal, LS.hintsFocus, LS.hintsClue, LS.hintsReveal];
    for (const fn of statKeys) {
      try {
        const raw = localStorage.getItem(fn());
        if (raw === null) continue;
        const val = parseInt(raw, 10);
        if (isNaN(val) || val < 0) localStorage.setItem(fn(), "0");
      } catch (_) {
        try { localStorage.removeItem(fn()); } catch (_e) {}
      }
    }
  }

  static saveProgress(index) { GameScene._safeSetInt(LS.level(), index); }

  static loadProgress() {
    GameScene.validateStorage();
    try {
      const val = localStorage.getItem(LS.level());
      if (val === null || val === undefined) return 0;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return 0;
      const total = GameScene.getAllLevels().length;
      if (num > total) return 0;
      return num;
    } catch (_) { return 0; }
  }

  static loadStats() {
    return {
      firstAttempts: GameScene._safeGetInt(LS.firstAttempts()),
      totalWrong:    GameScene._safeGetInt(LS.wrongTotal()),
      focusTotal:    GameScene._safeGetInt(LS.hintsFocus()),
      clueTotal:     GameScene._safeGetInt(LS.hintsClue()),
      revealTotal:   GameScene._safeGetInt(LS.hintsReveal()),
    };
  }

  static saveStats(stats) {
    try {
      GameScene._safeSetInt(LS.firstAttempts(), stats.firstAttempts || 0);
      GameScene._safeSetInt(LS.wrongTotal(), stats.totalWrong || 0);
      GameScene._safeSetInt(LS.hintsFocus(), stats.focusTotal || 0);
      GameScene._safeSetInt(LS.hintsClue(), stats.clueTotal || 0);
      GameScene._safeSetInt(LS.hintsReveal(), stats.revealTotal || 0);
    } catch (_) {}
  }

  static saveCompletion(rating, stats) {
    try {
      localStorage.setItem(LS.completed(), "true");
      localStorage.setItem(LS.rating(), rating);
      localStorage.setItem(LS.certDate(), new Date().toISOString().slice(0, 10));
      const prev = GameScene._safeGetInt(LS.bestFirst());
      const current = stats.firstAttempts || 0;
      if (current > prev) GameScene._safeSetInt(LS.bestFirst(), current);
    } catch (_) {}
  }

  static isChapterComplete() {
    try { return localStorage.getItem(LS.completed()) === "true"; }
    catch (_) { return false; }
  }

  static loadRating() {
    try { return localStorage.getItem(LS.rating()) || ""; }
    catch (_) { return ""; }
  }

  static resetAll() {
    try {
      localStorage.removeItem(LS.level());
      localStorage.removeItem(LS.firstAttempts());
      localStorage.removeItem(LS.wrongTotal());
      localStorage.removeItem(LS.hintsFocus());
      localStorage.removeItem(LS.hintsClue());
      localStorage.removeItem(LS.hintsReveal());
    } catch (_) {}
  }
}
