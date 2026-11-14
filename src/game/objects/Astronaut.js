import Phaser from "phaser";

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
    this.container.setDepth(8);
    this.draw();
  }

  draw() {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x000000, 0.28);
    graphics.fillEllipse(0, -2, 34, 12);

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

    const label = this.scene.add.text(0, 8, "Crew", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "14px",
      color: "#f4efe6",
    }).setOrigin(0.5);
    label.setStroke("#1a140c", 3);

    this.container.add([graphics, label]);
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
