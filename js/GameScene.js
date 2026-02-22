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

    this._drawRoom(level);
    this._drawSlots(level);
    this._createCards(level);

    this._createMuteToggle();
    this._createMenuButton();
    this._buildMenuOverlay();

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

  _drawRoom(level) {
    const roomBg = this.add.graphics();
    roomBg.fillStyle(0x111122, 1);
    roomBg.fillRoundedRect(20, 15, 760, 200, 10);
    roomBg.lineStyle(1, 0x333355, 1);
    roomBg.strokeRoundedRect(20, 15, 760, 200, 10);

    const levelNum = this.levelIndex + 1;
    const totalLevels = GameScene.getAllLevels().length;

    const typo = '"Special Elite", "Courier New", monospace';

    this.add
      .text(400, 35, level.room, {
        fontSize: "22px",
        fontFamily: '"Playfair Display", Georgia, serif',
        color: "#c0c0e0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const actNames = ["Togetherness", "Separation", "Reconciliation"];
    const actNum = level.act || 1;
    const actLabel = actNames[actNum - 1] || "";

    this.add
      .text(400, 62, `Level ${levelNum} / ${totalLevels}  \u2014  Act ${actNum}: ${actLabel}`, {
        fontSize: "13px",
        fontFamily: typo,
        color: "#555577",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 120, level.roomDescription, {
        fontSize: "15px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#9999bb",
        align: "center",
        wordWrap: { width: 680 },
        lineSpacing: 6,
      })
      .setOrigin(0.5);
  }

  _drawSlots(level) {
    const slotW = 150;
    const slotH = 70;
    const gap = 16;
    const count = level.cards.length;
    const totalW = count * slotW + (count - 1) * gap;
    const startX = (800 - totalW) / 2 + slotW / 2;
    const slotY = 290;

    this.add
      .text(400, 240, "Arrange in order:", {
        fontSize: "14px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#555577",
      })
      .setOrigin(0.5);

    this.slotGfx = [];
    this.slots = level.cards.map((_, i) => {
      const sx = startX + i * (slotW + gap);
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0x444466, 0.7);
      gfx.strokeRoundedRect(sx - slotW / 2, slotY - slotH / 2, slotW, slotH, 10);

      this.add
        .text(sx, slotY, `${i + 1}`, {
          fontSize: "22px",
          fontFamily: '"Special Elite", "Courier New", monospace',
          color: "#2a2a44",
        })
        .setOrigin(0.5);

      this.slotGfx.push(gfx);
      return { x: sx, y: slotY, w: slotW, h: slotH };
    });
  }

  _createCards(level) {
    const cardW = 150;
    const cardH = 70;
    const gap = 16;
    const count = level.cards.length;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = (800 - totalW) / 2 + cardW / 2;
    const cardY = 430;

    let shuffled = [...level.cards];
    const matchesCorrect = (arr) =>
      arr.every((c, i) => c.id === level.correctSequence[i]);

    let attempts = 0;
    do {
      Phaser.Utils.Array.Shuffle(shuffled);
      attempts++;
    } while (matchesCorrect(shuffled) && attempts < 20);

    this.cardManager = new CardManager(this, shuffled, this.slots);
    this.cardManager.createCards(startX, cardY, cardW, cardH, gap);
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
      const loadingDot = this.add
        .text(400, 300, "\u2022", {
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
    const actLines = {
      10: "Something changed in the house.",
      20: "The rooms remember what the people forgot.",
    };
    const line = actLines[next] || "A new chapter begins.";
    const typo = '"Special Elite", "Courier New", monospace';

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
          align: "center", wordWrap: { width: 600 },
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
    if (s.wrong === 0 && !s.skipped) {
      agg.firstAttempts++;
    }
    agg.totalWrong += s.wrong;
    agg.focusTotal += s.focus;
    agg.clueTotal += s.clue;
    agg.revealTotal += s.reveal;
    GameScene.saveStats(agg);
  }

  // ── Mute toggle ────────────────────────────────────────

  _createMuteToggle() {
    const x = 770;
    const y = 24;
    this.muteIcon = this.add
      .text(x, y, "\u266a", {
        fontSize: "18px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: soundManager.isMuted() ? "#333344" : "#8888aa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.muteStrike = this.add.graphics();
    this._drawMuteState();

    this.muteTooltip = this.add
      .text(x, y + 20, "Sound", {
        fontSize: "10px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#555566",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.muteIcon.on("pointerover", () => {
      this.tweens.add({
        targets: this.muteTooltip,
        alpha: 1,
        duration: 150,
      });
    });

    this.muteIcon.on("pointerout", () => {
      this.tweens.add({
        targets: this.muteTooltip,
        alpha: 0,
        duration: 150,
      });
    });

    this.muteIcon.on("pointerdown", () => {
      soundManager.toggleMute();
      this._drawMuteState();
    });
  }

  _drawMuteState() {
    this.muteStrike.clear();
    if (soundManager.isMuted()) {
      this.muteIcon.setColor("#333344");
      this.muteStrike.lineStyle(2, 0x884444, 0.7);
      this.muteStrike.lineBetween(761, 15, 779, 33);
    } else {
      this.muteIcon.setColor("#8888aa");
    }
  }

  // ── Menu button & confirmation overlay ────────────────

  _createMenuButton() {
    const btnX = 40;
    const btnY = 24;

    this._menuBtn = this.add
      .text(btnX, btnY, "\u2261 Menu", {
        fontSize: "13px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#555566",
      })
      .setOrigin(0, 0.5)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-10, -14, 80, 44),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });

    this._menuBtn.on("pointerover", () => this._menuBtn.setColor("#8888aa"));
    this._menuBtn.on("pointerout", () => this._menuBtn.setColor("#555566"));
    this._menuBtn.on("pointerdown", () => {
      soundManager.playClick();
      this._openMenuOverlay();
    });
  }

  _buildMenuOverlay() {
    this._menuOverlayGroup = this.add.container(0, 0).setDepth(200).setVisible(false);

    const backdrop = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    backdrop.setInteractive();

    const panel = this.add.graphics();
    const pw = 340;
    const ph = 210;
    const px = 400 - pw / 2;
    const py = 300 - ph / 2;
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(px, py, pw, ph, 14);
    panel.lineStyle(1, 0x444466, 1);
    panel.strokeRoundedRect(px, py, pw, ph, 14);

    const typoOv = '"Special Elite", "Courier New", monospace';

    const title = this.add
      .text(400, 245, "[ Paused ]", {
        fontSize: "20px",
        fontFamily: typoOv,
        color: "#c0c0e0",
      })
      .setOrigin(0.5);

    const resumeBtn = this._makeOverlayButton(400, 310, "Resume", () => {
      soundManager.playClick();
      this._closeMenuOverlay();
    });

    const menuBtn = this._makeOverlayButton(400, 355, "Return to Menu", () => {
      soundManager.playClick();
      this.scene.stop("UIScene");
      this.scene.start("MenuScene");
    });

    this._menuOverlayGroup.add([
      backdrop, panel, title,
      ...resumeBtn, ...menuBtn,
    ]);
  }

  _makeOverlayButton(cx, cy, label, callback) {
    // Visible button is 20% smaller, but keep the hit area generous.
    const hitW = 130;
    const hitH = 44;
    const btnW = 104;
    const btnH = 35;

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
    this._escListener = (e) => {
      if (e.key === "Escape") this._closeMenuOverlay();
    };
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
      if (levelIndex < count + chapter.levels.length) {
        return chapter.id;
      }
      count += chapter.levels.length;
    }
    const last = LevelData.chapters[LevelData.chapters.length - 1];
    return last ? last.id : "unknown";
  }

  static getAllLevels() {
    const all = [];
    for (const chapter of LevelData.chapters) {
      all.push(...chapter.levels);
    }
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
      if (isNaN(val) || val < 0 || val > total) {
        localStorage.setItem(LS.level(), "0");
      }
    } catch (_) {}

    const statKeys = [LS.firstAttempts, LS.wrongTotal, LS.hintsFocus, LS.hintsClue, LS.hintsReveal];
    for (const fn of statKeys) {
      try {
        const raw = localStorage.getItem(fn());
        if (raw === null) continue;
        const val = parseInt(raw, 10);
        if (isNaN(val) || val < 0) {
          localStorage.setItem(fn(), "0");
        }
      } catch (_) {
        try { localStorage.removeItem(fn()); } catch (_e) {}
      }
    }
  }

  static saveProgress(index) {
    GameScene._safeSetInt(LS.level(), index);
  }

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
    } catch (_) {
      return 0;
    }
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
      if (current > prev) {
        GameScene._safeSetInt(LS.bestFirst(), current);
      }
    } catch (_) {}
  }

  static isChapterComplete() {
    try {
      return localStorage.getItem(LS.completed()) === "true";
    } catch (_) { return false; }
  }

  static loadRating() {
    try {
      return localStorage.getItem(LS.rating()) || "";
    } catch (_) { return ""; }
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
