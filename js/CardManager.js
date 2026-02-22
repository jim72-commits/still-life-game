class CardManager {
  constructor(scene, cards, slots) {
    this.scene = scene;
    this.cardData = cards;
    this.slots = slots;
    this.cardObjects = [];
    this.slotContents = new Array(slots.length).fill(null);
    this.originalPositions = [];
    this._highlightedSlot = -1;
    this._ghostSlot = -1;
  }

  createCards(startX, startY, cardW, cardH, gap) {
    this.cardW = cardW;
    this.cardH = cardH;

    this.cardData.forEach((data, i) => {
      const x = startX + i * (cardW + gap);
      const y = startY;

      const container = this.scene.add.container(x, y);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x2a2a4a, 1);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      bg.lineStyle(2, 0x6c6cff, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);

      const label = this.scene.add.text(0, 0, data.text, {
        fontSize: "14px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#e8e8ff",
        align: "center",
        wordWrap: { width: cardW - 16 },
      }).setOrigin(0.5);

      container.add([bg, label]);
      const hitW = Math.max(cardW, 44);
      const hitH = Math.max(cardH, 44);
      container.setSize(hitW, hitH);
      container.setInteractive({ draggable: true, useHandCursor: true });
      container.setData("cardId", data.id);
      container.setData("slotIndex", -1);
      container.setData("locked", false);

      container.on("pointerover", () => {
        if (!container.getData("locked")) {
          this.scene.tweens.add({
            targets: container,
            y: container.y - 4,
            duration: 150,
            ease: "Cubic.easeOut",
          });
        }
      });

      container.on("pointerout", () => {
        if (!container.getData("locked")) {
          this.scene.tweens.add({
            targets: container,
            y: container.getData("slotIndex") >= 0
              ? this.slots[container.getData("slotIndex")].y
              : this.originalPositions[i].y,
            duration: 150,
            ease: "Cubic.easeOut",
          });
        }
      });

      this.originalPositions.push({ x, y });
      this.cardObjects.push(container);
    });

    this._setupDrag();
  }

  _setupDrag() {
    this.scene.input.on("dragstart", (_pointer, obj) => {
      if (obj.getData("locked")) return;
      soundManager.playDragStart();
      obj.setDepth(10);
      this.scene.tweens.add({
        targets: obj,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 120,
        ease: "Back.easeOut",
      });

      const prevSlot = obj.getData("slotIndex");
      if (prevSlot >= 0) {
        this._showGhostOutline(prevSlot);
      }
    });

    this.scene.input.on("drag", (_pointer, obj, dragX, dragY) => {
      if (obj.getData("locked")) return;
      obj.x = dragX;
      obj.y = dragY;
      this._updateSlotHighlight(dragX, dragY);
    });

    this.scene.input.on("dragend", (_pointer, obj) => {
      if (obj.getData("locked")) return;
      obj.setDepth(0);
      this._clearSlotHighlight();
      this._clearGhostOutline();
      this.scene.tweens.add({
        targets: obj,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: "Cubic.easeOut",
      });
      const placedSlot = this._findNearestSlot(obj.x, obj.y);

      const prevSlot = obj.getData("slotIndex");
      if (prevSlot >= 0) {
        this.slotContents[prevSlot] = null;
      }

      if (placedSlot !== null && this.slotContents[placedSlot] === null) {
        soundManager.playCardPlace();
        this.slotContents[placedSlot] = obj;
        obj.setData("slotIndex", placedSlot);
        this.scene.tweens.add({
          targets: obj,
          x: this.slots[placedSlot].x,
          y: this.slots[placedSlot].y,
          duration: 150,
          ease: "Back.easeOut",
        });
      } else {
        const idx = this.cardObjects.indexOf(obj);
        obj.setData("slotIndex", -1);
        this.scene.tweens.add({
          targets: obj,
          x: this.originalPositions[idx].x,
          y: this.originalPositions[idx].y,
          duration: 200,
          ease: "Back.easeOut",
        });
      }
    });
  }

  _updateSlotHighlight(x, y) {
    const nearest = this._findNearestSlot(x, y);
    const target = (nearest !== null && this.slotContents[nearest] === null) ? nearest : -1;
    if (target === this._highlightedSlot) return;
    this._clearSlotHighlight();
    if (target >= 0 && this.scene.slotGfx) {
      const slot = this.slots[target];
      const gfx = this.scene.slotGfx[target];
      gfx.clear();
      gfx.lineStyle(2, 0x6666aa, 1);
      gfx.strokeRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
      gfx.fillStyle(0x6666aa, 0.08);
      gfx.fillRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
      this._highlightedSlot = target;
    }
  }

  _clearSlotHighlight() {
    if (this._highlightedSlot >= 0 && this.scene.slotGfx) {
      const slot = this.slots[this._highlightedSlot];
      const gfx = this.scene.slotGfx[this._highlightedSlot];
      gfx.clear();
      gfx.lineStyle(2, 0x444466, 0.7);
      gfx.strokeRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
      this._highlightedSlot = -1;
    }
  }

  _showGhostOutline(slotIndex) {
    this._ghostSlot = slotIndex;
    if (this.scene.slotGfx) {
      const slot = this.slots[slotIndex];
      const gfx = this.scene.slotGfx[slotIndex];
      gfx.clear();
      gfx.lineStyle(2, 0x555588, 0.4);
      gfx.strokeRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
    }
  }

  _clearGhostOutline() {
    if (this._ghostSlot >= 0 && this.scene.slotGfx) {
      const slot = this.slots[this._ghostSlot];
      const gfx = this.scene.slotGfx[this._ghostSlot];
      gfx.clear();
      gfx.lineStyle(2, 0x444466, 0.7);
      gfx.strokeRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
      this._ghostSlot = -1;
    }
  }

  _findNearestSlot(x, y) {
    // Generous overlap detection: use 25% of card width as threshold
    const threshold = Math.max(50, this.cardW * 0.6);
    let best = null;
    let bestDist = Infinity;
    this.slots.forEach((slot, i) => {
      const d = Phaser.Math.Distance.Between(x, y, slot.x, slot.y);
      if (d < threshold && d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  getSequence() {
    return this.slotContents.map((obj) => (obj ? obj.getData("cardId") : null));
  }

  resetCards() {
    this.cardObjects.forEach((obj, i) => {
      if (obj.getData("locked")) return;

      const slot = obj.getData("slotIndex");
      if (slot >= 0) {
        this.slotContents[slot] = null;
      }
      obj.setData("slotIndex", -1);
      this.scene.tweens.add({
        targets: obj,
        x: this.originalPositions[i].x,
        y: this.originalPositions[i].y,
        duration: 300,
        ease: "Back.easeOut",
      });
    });
  }

  pulseCardRed(cardObj) {
    const w = this.cardW;
    const h = this.cardH;
    const glow = this.scene.add.graphics();
    glow.fillStyle(0xff3333, 0.3);
    glow.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    glow.lineStyle(2, 0xff4444, 1);
    glow.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    cardObj.add(glow);

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 1, to: 0.15 },
      duration: 500,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        cardObj.remove(glow);
        glow.destroy();
      },
    });
  }

  lockCardInSlot(cardId, slotIndex) {
    const cardObj = this.cardObjects.find(
      (c) => c.getData("cardId") === cardId
    );
    if (!cardObj) return;

    const prevSlot = cardObj.getData("slotIndex");
    if (prevSlot >= 0) {
      this.slotContents[prevSlot] = null;
    }

    const existing = this.slotContents[slotIndex];
    if (existing && existing !== cardObj) {
      const idx = this.cardObjects.indexOf(existing);
      const exSlot = existing.getData("slotIndex");
      if (exSlot >= 0) this.slotContents[exSlot] = null;
      existing.setData("slotIndex", -1);
      this.scene.tweens.add({
        targets: existing,
        x: this.originalPositions[idx].x,
        y: this.originalPositions[idx].y,
        duration: 250,
        ease: "Back.easeOut",
      });
    }

    this.slotContents[slotIndex] = cardObj;
    cardObj.setData("slotIndex", slotIndex);
    cardObj.setData("locked", true);
    cardObj.disableInteractive();
    soundManager.playCardPlace();

    this.scene.tweens.add({
      targets: cardObj,
      x: this.slots[slotIndex].x,
      y: this.slots[slotIndex].y,
      duration: 300,
      ease: "Back.easeOut",
    });

    const w = this.cardW;
    const h = this.cardH;
    const lockVis = this.scene.add.graphics();
    lockVis.lineStyle(2, 0x44cc66, 0.6);
    lockVis.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    cardObj.add(lockVis);
  }
}
