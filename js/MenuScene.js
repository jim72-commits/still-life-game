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
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const barW = 180;
    const barH = 3;
    const serif = '"Playfair Display", Georgia, serif';

    this._loadGroup = this.add.container(0, 0);

    const title = this.add
      .text(cx, cy - 28, "Still Life", {
        fontSize: "36px", fontFamily: serif, color: "#d8d8e8",
      })
      .setOrigin(0.5).setAlpha(0.7);
    this._loadGroup.add(title);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x333344, 1);
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
    this._loadBarFill.fillStyle(0x6666aa, 1);
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

  // ── Full menu UI (landscape: left half title, right half chapters) ──

  _buildMenu() {
    const W = this.scale.width;
    const H = this.scale.height;
    const saved = GameScene.loadProgress();
    const total = GameScene.getAllLevels().length;
    const isComplete = saved >= total || GameScene.isChapterComplete();
    const serif = '"Playfair Display", Georgia, serif';
    const typo = '"Special Elite", "Courier New", monospace';

    const leftCx = W * 0.25;
    const rightCx = W * 0.5 + W * 0.25;
    const rightX = W * 0.5;
    const rightW = W * 0.5;
    const pad = 24;

    // Left half: title
    this.add
      .text(leftCx, H * 0.38, "Still Life", {
        fontSize: Math.max(36, Math.min(54, W * 0.04)) + "px",
        fontFamily: serif, color: "#d8d8e8",
      })
      .setOrigin(0.5);

    this.add
      .text(leftCx, H * 0.50, "An Anthology of Quiet Rooms", {
        fontSize: "14px", fontFamily: typo, color: "#666680",
      })
      .setOrigin(0.5);

    // Vertical divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, 0x222233, 0.5);
    divGfx.lineBetween(rightX, H * 0.1, rightX, H * 0.9);

    // Right half: chapter cards stacked vertically
    const chapters = [
      { num: 1, title: "The House", available: true },
      { num: 2, title: "The Office", available: false },
      { num: 3, title: "The Studio", available: false },
    ];

    const cardW = Math.min(rightW - pad * 2, 340);
    const cardH = Math.min(76, H * 0.16);
    const gap = 12;
    const totalH = chapters.length * cardH + (chapters.length - 1) * gap;
    const startY = H / 2 - totalH / 2 + cardH / 2;

    chapters.forEach((ch, i) => {
      const y = startY + i * (cardH + gap);
      if (ch.available) {
        this._createActiveCard(rightCx, y, cardW, cardH, ch, saved, total, isComplete, serif);
      } else {
        this._createLockedCard(rightCx, y, cardW, cardH, ch, serif);
      }
    });

    if (isComplete) {
      const savedRating = GameScene.loadRating();
      const rating = savedRating || SummaryScene._calcRating(GameScene.loadStats());
      this.add
        .text(rightCx, startY + chapters.length * (cardH + gap) + 4, rating, {
          fontSize: "13px", fontFamily: typo, color: "#8888bb",
        })
        .setOrigin(0.5);
    }

    // Reset at bottom right
    this._createResetButton(rightCx, H);
    this._buildConfirmOverlay(W, H);

    // Mute toggle
    this._createMuteToggle(W);
    this.input.once("pointerdown", () => soundManager.playAmbient());

    this._addAmbientParticles(W, H);

    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 1000, ease: "Cubic.easeOut" });
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
    draw(0x252535, 0x555577);

    this.add.text(x, y - 18, `Chapter ${ch.num}`, {
      fontSize: "11px", fontFamily: typo, color: "#777799", letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(x, y, ch.title, {
      fontSize: "18px", fontFamily: serif, color: "#d0d0e8",
    }).setOrigin(0.5);

    const nextLevelNumber = Math.min(saved + 1, total);
    const statusText = isComplete ? "\u2713 Completed" : `Level ${nextLevelNumber} / ${total}`;
    const statusColor = isComplete ? "#66aa77" : "#8888bb";

    this.add.text(x, y + 18, `30 rooms  \u00b7  ${statusText}`, {
      fontSize: "11px", fontFamily: typo, color: statusColor,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => draw(0x30304a, 0x7777aa));
    zone.on("pointerout", () => draw(0x252535, 0x555577));
    zone.on("pointerdown", () => {
      soundManager.playClick();
      if (isComplete) {
        GameScene.resetAll();
        this.scene.start("GameScene", { levelIndex: 0 });
      } else if (saved === 0 && !PrologueScene.hasBeenSeen()) {
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
      bg.fillStyle(0x1e1e28, hovered ? 0.7 : 0.6);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(1, 0x333344, hovered ? 0.7 : 0.5);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);

    this.add.text(x, y - 14, `Chapter ${ch.num}`, {
      fontSize: "11px", fontFamily: typo, color: "#444455", letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(x, y + 4, ch.title, {
      fontSize: "18px", fontFamily: serif, color: "#444458",
    }).setOrigin(0.5);

    const classified = this.add.text(x, y + 22, "[CLASSIFIED]", {
      fontSize: "11px", fontFamily: typo, color: "#3a3a4a",
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: false });
    zone.on("pointerover", () => { draw(true); classified.setColor("#444455"); });
    zone.on("pointerout", () => { draw(false); classified.setColor("#3a3a4a"); });
  }

  // ── Level select overlay ──────────────────────────────

  _openLevelSelect(saved, total) {
    if (this._levelSelectGroup) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const typo = '"Special Elite", "Courier New", monospace';

    this._levelSelectGroup = this.add.container(0, 0).setDepth(60).setAlpha(0);
    this._levelSelectInteractives = [];

    this.tweens.add({ targets: this._levelSelectGroup, alpha: 1, duration: 200, ease: "Cubic.easeOut" });

    const backdrop = this.add.rectangle(cx, cy, W, H, 0x000000, 0.75);
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this._closeLevelSelect());
    this._levelSelectGroup.add(backdrop);
    this._levelSelectInteractives.push(backdrop);

    const pw = Math.min(460, W * 0.65);
    const ph = Math.min(380, H * 0.9);
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.98);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x444466, 1);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    this._levelSelectGroup.add(panel);

    this._levelSelectGroup.add(
      this.add.text(cx, cy - ph / 2 + 24, "[ Select Level ]", {
        fontSize: "16px", fontFamily: typo, color: "#c0c0e0",
      }).setOrigin(0.5)
    );

    const cols = 6;
    const cellW = Math.min(56, (pw - 60) / cols);
    const cellH = Math.min(42, (ph - 100) / Math.ceil(total / cols));
    const gapX = 6;
    const gapY = 6;
    const gridW = cols * cellW + (cols - 1) * gapX;
    const gridX = cx - gridW / 2 + cellW / 2;
    const gridY = cy - ph / 2 + 60;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ccx = gridX + col * (cellW + gapX);
      const ccy = gridY + row * (cellH + gapY);
      const unlocked = i <= saved;

      const cellBg = this.add.graphics();
      if (unlocked) {
        const isCurrent = i === saved;
        cellBg.fillStyle(isCurrent ? 0x4a4a7a : 0x252540, 1);
        cellBg.fillRoundedRect(ccx - cellW / 2, ccy - cellH / 2, cellW, cellH, 6);
        cellBg.lineStyle(2, isCurrent ? 0xaaaaff : 0x444466, 1);
        cellBg.strokeRoundedRect(ccx - cellW / 2, ccy - cellH / 2, cellW, cellH, 6);
      } else {
        cellBg.fillStyle(0x1a1a28, 0.5);
        cellBg.fillRoundedRect(ccx - cellW / 2, ccy - cellH / 2, cellW, cellH, 6);
      }

      const lbl = this.add.text(ccx, ccy, `${i + 1}`, {
        fontSize: "13px", fontFamily: typo,
        color: unlocked ? (i === saved ? "#ccccff" : "#8888aa") : "#333344",
      }).setOrigin(0.5);

      this._levelSelectGroup.add([cellBg, lbl]);

      if (unlocked) {
        const zone = this.add.zone(ccx, ccy, cellW, cellH).setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => lbl.setColor("#ffffff"));
        zone.on("pointerout", () => lbl.setColor(i === saved ? "#ccccff" : "#8888aa"));
        zone.on("pointerdown", () => {
          soundManager.playClick();
          this._closeLevelSelect();
          this.scene.start("GameScene", { levelIndex: i });
        });
        this._levelSelectGroup.add(zone);
        this._levelSelectInteractives.push(zone);
      }
    }

    const contBtnY = cy + ph / 2 - 34;
    const contBg = this.add.graphics();
    contBg.fillStyle(0x2a6a3a, 1);
    contBg.fillRoundedRect(cx - 80, contBtnY - 18, 160, 36, 8);
    contBg.lineStyle(1, 0x44cc66, 1);
    contBg.strokeRoundedRect(cx - 80, contBtnY - 18, 160, 36, 8);

    const contLbl = this.add.text(cx, contBtnY, `Continue (Level ${saved + 1})`, {
      fontSize: "12px", fontFamily: typo, color: "#ccffcc",
    }).setOrigin(0.5);

    const contZone = this.add.zone(cx, contBtnY, 160, 36).setInteractive({ useHandCursor: true });
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

  _addAmbientParticles(W, H) {
    if (!this.textures.exists("_dust")) {
      const gfx = this.make.graphics({ add: false });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(2, 2, 2);
      gfx.generateTexture("_dust", 4, 4);
      gfx.destroy();
    }
    this.add.particles(W / 2, H / 2, "_dust", {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
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
      tint: 0x6666aa,
      quantity: 1,
      blendMode: "ADD",
    }).setDepth(-1);
  }

  // ── Mute toggle ────────────────────────────────────────

  _createMuteToggle(W) {
    const x = W - 30;
    const y = 24;
    const typo = '"Special Elite", "Courier New", monospace';

    this.muteIcon = this.add
      .text(x, y, "\u266a", {
        fontSize: "18px", fontFamily: typo,
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

  // ── Reset Progress ─────────────────────────────────────

  _createResetButton(cx, H) {
    const y = H - 24;
    const txt = this.add
      .text(cx, y, "[ Reset Progress ]", {
        fontSize: "12px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#3a3a48",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerover", () => txt.setColor("#776666"));
    txt.on("pointerout", () => txt.setColor("#3a3a48"));
    txt.on("pointerdown", () => {
      soundManager.playClick();
      this._openConfirm();
    });
  }

  _buildConfirmOverlay(W, H) {
    const cx = W / 2;
    const cy = H / 2;

    this.confirmOverlay = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.confirmInteractives = [];

    const backdrop = this.add.rectangle(cx, cy, W, H, 0x000000, 0.7);
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this._closeConfirm());
    backdrop.input.enabled = false;
    this.confirmOverlay.add(backdrop);
    this.confirmInteractives.push(backdrop);

    const pw = Math.min(340, W * 0.5);
    const ph = Math.min(160, H * 0.5);
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.97);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x555566, 1);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 14);
    this.confirmOverlay.add(panel);

    const msg = this.add
      .text(cx, cy - 30, "This will reset your Chapter 1\nprogress and stats.\nYour completion record will be preserved.", {
        fontSize: "13px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#aaaacc",
        align: "center",
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    this.confirmOverlay.add(msg);

    this._addConfirmBtn(cx - 80, cy + 42, "Yes, Reset", "#cc6666", 0x6a2a2a, 0xcc4444, () => {
      soundManager.playClick();
      GameScene.resetAll();
      this._closeConfirm();
      this.scene.restart();
    });

    this._addConfirmBtn(cx + 80, cy + 42, "Cancel", "#aaaacc", 0x2a2a3a, 0x555577, () => {
      soundManager.playClick();
      this._closeConfirm();
    });
  }

  _addConfirmBtn(x, y, label, textColor, fill, stroke, onClick) {
    const bw = 130;
    const bh = 44;
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
      fontSize: "13px",
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
