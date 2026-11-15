import { addWorldImage, worldAssets } from "../worldAssets.js";
import { prefersReducedMotion } from "../prefersReducedMotion.js";

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
    this.destination = null;
    this.onArrival = null;
    this.taskTween = null;
    this.taskTimer = null;

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
    this.body = art?.image ?? this.scene.add.graphics();
    if (!art) this.drawPlaceholder(this.body);
    this.taskLight = this.scene.add.ellipse(2, 0, 53, 15, 0xffffff, 0.24)
      .setStrokeStyle(2, 0xffffff, 0.9).setVisible(false);
    this.container.add([this.taskLight, this.body]);
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

  moveTo(x, y, onArrival = null) {
    this.clearTask();
    this.onArrival = onArrival;
    if (this.tween && this.destination.x === x && this.destination.y === y && !prefersReducedMotion()) return;

    const previous = this.tween;
    this.tween = null;
    previous?.stop();
    this.destination = { x, y };

    if (prefersReducedMotion() || (this.container.x === x && this.container.y === y)) {
      this.container.setPosition(x, y);
      this.arrive();
      return;
    }

    const tween = this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 650,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.tween !== tween) return;
        this.tween = null;
        this.arrive();
      },
    });
    this.tween = tween;
  }

  arrive() {
    const callback = this.onArrival;
    this.onArrival = null;
    callback?.();
  }

  workAt(x, y, color) {
    this.moveTo(x, y, () => {
      this.taskLight.setFillStyle(color, 0.22).setStrokeStyle(2, color, 0.9).setVisible(true);
      if (!prefersReducedMotion()) {
        this.taskTween = this.scene.tweens.add({
          targets: this.body,
          y: -4,
          duration: 145,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: 1,
          onComplete: () => { this.taskTween = null; },
        });
      }
      this.taskTimer = this.scene.time.delayedCall(640, () => this.clearTask());
    });
  }

  clearTask() {
    this.taskTween?.stop();
    this.taskTimer?.remove();
    this.taskTween = null;
    this.taskTimer = null;
    this.body.y = 0;
    this.taskLight.setVisible(false);
  }
}
