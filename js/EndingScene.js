class EndingScene extends Phaser.Scene {
  constructor() {
    super("EndingScene");
  }

  create() {
    soundManager.stopAmbient();
    window.location.href = "ending.html";
  }
}
