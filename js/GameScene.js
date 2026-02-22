// Canvas: 400x700 portrait layout
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
    const cx = 200;
    const serif = '"Playfair Display", Georgia, serif';
    const typo = '"Special Elite", "Courier New", monospace';

    const roomBg = this.add.graphics();
    roomBg.fillStyle(0x171730, 1);
    roomBg.fillRoundedRect(10, 10, 380, 170, 10);
    roomBg.lineStyle(1, 0x444466, 0.8);
    roomBg.strokeRoundedRect(10, 10, 380, 170, 10);

    const levelNum = this.levelIndex + 1;
    const totalLevels = GameScene.getAllLevels().length;
    const actNames = ["Togetherness", "Separation", "Reconciliation"];
    const actNum = level.act || 1;
    const actLabel = actNames[actNum - 1] || "";

    this.add
      .text(cx, 32, level.room, {
        fontSize: "20px",
        fontFamily: serif,
        color: "#eeeeff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 62, `Level ${levelNum} / ${totalLevels}  \u2014  Act ${actNum}: ${actLabel}`, {
        fontSize: "12px",
        fontFamily: typo,
        color: "#9999bb",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 125, level.roomDescription, {
        fontSize: "14px",
        fontFamily: typo,
        color: "#bbbbd4",
        align: "center",
        wordWrap: { width: 350 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
  }

  _drawSlots(level) {
    // 4 slots in a row: slotW=82, slotH=80, gap=8
    // total = 4*82+3*8 = 352, padding = (400-352)/2 = 24, startX center = 24+41 = 65
    const slotW = 82;
    const slotH = 80;
    const gap = 8;
    const count = level.cards.length;
    const totalW = count * slotW + (count - 1) * gap;
    const startX = (400 - totalW) / 2 + slotW / 2;
    const slotY = 285;
    const typo = '"Special Elite", "Courier New", monospace';

    this.add
      .text(200, 203, "Arrange in order:", {
        fontSize: "13px",
        fontFamily: typo,
        color: "#9999bb",
      })
      .setOrigin(0.5);

    this.slotGfx = [];
    this.slots = level.cards.map((_, i) => {
      const sx = startX + i * (slotW + gap);
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0x6666aa, 0.8);
      gfx.strokeRoundedRect(sx - slotW / 2, slotY - slotH / 2, slotW, slotH, 10);

      this.add
        .text(sx - slotW / 2 + 6, slotY - slotH / 2 + 4, `${i + 1}`, {
          fontSize: "13px",
          fontFamily: typo,
          color: "#8888aa",
        });

      this.slotGfx.push(gfx);
      return { x: sx, y: slotY, w: slotW, h: slotH };
    });
  }

  _createCards(level) {
    const cardW = 82;
    const cardH = 80;
    const gap = 8;
    const count = level.cards.length;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = (400 - totalW) / 2 + cardW / 2;
    const cardY = 435;

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
        .text(200, 350, "\u2022", {
          fontSize: "24px",
          color: "#888899",
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

      const cx = 200;
      const cy = 350;
      const actNum = next < 20 ? 2 : 3;
      const actNames = ["Togetherness", "Separation", "Reconciliation"];
      const roomsCompleted = next === 10 ? "10" : "20";

      const label = this.add
        .text(cx, cy - 45, `\u2713  ${roomsCompleted} rooms catalogued`, {
          fontSize: "12px", fontFamily: typo, color: "#77bb88",
        })
        .setOrigin(0.5).setAlpha(0);

      const actLabel = this.add
        .text(cx, cy - 18, `Act ${actNum}: ${actNames[actNum - 1]}`, {
          fontSize: "14px", fontFamily: typo, color: "#9999bb",
        })
        .setOrigin(0.5).setAlpha(0);

      const text = this.add
        .text(cx, cy + 16, line, {
          fontSize: "17px", fontFamily: typo, color: "#d8d8e8",
          align: "center", wordWrap: { width: 340 },
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

  _createMuteToggle() {
    const x = 382;
    const y = 22;
    const typo = '"Special Elite", "Courier New", monospace';

    this.muteIcon = this.add
      .text(x, y, "\u266a", {
        fontSize: "18px",
        fontFamily: typo,
        color: soundManager.isMuted() ? "#555566" : "#aaaacc",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.muteStrike = this.add.graphics();
    this._drawMuteState();

    this.muteIcon.on("pointerdown", () => {
      soundManager.toggleMute();
      this._drawMuteState();
    });
  }

  _drawMuteState() {
    this.muteStrike.clear();
    if (soundManager.isMuted()) {
      this.muteIcon.setColor("#555566");
      this.muteStrike.lineStyle(2, 0x884444, 0.8);
      this.muteStrike.lineBetween(373, 13, 391, 31);
    } else {
      this.muteIcon.setColor("#aaaacc");
    }
  }

  // ── Menu button & confirmation overlay ────────────────

  _createMenuButton() {
    const typo = '"Special Elite", "Courier New", monospace';

    this._menuBtn = this.add
      .text(14, 22, "\u2261 Menu", {
        fontSize: "13px",
        fontFamily: typo,
        color: "#9999bb",
      })
      .setOrigin(0, 0.5)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-8, -18, 80, 44),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });

    this._menuBtn.on("pointerover", () => this._menuBtn.setColor("#ccccee"));
    this._menuBtn.on("pointerout", () => this._menuBtn.setColor("#9999bb"));
    this._menuBtn.on("pointerdown", () => {
      soundManager.playClick();
      this._openMenuOverlay();
    });
  }

  _buildMenuOverlay() {
    this._menuOverlayGroup = this.add.container(0, 0).setDepth(200).setVisible(false);

    const backdrop = this.add.rectangle(200, 350, 400, 700, 0x000000, 0.75);
    backdrop.setInteractive();

    const pw = 320;
    const ph = 200;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(200 - pw / 2, 350 - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x555577, 1);
    panel.strokeRoundedRect(200 - pw / 2, 350 - ph / 2, pw, ph, 14);

    const typoOv = '"Special Elite", "Courier New", monospace';

    const title = this.add
      .text(200, 295, "[ Paused ]", {
        fontSize: "20px",
        fontFamily: typoOv,
        color: "#e0e0f8",
      })
      .setOrigin(0.5);

    const resumeBtn = this._makeOverlayButton(200, 357, "Resume", () => {
      soundManager.playClick();
      this._closeMenuOverlay();
    });

    const menuBtn = this._makeOverlayButton(200, 405, "Return to Menu", () => {
      soundManager.playClick();
      this.scene.stop("UIScene");
      this.scene.start("MenuScene");
    });

    // Dev cheat trigger — top-right corner of the pause panel.
    // A 44×44 invisible hit zone ensures reliable taps on mobile.
    const cheatHit = this.add
      .rectangle(348, 264, 44, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const cheatLabel = this.add
      .text(348, 264, "[~]", {
        fontSize: "13px",
        fontFamily: typoOv,
        color: "#667788",
      })
      .setOrigin(0.5, 0.5);

    cheatHit.on("pointerover", () => cheatLabel.setColor("#aabbcc"));
    cheatHit.on("pointerout",  () => cheatLabel.setColor("#667788"));
    cheatHit.on("pointerdown", () => {
      soundManager.playClick();
      this._openCheatInput();
    });

    this._menuOverlayGroup.add([
      backdrop, panel, title,
      ...resumeBtn, ...menuBtn,
      cheatHit, cheatLabel,
    ]);
  }

  // ── Cheat input (developer testing) ─────────────────────

  _openCheatInput() {
    if (this._cheatOverlay) return;

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#12121e",
      border: "1px solid #555577",
      borderRadius: "10px",
      padding: "28px 32px 24px",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "14px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.85)",
      minWidth: "260px",
      fontFamily: '"Special Elite","Courier New",monospace',
    });

    const title = document.createElement("div");
    Object.assign(title.style, { fontSize: "12px", color: "#666677", letterSpacing: "0.12em" });
    title.textContent = "[ DEV ACCESS ]";

    const input = document.createElement("input");
    Object.assign(input.style, {
      fontFamily: '"Special Elite","Courier New",monospace',
      fontSize: "20px",
      background: "#0a0a14",
      border: "1px solid #444466",
      borderRadius: "6px",
      color: "#d8d8f0",
      padding: "10px 16px",
      outline: "none",
      textAlign: "center",
      letterSpacing: "0.25em",
      width: "180px",
      boxSizing: "border-box",
    });
    input.type = "password";
    input.maxLength = 10;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");

    const hint = document.createElement("div");
    Object.assign(hint.style, { fontSize: "12px", color: "#444455" });
    hint.textContent = "Enter code";

    overlay.appendChild(title);
    overlay.appendChild(input);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);
    this._cheatOverlay = overlay;

    setTimeout(() => input.focus(), 80);

    const attempt = () => {
      const code = input.value.toLowerCase().trim();
      if (code === "alice") {
        hint.textContent = "\u2713 Access granted";
        hint.style.color = "#77cc88";
        input.style.borderColor = "#44aa66";
        setTimeout(() => this._runCheat(), 700);
      } else if (code.length >= 5) {
        hint.textContent = "Invalid code";
        hint.style.color = "#cc6666";
        input.style.borderColor = "#884444";
        setTimeout(() => {
          input.value = "";
          hint.textContent = "Enter code";
          hint.style.color = "#444455";
          input.style.borderColor = "#444466";
        }, 900);
      }
    };

    input.addEventListener("input", () => {
      hint.textContent = "Enter code";
      hint.style.color = "#444455";
      input.style.borderColor = "#444466";
      if (input.value.length === 5) attempt();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
      if (e.key === "Escape") this._closeCheatInput();
    });

    const outside = (e) => {
      if (!overlay.contains(e.target)) this._closeCheatInput();
    };
    overlay._outside = outside;
    setTimeout(() => document.addEventListener("pointerdown", outside), 200);
  }

  _closeCheatInput() {
    if (!this._cheatOverlay) return;
    const o = this._cheatOverlay;
    if (o._outside) document.removeEventListener("pointerdown", o._outside);
    try { document.body.removeChild(o); } catch (_) {}
    this._cheatOverlay = null;
  }

  _runCheat() {
    const lastIndex = GameScene.getAllLevels().length - 1;
    this._closeCheatInput();
    this._closeMenuOverlay();
    GameScene.saveProgress(lastIndex);
    this.scene.restart({ levelIndex: lastIndex });
  }

  _makeOverlayButton(cx, cy, label, callback) {
    const hitW = 160;
    const hitH = 44;
    const btnW = 130;
    const btnH = 36;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a44, 1);
    bg.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 8);
    bg.lineStyle(1, 0x6666aa, 1);
    bg.strokeRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 8);

    const txt = this.add
      .text(cx, cy, label, {
        fontSize: "14px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#d8d8f0",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(cx, cy, hitW, hitH)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => txt.setColor("#ffffff"));
    zone.on("pointerout", () => txt.setColor("#d8d8f0"));
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
      // Clear prologue flag so it replays on the next fresh start
      localStorage.removeItem(LS.prologue);
    } catch (_) {}
  }
}
