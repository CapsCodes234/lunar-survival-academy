import Phaser from "phaser";

function prefersReducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Placeholder building drawn with Phaser shapes.
 * Replace drawPlaceholder later, or swap in an image, without changing selection.
 */
export class Building {
  constructor(scene, config, onSelect) {
    this.id = config.id;
    this.approachX = config.approachX;
    this.approachY = config.approachY;
    this.scene = scene;
    this.flashTween = null;

    this.container = scene.add.container(config.x, config.y);
    this.container.setDepth(5);
    this.container.name = config.id;

    this.selection = scene.add.ellipse(0, 36, 116, 40, 0xf2d48a, 0.22);
    this.selection.setStrokeStyle(3, 0xf2d48a, 1);
    this.selection.setVisible(false);
    this.container.add(this.selection);

    this.drawPlaceholder(config);

    const label = scene.add.text(0, 62, config.shortName, {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "16px",
      color: "#f4efe6",
    }).setOrigin(0.5);
    label.setStroke("#1a140c", 4);
    this.container.add(label);

    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-64, -78, 128, 150),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.input.cursor = "pointer";
    this.container.on("pointerdown", () => onSelect(this.id));
  }

  drawPlaceholder(config) {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x000000, 0.25);
    graphics.fillEllipse(0, 40, 96, 24);

    if (config.type === "habitat") this.drawHabitat(graphics, config);
    if (config.type === "oxygen") this.drawOxygen(graphics, config);
    if (config.type === "greenhouse") this.drawGreenhouse(graphics, config);
    if (config.type === "solar") this.drawSolar(graphics, config);

    this.container.add(graphics);
  }

  drawHabitat(graphics, config) {
    graphics.fillStyle(config.color, 1);
    graphics.fillRoundedRect(-34, -8, 68, 40, 6);
    graphics.fillStyle(config.accent, 1);
    graphics.fillCircle(0, -16, 28);
    graphics.fillStyle(0xf4efe6, 1);
    graphics.fillCircle(-8, -18, 5);
    graphics.fillRoundedRect(-8, 4, 16, 22, 2);
  }

  drawOxygen(graphics, config) {
    graphics.fillStyle(config.accent, 1);
    graphics.fillRect(-4, 8, 8, 28);
    graphics.fillStyle(config.color, 1);
    graphics.fillRoundedRect(-28, -36, 22, 62, 10);
    graphics.fillRoundedRect(6, -36, 22, 62, 10);
    graphics.fillStyle(0xf4efe6, 1);
    graphics.fillCircle(-17, -8, 4);
    graphics.fillCircle(17, -8, 4);
  }

  drawGreenhouse(graphics, config) {
    graphics.fillStyle(0xd5e2cf, 1);
    graphics.fillRect(-36, -4, 72, 36);
    graphics.fillStyle(config.color, 0.9);
    graphics.fillTriangle(-40, -4, 0, -40, 40, -4);
    graphics.fillStyle(config.accent, 1);
    graphics.fillCircle(0, 12, 8);
    graphics.fillRect(-2, 12, 4, 12);
  }

  drawSolar(graphics, config) {
    graphics.fillStyle(config.accent, 1);
    graphics.fillRect(-3, 0, 6, 36);
    graphics.fillStyle(config.color, 1);
    graphics.fillTriangle(-42, 4, -8, -24, -6, 16);
    graphics.fillTriangle(6, -6, 44, -28, 40, 10);
    graphics.lineStyle(2, 0x6d4d12, 0.8);
    graphics.lineBetween(-34, -2, -14, -16);
    graphics.lineBetween(16, -12, 34, -20);
  }

  setSelected(selected) {
    this.selection.setVisible(selected);
  }

  flash() {
    this.flashTween?.stop();
    this.container.setAlpha(1);
    if (prefersReducedMotion()) return;

    const tween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0.55,
      duration: 90,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.container.setAlpha(1);
        if (this.flashTween === tween) this.flashTween = null;
      },
    });
    this.flashTween = tween;
  }
}
