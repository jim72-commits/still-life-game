class PrologueScene extends Phaser.Scene {
  constructor() {
    super("PrologueScene");
  }

  create() {
    this._done = false;
    this.cameras.main.setBackgroundColor(0x000000);

    const cx = 200;
    const cy = 350;
    const typo = '"Special Elite", "Courier New", monospace';

    const lines = [
      { text: "This is a house.", y: cy - 46 },
      { text: "These are the things left behind.", y: cy },
      { text: "You are here to understand what happened.", y: cy + 46 },
    ];

    const textObjects = lines.map((ln) =>
      this.add
        .text(cx, ln.y, ln.text, {
          fontSize: "17px",
          fontFamily: typo,
          color: "#e0e0e8",
          align: "center",
          wordWrap: { width: 340 },
          resolution: Math.min(window.devicePixelRatio || 1, 3),
        })
        .setOrigin(0.5)
        .setAlpha(0)
    );

    const fadeIn = 1000;
    const hold = 2000;
    const step = fadeIn + hold;

    textObjects.forEach((txt, i) => {
      this.tweens.add({
        targets: txt,
        alpha: 1,
        duration: fadeIn,
        delay: i * step,
        ease: "Cubic.easeOut",
      });
    });

    const allTextDone = lines.length * step;
    this.time.delayedCall(allTextDone, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this._goToLevel1();
      });
    });

    const skipLabel = this.add
      .text(362, 672, "[ Skip ]", {
        fontSize: "13px",
        fontFamily: typo,
        color: "#666688",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    skipLabel.on("pointerover", () => skipLabel.setColor("#8888bb"));
    skipLabel.on("pointerout", () => skipLabel.setColor("#555577"));
    skipLabel.on("pointerdown", () => {
      soundManager.playClick();
      skipLabel.setScale(0.9);
      this.tweens.add({
        targets: skipLabel,
        scale: 1,
        duration: 100,
        ease: "Cubic.easeOut",
      });
      this._goToLevel1();
    });

    // Wait for the launching tap to fully release (pointerup) before arming
    // the tap-to-skip listener. This prevents the Chapter 1 tap from
    // immediately dismissing the prologue when the scene loads.
    const armSkip = () => {
      if (this._done) return;
      this.input.once("pointerup", () => {
        if (this._done) return;
        this.input.on("pointerdown", (_pointer, targets) => {
          if (targets.length === 0) this._goToLevel1();
        });
      });
    };
    // Minimum 400ms before even listening for the pointerup, in case
    // the scene starts before the finger has lifted at all.
    this.time.delayedCall(400, armSkip);
  }

  _goToLevel1() {
    if (this._done) return;
    this._done = true;
    PrologueScene.markSeen();
    this.scene.start("GameScene", { levelIndex: 0 });
  }

  static hasBeenSeen() {
    try {
      return localStorage.getItem(LS.prologue) === "true";
    } catch (_) {
      return false;
    }
  }

  static markSeen() {
    try {
      localStorage.setItem(LS.prologue, "true");
    } catch (_) { /* storage unavailable */ }
  }
}
