import { addWorldImage, worldAssets } from "../worldAssets.js";

function prefersReducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One astronaut figure. Create several instances later for a larger crew.
 * Movement is visual only. It does not change resources or the mission day.
 */
export class Astronaut {
  constructor(scene, { id, x, y }) {
    this.id = id;
    this.homeX = x;
    this.homeY = y;
    this.scene = scene;
    this.tween = null;

    this.container = scene.add.container(x, y);
    this.container.setDepth(20);
    this.draw();
  }

  draw() {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x172237, 0.19);
    graphics.fillEllipse(5, 1, 43, 12);
    graphics.fillStyle(0x172237, 0.29);
    graphics.fillEllipse(3, 1, 30, 7);
    this.container.add(graphics);

    const art = addWorldImage(this.scene, worldAssets.astronaut);
    if (art) {
      this.container.add(art.image);
    } else {
      this.drawPlaceholder(graphics);
    }
  }

  drawPlaceholder(graphics) {
    graphics.fillStyle(0xc8c3b8, 1);
    graphics.fillRoundedRect(-18, -34, 10, 16, 2);

    graphics.fillStyle(0xf4f1ea, 1);
    graphics.fillRoundedRect(-10, -38, 20, 24, 6);

    graphics.fillStyle(0xd5d0c6, 1);
    graphics.fillRoundedRect(-8, -16, 6, 14, 2);
    graphics.fillRoundedRect(2, -16, 6, 14, 2);

    graphics.fillStyle(0xf7f4ee, 1);
    graphics.fillCircle(2, -46, 10);
    graphics.fillStyle(0x243044, 1);
    graphics.fillRoundedRect(-4, -50, 12, 8, 3);
  }

  moveTo(x, y) {
    const previous = this.tween;
    this.tween = null;
    previous?.stop();

    if (prefersReducedMotion()) {
      this.container.setPosition(x, y);
      return;
    }

    const tween = this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 650,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.tween === tween) this.tween = null;
      },
    });
    this.tween = tween;
  }
}
