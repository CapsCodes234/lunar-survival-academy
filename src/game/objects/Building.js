import Phaser from "phaser";
import { addWorldImage, worldAssets } from "../worldAssets.js";
import { prefersReducedMotion } from "../prefersReducedMotion.js";

const ACTIVITY_COLORS = {
  greenhouse: 0x8af9a0,
  oxygen: 0x78efff,
  solar: 0xffd472,
  habitat: 0x77afff,
};

export class Building {
  constructor(scene, config, onSelect) {
    this.id = config.id;
    this.approachX = config.approachX;
    this.approachY = config.approachY;
    this.scene = scene;
    this.activityTween = null;
    this.activityTimer = null;
    this.activityColor = ACTIVITY_COLORS[config.type];

    this.container = scene.add.container(config.x, config.y);
    // Buildings sort back to front by ground contact. The crew uses the open foreground lane.
    this.container.setDepth(10 + config.y / scene.scale.height);
    this.container.name = config.id;

    for (const [width, height, alpha] of [[0.9, 34, 0.1], [0.77, 25, 0.17], [0.63, 16, 0.24]]) {
      scene.add.ellipse(config.x + 7, config.y + 1, config.padWidth * width, height, 0x111b2d, alpha)
        .setDepth(3);
    }

    this.selection = scene.add.ellipse(0, 0, config.padWidth * 0.91, 36, 0x92eee4, 0.25);
    this.selection.setStrokeStyle(3, 0xacfff3, 0.96);
    this.selection.setVisible(false);
    this.container.add(this.selection);

    const isHabitat = config.type === "habitat";
    this.activity = scene.add.ellipse(0, isHabitat ? -10 : 0, config.padWidth, isHabitat ? 64 : 44,
      this.activityColor, 0.32).setStrokeStyle(3, this.activityColor).setVisible(false);
    this.container.add(this.activity);

    const art = addWorldImage(scene, worldAssets[this.id]);
    if (art) {
      this.container.add(art.image);
    } else {
      this.drawPlaceholder(config);
    }

    this.label = scene.add.text(0, 24, config.shortName, {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#f2f7ff",
      backgroundColor: "#202b3c",
      padding: { x: 9, y: 3 },
    }).setOrigin(0.5);
    this.container.add(this.label);

    const left = art ? Math.min(art.left, -58) - 5 : -64;
    const right = art ? Math.max(art.right, 58) + 5 : 64;
    const top = art ? -art.height - 5 : -82;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(left, top, right - left, 42 - top),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.input.cursor = "pointer";
    this.container.on("pointerdown", () => onSelect(this.id));
  }

  drawPlaceholder(config) {
    const graphics = this.scene.add.graphics({ y: -36 });

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

  clearActivity() {
    this.activityTween?.stop();
    this.activityTimer?.remove();
    this.activityTween = null;
    this.activityTimer = null;
    this.activity.setVisible(false);
  }

  flash() {
    this.clearActivity();
    this.activity.setVisible(true).setAlpha(0.88).setScale(1);
    if (prefersReducedMotion()) {
      this.activityTimer = this.scene.time.delayedCall(650, () => this.clearActivity());
      return;
    }
    this.activityTween = this.scene.tweens.add({
      targets: this.activity,
      alpha: 0,
      scale: 1.16,
      duration: 900,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.activityTween = null;
        this.activity.setVisible(false);
      },
    });
  }
}
