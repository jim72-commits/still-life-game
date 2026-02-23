// Canvas: 400x700 portrait layout
class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  init(data) {
    this.getSequence = data.getSequence;
    this.correctSequence = data.correctSequence;
    this.resetCards = data.resetCards;
    this.onCorrect = data.onCorrect;
    this.cardManager = data.cardManager;
    this.cards = data.cards;
    this.chapterId = data.chapterId;
    this.levelStats = data.levelStats;
    this.levelIndex = data.levelIndex;
    this.submitted = false;
    this.clueUsed = false;
    this.hintOpen = false;
  }

  create() {
    this._submitReady = false;
    this._createSubmitButton();
    this._createHintButton();
    this._buildHintOverlay();
    this._createFlashOverlay();
    this._pollSlots();
  }

  // ── Submit ──────────────────────────────────────────────

  _createSubmitButton() {
    const cx = 200;
    const by = 638;
    const btnW = 352;
    const btnH = 44;

    this.submitBg = this.add.graphics();
    this._drawSubmitBtn(0x1e3e28, 0x336644);

    this.submitLabel = this.add
      .text(cx, by, "Submit", {
        fontSize: "16px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#99bb99",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(cx, by, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      if (!this.submitted && this._submitReady) this._drawSubmitBtn(0x3a8a4a, 0x66ee88);
    });
    zone.on("pointerout", () => {
      if (!this.submitted && this._submitReady) this._drawSubmitBtn(0x2a6a3a, 0x44cc66);
    });
    zone.on("pointerdown", () => {
      soundManager.playClick();
      if (!this.submitted && this._submitReady) this.submitLabel.setScale(0.95);
      this._onSubmit();
    });
    zone.on("pointerup", () => {
      if (!this.submitted) {
        this.tweens.add({ targets: this.submitLabel, scale: 1, duration: 100 });
      }
    });
  }

  _drawSubmitBtn(fill, stroke) {
    const cx = 200;
    const by = 638;
    const btnW = 352;
    const btnH = 44;
    this.submitBg.clear();
    this.submitBg.fillStyle(fill, 1);
    this.submitBg.fillRoundedRect(cx - btnW / 2, by - btnH / 2, btnW, btnH, 12);
    this.submitBg.lineStyle(2, stroke, 1);
    this.submitBg.strokeRoundedRect(cx - btnW / 2, by - btnH / 2, btnW, btnH, 12);
  }

  _pollSlots() {
    this._slotTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (this.submitted) return;
        const seq = this.getSequence();
        const allFilled = !seq.includes(null);
        if (allFilled && !this._submitReady) {
          this._submitReady = true;
          this.submitLabel.setColor("#ccffcc");
          this._drawSubmitBtn(0x2a6a3a, 0x44cc66);
        } else if (!allFilled && this._submitReady) {
          this._submitReady = false;
          this.submitLabel.setColor("#99bb99");
          this._drawSubmitBtn(0x1e3e28, 0x336644);
        }
      },
    });
    this.submitLabel.setColor("#99bb99");
    this._drawSubmitBtn(0x1e3e28, 0x336644);
  }

  // ── Hint "?" trigger ───────────────────────────────────

  _createHintButton() {
    const x = 370;
    const y = 30;
    const r = 24;

    this.hintBtnBg = this.add.graphics();
    this._drawHintTrigger(0x2e2e55, 0x7777aa);

    this.add
      .text(x, y, "?", {
        fontSize: "22px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#bbbbee",
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, r * 2, r * 2)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => this._drawHintTrigger(0x444466, 0x9999cc));
    zone.on("pointerout", () => this._drawHintTrigger(0x2e2e55, 0x7777aa));
    zone.on("pointerdown", () => this._toggleHintOverlay());
  }

  _drawHintTrigger(fill, stroke) {
    const x = 370;
    const y = 30;
    const r = 24;
    this.hintBtnBg.clear();
    this.hintBtnBg.fillStyle(fill, 1);
    this.hintBtnBg.fillCircle(x, y, r);
    this.hintBtnBg.lineStyle(2, stroke, 1);
    this.hintBtnBg.strokeCircle(x, y, r);
  }

  // ── Hint overlay ───────────────────────────────────────

  _buildHintOverlay() {
    this.hintOverlay = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.hintInteractives = [];

    const backdrop = this.add.rectangle(200, 350, 400, 700, 0x000000, 0.7);
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this._closeHintOverlay());
    backdrop.input.enabled = false;
    this.hintOverlay.add(backdrop);
    this.hintInteractives.push(backdrop);

    const px = 200;
    const py = 350;
    const pw = 340;
    const ph = 330;
    const panel = this.add.graphics();
    panel.fillStyle(0x171730, 0.98);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 14);
    panel.lineStyle(1, 0x555577, 1);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 14);
    this.hintOverlay.add(panel);

    const title = this.add
      .text(px, py - ph / 2 + 30, "[ Hints ]", {
        fontSize: "20px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#e0e0f8",
      })
      .setOrigin(0.5);
    this.hintOverlay.add(title);

    this.focusBtn = this._addHintOption(px, py - 65, "Focus", "Highlight a wrong card", () => this._useFocus(), () => true);
    this.clueBtn = this._addHintOption(px, py + 10, "Clue", "Lock first card \u00b7 1/level", () => this._useClue(), () => !this.clueUsed);
    this.revealBtn = this._addHintOption(px, py + 85, "Reveal", "Show answer (3s) \u00b7 1/chapter", () => this._useReveal(), () => !this._isRevealSpent());
  }

  _addHintOption(x, y, label, desc, onClick, isAvail) {
    const bw = 300;
    const bh = 58;
    const bg = this.add.graphics();

    const draw = (avail, hover) => {
      bg.clear();
      if (!avail) {
        bg.fillStyle(0x1e1e30, 0.6);
        bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
      } else {
        bg.fillStyle(hover ? 0x303058 : 0x252545, 1);
        bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
        bg.lineStyle(1, hover ? 0x8888bb : 0x666688, 1);
        bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
      }
    };
    draw(isAvail(), false);

    const lbl = this.add
      .text(x, y - 9, label, {
        fontSize: "16px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: isAvail() ? "#ddddff" : "#666677",
      })
      .setOrigin(0.5);

    const dsc = this.add
      .text(x, y + 14, desc, {
        fontSize: "13px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: isAvail() ? "#9999bb" : "#444455",
      })
      .setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => { if (isAvail()) draw(true, true); });
    zone.on("pointerout", () => draw(isAvail(), false));
    zone.on("pointerdown", () => {
      if (!isAvail()) return;
      soundManager.playClick();
      onClick();
      this._closeHintOverlay();
    });

    zone.input.enabled = false;
    this.hintOverlay.add([bg, lbl, dsc, zone]);
    this.hintInteractives.push(zone);

    return {
      refresh: () => {
        const a = isAvail();
        draw(a, false);
        lbl.setColor(a ? "#ddddff" : "#666677");
        dsc.setColor(a ? "#9999bb" : "#444455");
      },
    };
  }

  _toggleHintOverlay() {
    if (this.hintOpen) this._closeHintOverlay();
    else this._openHintOverlay();
  }

  _openHintOverlay() {
    this.hintOpen = true;
    soundManager.playHintOpen();
    this.focusBtn.refresh();
    this.clueBtn.refresh();
    this.revealBtn.refresh();
    this.hintOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.hintOverlay, alpha: 1, duration: 200, ease: "Cubic.easeOut" });
    this.hintInteractives.forEach((o) => (o.input.enabled = true));
    this._hintEsc = () => this._closeHintOverlay();
    this.input.keyboard.on("keydown-ESC", this._hintEsc);
  }

  _closeHintOverlay() {
    this.hintOpen = false;
    soundManager.playHintClose();
    this.hintOverlay.setVisible(false);
    this.hintInteractives.forEach((o) => (o.input.enabled = false));
    if (this._hintEsc) {
      this.input.keyboard.off("keydown-ESC", this._hintEsc);
      this._hintEsc = null;
    }
  }

  // ── Hint actions ───────────────────────────────────────

  _useFocus() {
    const seq = this.cardManager.getSequence();
    const wrong = [];
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] !== null && seq[i] !== this.correctSequence[i]) wrong.push(i);
    }
    if (wrong.length === 0) return;
    this.levelStats.focus++;
    Analytics.hintUsed(this.levelIndex + 1, "focus");
    const pick = Phaser.Utils.Array.GetRandom(wrong);
    const cardObj = this.cardManager.slotContents[pick];
    if (cardObj) this.cardManager.pulseCardRed(cardObj);
  }

  _useClue() {
    if (this.clueUsed) return;
    this.clueUsed = true;
    this.levelStats.clue++;
    Analytics.hintUsed(this.levelIndex + 1, "clue");
    this.cardManager.lockCardInSlot(this.correctSequence[0], 0);
  }

  _useReveal() {
    if (this._isRevealSpent()) return;
    this._markRevealSpent();
    this.levelStats.reveal++;
    Analytics.hintUsed(this.levelIndex + 1, "reveal");

    const lines = this.correctSequence.map((id, i) => {
      const card = this.cards.find((c) => c.id === id);
      return `${i + 1}.  ${card ? card.text : id}`;
    });

    const overlay = this.add.container(0, 0).setDepth(80).setAlpha(0);
    overlay.add(this.add.rectangle(200, 350, 400, 700, 0x000000, 0.85));
    overlay.add(
      this.add.text(200, 260, "[ Correct Sequence ]", {
        fontSize: "18px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#ccccee",
      }).setOrigin(0.5)
    );
    overlay.add(
      this.add.text(200, 365, lines.join("\n"), {
        fontSize: "15px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#eeeeFF",
        align: "center",
        lineSpacing: 16,
      }).setOrigin(0.5)
    );

    this.tweens.add({ targets: overlay, alpha: 1, duration: 300, ease: "Cubic.easeOut" });
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 500, ease: "Cubic.easeIn",
        onComplete: () => overlay.destroy(),
      });
    });
  }

  _isRevealSpent() {
    return this._revealUsedThisSession || GameScene._safeGetInt(LS.hintsReveal()) > 0;
  }

  _markRevealSpent() {
    this._revealUsedThisSession = true;
  }

  // ── Flash overlay ──────────────────────────────────────

  _createFlashOverlay() {
    this.flash = this.add.rectangle(200, 350, 400, 700, 0x000000, 0);
    this.flash.setDepth(100);
  }

  _onSubmit() {
    if (this.submitted) return;
    const seq = this.getSequence();
    if (seq.includes(null)) return;

    const correct =
      seq.length === this.correctSequence.length &&
      seq.every((id, i) => id === this.correctSequence[i]);

    if (correct) {
      this.submitted = true;
      soundManager.playCorrect();
      this._showFlash(0x00ff66);
      this._showCelebration();
      this.time.delayedCall(1200, () => this.onCorrect());
    } else {
      this.levelStats.wrong++;
      Analytics.levelFail(this.levelIndex + 1);
      soundManager.playWrong();
      this._showFlash(0xff3333);
      this.time.delayedCall(800, () => this.resetCards());
    }
  }

  _showCelebration() {
    const label = this.add
      .text(200, 385, "\u2713  Room catalogued.", {
        fontSize: "18px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#aaffcc",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: label, alpha: 1, y: 375, duration: 600, ease: "Cubic.easeOut" });
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: label, alpha: 0, duration: 400, ease: "Cubic.easeIn",
        onComplete: () => label.destroy(),
      });
    });
  }

  _showFlash(color) {
    this.flash.setFillStyle(color, 0.25);
    this.tweens.add({
      targets: this.flash,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.flash.setFillStyle(0x000000, 0);
        this.flash.setAlpha(1);
      },
    });
  }
}
