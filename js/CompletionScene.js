class CompletionScene extends Phaser.Scene {
  constructor() {
    super("CompletionScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const title = this.add
      .text(cx, cy - 60, "Still Life", {
        fontSize: "44px",
        fontFamily: '"Playfair Display", Georgia, serif',
        color: "#c0c0e0",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const subtitle = this.add
      .text(cx, cy + 5, "Every room tells a story.\nYou listened.", {
        fontSize: "16px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#8888aa",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const btnW = 200;
    const btnH = 48;
    const btnY = cy + 100;

    const btnBg = this.add.graphics().setAlpha(0);
    btnBg.fillStyle(0x2a2a42, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    btnBg.lineStyle(1, 0x555577, 1);
    btnBg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

    const btnLabel = this.add
      .text(cx, btnY, "[ Return to Menu ]", {
        fontSize: "14px",
        fontFamily: '"Special Elite", "Courier New", monospace',
        color: "#aaaacc",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this._pendingReturn = false;

    const zone = this.add
      .zone(cx, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    zone.input.enabled = false;

    zone.on("pointerover", () => btnLabel.setColor("#ffffff"));
    zone.on("pointerout", () => btnLabel.setColor("#aaaacc"));
    zone.on("pointerdown", () => {
      soundManager.playClick();
      if (zone.input.enabled) {
        this.scene.start("MenuScene");
      } else {
        this._pendingReturn = true;
        btnLabel.setText("[ Loading... ]");
      }
    });

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 2000,
      ease: "Cubic.easeOut",
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 2000,
      delay: 1200,
      ease: "Cubic.easeOut",
    });

    this.tweens.add({
      targets: [btnBg, btnLabel],
      alpha: 1,
      duration: 1500,
      delay: 3000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        zone.input.enabled = true;
        if (this._pendingReturn) {
          this.scene.start("MenuScene");
        }
      },
    });
  }
}
