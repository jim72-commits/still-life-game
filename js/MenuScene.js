// Canvas: 400x700 portrait layout
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a1a);
    this._showLoadingBar();
  }

  // ── Phaser-side loading bar ─────────────────────────────

  _showLoadingBar() {
    const cx = 200;
    const cy = 350;
    const barW = 160;
    const barH = 3;
    const serif = '"Playfair Display", Georgia, serif';

    this._loadGroup = this.add.container(0, 0);

    const title = this.add
      .text(cx, cy - 28, "Still Life", {
        fontSize: "34px", fontFamily: serif, color: "#d8d8e8",
      })
      .setOrigin(0.5).setAlpha(0.7);
    this._loadGroup.add(title);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x333355, 1);
    barBg.fillRoundedRect(cx - barW / 2, cy + 12, barW, barH, 1);
    this._loadGroup.add(barBg);

    this._loadBarFill = this.add.graphics();
    this._loadGroup.add(this._loadBarFill);
    this._loadBarW = barW;
    this._loadBarX = cx - barW / 2;
    this._loadBarY = cy + 12;
    this._loadBarH = barH;
    this._loadProgress = 0;

    this._animateBarTo(0.6, 800);

    const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const minDisplay = new Promise((r) => this.time.delayedCall(500, r));

    Promise.all([fontReady, minDisplay]).then(() => {
      if (!this.scene.isActive("MenuScene")) return;
      this._animateBarTo(1, 300);
      this.time.delayedCall(400, () => this._transitionToMenu());
    });
  }

  _animateBarTo(target, duration) {
    const start = this._loadProgress;
    this.tweens.addCounter({
      from: start * 100, to: target * 100, duration, ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        this._loadProgress = tween.getValue() / 100;
        this._drawBarFill();
      },
    });
  }

  _drawBarFill() {
    this._loadBarFill.clear();
    this._loadBarFill.fillStyle(0x7777bb, 1);
    this._loadBarFill.fillRoundedRect(
      this._loadBarX, this._loadBarY,
      this._loadBarW * this._loadProgress, this._loadBarH, 1
    );
  }

  _transitionToMenu() {
    this.tweens.add({
      targets: this._loadGroup, alpha: 0, duration: 300, ease: "Cubic.easeIn",
      onComplete: () => {
        this._loadGroup.destroy();
        this._hideHTMLOverlay();
        this._buildMenu();
      },
    });
  }

  _hideHTMLOverlay() {
    clearTimeout(window._loadTimer);
    const el = document.getElementById("loading-screen");
    if (el) {
      el.classList.add("hidden");
      setTimeout(() => { el.style.display = "none"; }, 500);
    }
  }

  // ── Full menu UI (portrait: stacked vertically) ─────────

  _buildMenu() {
    // Guard: ensure canvas pointer events are active
    const canvas = this.sys.game.canvas;
    if (canvas && (!canvas.style.pointerEvents || canvas.style.pointerEvents === 'none')) {
      canvas.style.pointerEvents = 'auto';
      console.log('[MenuScene] Canvas pointer-events restored to auto');
    }

    const cx = 200;
    const saved = GameScene.loadProgress();
    const total = GameScene.getAllLevels().length;
    const isComplete = saved >= total || GameScene.isChapterComplete();
    const serif = '"Playfair Display", Georgia, serif';
    const typo = '"Special Elite", "Courier New", monospace';

    this.add
      .text(cx, 72, "Still Life", {
        fontSize: "50px",
        fontFamily: serif,
        color: "#eeeeff",
        resolution: Math.min(window.devicePixelRatio || 1, 3),
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 122, "An Anthology of Quiet Rooms", {
        fontSize: "14px",
        fontFamily: typo,
        color: "#9999b8",
        resolution: Math.min(window.devicePixelRatio || 1, 3),
      })
      .setOrigin(0.5);

    const chapters = [
      { num: 1, title: "The House", available: true },
      { num: 2, title: "The Office", available: false },
      { num: 3, title: "The Studio", available: false },
    ];

    const cardW = 340;
    const cardH = 90;
    const gap = 12;
    const startY = 210;

    chapters.forEach((ch, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;
      if (ch.available) {
        this._createActiveCard(cx, y, cardW, cardH, ch, saved, total, isComplete, serif);
      } else {
        this._createLockedCard(cx, y, cardW, cardH, ch, serif);
      }
    });

    if (isComplete) {
      const savedRating = GameScene.loadRating();
      const rating = savedRating || SummaryScene._calcRating(GameScene.loadStats());
      const lastCardBottom = startY + chapters.length * (cardH + gap) - gap;
      this.add
        .text(cx, lastCardBottom + 20, rating, {
          fontSize: "13px", fontFamily: typo, color: "#aaaacc",
          resolution: Math.min(window.devicePixelRatio || 1, 3),
        })
        .setOrigin(0.5);
    }

    this._createMuteToggle();
    this.input.once("pointerdown", () => soundManager.playAmbient());

    this._createResetButton(cx);
    this._buildConfirmOverlay(cx);

    this._addAmbientParticles();

    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main, alpha: 1, duration: 1000, ease: "Cubic.easeOut",
    });
  }

  // ── Active chapter card ────────────────────────────────

  _createActiveCard(x, y, w, h, ch, saved, total, isComplete, serif) {
    const typo = '"Special Elite", "Courier New", monospace';
    const bg = this.add.graphics();
    const draw = (fill, stroke) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(1, stroke, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(0x252542, 0x6666aa);

    this.add.text(x, y - 22, `Chapter ${ch.num}`, {
      fontSize: "12px", fontFamily: typo, color: "#9999bb", letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(x, y - 2, ch.title, {
      fontSize: "22px", fontFamily: serif, color: "#eeeeff",
    }).setOrigin(0.5);

    this.add.text(x, y + 22, "30 rooms", {
      fontSize: "12px", fontFamily: typo, color: "#777799",
    }).setOrigin(0.5);

    const nextLevelNumber = Math.min(saved + 1, total);
    const statusText = isComplete ? "\u2713 Completed" : `Level ${nextLevelNumber} / ${total}`;
    const statusColor = isComplete ? "#77cc88" : "#aaaacc";

    this.add.text(x, y + 38, statusText, {
      fontSize: "12px", fontFamily: typo, color: statusColor,
    }).setOrigin(0.5);

    if (!isComplete && saved >= 5) {
      this.add.text(x, y + 54, "\u22ef View All", {
        fontSize: "11px", fontFamily: typo, color: "#666688",
      }).setOrigin(0.5);
    }

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => draw(0x303060, 0x8888cc));
    zone.on("pointerout", () => draw(0x252542, 0x6666aa));
    zone.on("pointerdown", () => {
      soundManager.playClick();
      if (saved === 0) {
        // No progress yet (fresh start or post-reset) — clear stale prologue flag and show intro
        try { localStorage.removeItem(LS.prologue); } catch (_) {}
        this.scene.start("PrologueScene");
      } else if (saved >= 5) {
        this._openLevelSelect(saved, total);
      } else {
        this.scene.start("GameScene", { levelIndex: saved });
      }
    });
  }

  // ── Locked chapter card ────────────────────────────────

  _createLockedCard(x, y, w, h, ch, serif) {
    const typo = '"Special Elite", "Courier New", monospace';
    const bg = this.add.graphics();
    const draw = (hovered) => {
      bg.clear();
      bg.fillStyle(0x1e1e2e, hovered ? 0.75 : 0.6);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(1, 0x444455, hovered ? 0.8 : 0.5);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);

    this.add.text(x, y - 20, `Chapter ${ch.num}`, {
      fontSize: "12px", fontFamily: typo, color: "#555566", letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(x, y + 2, ch.title, {
      fontSize: "22px", fontFamily: serif, color: "#555566",
    }).setOrigin(0.5);

    const classified = this.add.text(x, y + 26, "[CLASSIFIED]", {
      fontSize: "12px", fontFamily: typo, color: "#444455",
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: false });
    zone.on("pointerover", () => { draw(true); classified.setColor("#555566"); });
    zone.on("pointerout", () => { draw(false); classified.setColor("#444455"); });
  }

  // ── Level select overlay ──────────────────────────────

  _openLevelSelect(saved, total) {
    if (this._levelSelectGroup) return;
    const typo = '"Special Elite", "Courier New", monospace';
    this._levelSelectGroup = this.add.container(0, 0).setDepth(60).setAlpha(0);
    this._levelSelectInteractives = [];

    this.tweens.add({ targets: this._levelSelectGroup, alpha: 1, duration: 200, ease: "Cubic.easeOut" });

    const backdrop = this.add.rectangle(200, 350, 400, 700, 0x000000, 0.8);
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this._closeLevelSelect());
    this._levelSelectGroup.add(backdrop);
    this._levelSelectInteractives.push(backdrop);

    const pw = 360;
    const ph = 460;
    const panel = this.add.graphics();
    panel.fillStyle(0x171730, 0.98);
    panel.fillRoundedRect(200 - pw / 2, 350 - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x555577, 1);
    panel.strokeRoundedRect(200 - pw / 2, 350 - ph / 2, pw, ph, 14);
    this._levelSelectGroup.add(panel);

    this._levelSelectGroup.add(
      this.add.text(200, 350 - ph / 2 + 26, "[ Select Level ]", {
        fontSize: "18px", fontFamily: typo, color: "#e0e0f8",
      }).setOrigin(0.5)
    );

    const cols = 5;
    const cellW = 52;
    const cellH = 44;
    const gapX = 8;
    const gapY = 8;
    const gridW = cols * cellW + (cols - 1) * gapX;
    const gridX = 200 - gridW / 2 + cellW / 2;
    const gridY = 350 - ph / 2 + 68;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridX + col * (cellW + gapX);
      const cy = gridY + row * (cellH + gapY);
      const unlocked = i <= saved;

      const cellBg = this.add.graphics();
      if (unlocked) {
        const isCurrent = i === saved;
        cellBg.fillStyle(isCurrent ? 0x4a4a7a : 0x252545, 1);
        cellBg.fillRoundedRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH, 6);
        cellBg.lineStyle(2, isCurrent ? 0xaaaaff : 0x555577, 1);
        cellBg.strokeRoundedRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH, 6);
      } else {
        cellBg.fillStyle(0x1a1a28, 0.5);
        cellBg.fillRoundedRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH, 6);
      }

      const lbl = this.add.text(cx, cy, `${i + 1}`, {
        fontSize: "14px", fontFamily: typo,
        color: unlocked ? (i === saved ? "#ccccff" : "#aaaacc") : "#444455",
      }).setOrigin(0.5);

      this._levelSelectGroup.add([cellBg, lbl]);

      if (unlocked) {
        const zone = this.add.zone(cx, cy, cellW, cellH).setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => lbl.setColor("#ffffff"));
        zone.on("pointerout", () => lbl.setColor(i === saved ? "#ccccff" : "#aaaacc"));
        zone.on("pointerdown", () => {
          soundManager.playClick();
          this._closeLevelSelect();
          this.scene.start("GameScene", { levelIndex: i });
        });
        this._levelSelectGroup.add(zone);
        this._levelSelectInteractives.push(zone);
      }
    }

    const contBtnY = 350 + ph / 2 - 36;
    const contBg = this.add.graphics();
    contBg.fillStyle(0x2a6a3a, 1);
    contBg.fillRoundedRect(200 - 100, contBtnY - 20, 200, 40, 8);
    contBg.lineStyle(1, 0x44cc66, 1);
    contBg.strokeRoundedRect(200 - 100, contBtnY - 20, 200, 40, 8);

    const contLbl = this.add.text(200, contBtnY, `Continue (Level ${saved + 1})`, {
      fontSize: "14px", fontFamily: typo, color: "#ccffcc",
    }).setOrigin(0.5);

    const contZone = this.add.zone(200, contBtnY, 200, 40).setInteractive({ useHandCursor: true });
    contZone.on("pointerover", () => contLbl.setColor("#ffffff"));
    contZone.on("pointerout", () => contLbl.setColor("#ccffcc"));
    contZone.on("pointerdown", () => {
      soundManager.playClick();
      this._closeLevelSelect();
      this.scene.start("GameScene", { levelIndex: saved });
    });

    this._levelSelectGroup.add([contBg, contLbl, contZone]);
    this._levelSelectInteractives.push(contZone);
  }

  _closeLevelSelect() {
    if (this._levelSelectGroup) {
      this._levelSelectGroup.destroy();
      this._levelSelectGroup = null;
      this._levelSelectInteractives = null;
    }
  }

  // ── Ambient dust particles ─────────────────────────────

  _addAmbientParticles() {
    if (!this.textures.exists("_dust")) {
      const gfx = this.make.graphics({ add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(2, 2, 2);
      gfx.generateTexture("_dust", 4, 4);
      gfx.destroy();
    }
    this.add.particles(200, 350, "_dust", {
      x: { min: 0, max: 400 },
      y: { min: 0, max: 700 },
      speedX: { min: -4, max: 4 },
      speedY: { min: -6, max: -1 },
      lifespan: { min: 6000, max: 12000 },
      frequency: 800,
      alpha: { start: 0, end: 0, ease: "Cubic.easeOut" },
      emitCallback: (particle) => {
        particle.alphaSteps = [
          { value: 0.15, t: 0.3 },
          { value: 0.08, t: 0.7 },
          { value: 0, t: 1 },
        ];
      },
      scale: { start: 0.3, end: 0.6 },
      tint: 0x7777bb,
      quantity: 1,
      blendMode: "ADD",
    }).setDepth(-1);
  }

  // ── Envelope (letter reward) ───────────────────────────



  // ── Mute toggle ────────────────────────────────────────

  _createMuteToggle() {
    const x = 382;
    const y = 22;
    const typo = '"Special Elite", "Courier New", monospace';

    this.muteIcon = this.add
      .text(x, y, "\u266a", {
        fontSize: "18px", fontFamily: typo,
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

  // ── Reset Progress ─────────────────────────────────────

  _createResetButton(cx) {
    const y = 668;
    const typo = '"Special Elite", "Courier New", monospace';
    const txt = this.add
      .text(cx, y, "[ Reset Progress ]", {
        fontSize: "13px",
        fontFamily: typo,
        color: "#555566",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerover", () => txt.setColor("#886666"));
    txt.on("pointerout", () => txt.setColor("#555566"));
    txt.on("pointerdown", () => {
      soundManager.playClick();
      this._openConfirm();
    });
  }

  _buildConfirmOverlay(cx) {
    this.confirmOverlay = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.confirmInteractives = [];

    const backdrop = this.add.rectangle(200, 350, 400, 700, 0x000000, 0.75);
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this._closeConfirm());
    backdrop.input.enabled = false;
    this.confirmOverlay.add(backdrop);
    this.confirmInteractives.push(backdrop);

    const pw = 340;
    const ph = 175;
    const py = 350;

    const panel = this.add.graphics();
    panel.fillStyle(0x171730, 0.98);
    panel.fillRoundedRect(cx - pw / 2, py - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x666688, 1);
    panel.strokeRoundedRect(cx - pw / 2, py - ph / 2, pw, ph, 14);
    this.confirmOverlay.add(panel);

    const msg = this.add
      .text(cx, py - 38, "This will reset your Chapter 1\nprogress and stats.\nYour completion record will be preserved.", {
        fontSize: "14px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#ccccee",
        align: "center",
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    this.confirmOverlay.add(msg);

    this._addConfirmBtn(cx - 85, py + 48, "Yes, Reset", "#ee8888", 0x5a2a2a, 0xcc4444, () => {
      soundManager.playClick();
      GameScene.resetAll();
      this._closeConfirm();
      this.scene.restart();
    });

    this._addConfirmBtn(cx + 85, py + 48, "Cancel", "#bbbbee", 0x2a2a4a, 0x6666aa, () => {
      soundManager.playClick();
      this._closeConfirm();
    });
  }

  _addConfirmBtn(x, y, label, textColor, fill, stroke, onClick) {
    const bw = 140;
    const bh = 46;
    const bg = this.add.graphics();
    const draw = (f, s) => {
      bg.clear();
      bg.fillStyle(f, 1);
      bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      bg.lineStyle(1, s, 1);
      bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    };
    draw(fill, stroke);

    const lbl = this.add.text(x, y, label, {
      fontSize: "14px",
      fontFamily: '"Special Elite", "Courier New", monospace',
      color: textColor,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ useHandCursor: true });
    const hoverFill = Phaser.Display.Color.ValueToColor(fill).brighten(20).color;
    zone.on("pointerover", () => draw(hoverFill, stroke));
    zone.on("pointerout", () => draw(fill, stroke));
    zone.on("pointerdown", onClick);

    zone.input.enabled = false;
    this.confirmOverlay.add([bg, lbl, zone]);
    this.confirmInteractives.push(zone);
  }

  _openConfirm() {
    this.confirmOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.confirmOverlay, alpha: 1, duration: 200, ease: "Cubic.easeOut" });
    this.confirmInteractives.forEach((o) => (o.input.enabled = true));
  }

  _closeConfirm() {
    this.confirmOverlay.setVisible(false);
    this.confirmInteractives.forEach((o) => (o.input.enabled = false));
  }
}
