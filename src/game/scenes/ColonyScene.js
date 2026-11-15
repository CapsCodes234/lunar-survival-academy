import Phaser from "phaser";
import { buildings } from "../../data/buildings.js";
import { worldAssets } from "../worldAssets.js";
import { prefersReducedMotion } from "../prefersReducedMotion.js";
import { Astronaut } from "../objects/Astronaut.js";
import { Building } from "../objects/Building.js";
import { drawLunarTerrain } from "./lunarTerrain.js";

/**
 * Add another entry here to place another astronaut. This phase moves the first one.
 * Walking is feedback. Resource changes happen only through the game controller.
 */
const STARTING_CREW = [
  { id: "astronaut-1", x: 640, y: 560 },
];

export class ColonyScene extends Phaser.Scene {
  constructor() {
    super("ColonyScene");
    this.selectedId = null;
    this.buildings = [];
    this.buildingById = new Map();
    this.crew = [];
    this.activeAstronaut = null;
    this.bridge = null;
    this.resourceFeedback = null;
    this.resourceTween = null;
    this.resourceTimer = null;
    this.warningTween = null;
  }

  preload() {
    for (const { key, path } of Object.values(worldAssets)) {
      this.load.image(key, `${import.meta.env.BASE_URL}${path}`);
    }
  }

  create() {
    const registered = this.registry.get("bridge");
    if (!registered) {
      console.error("ColonyScene could not find the UI bridge. The map will still render.");
    }
    this.bridge = registered ?? { onBuildingSelected() {} };

    drawLunarTerrain(this, buildings, STARTING_CREW[0]);
    for (const config of buildings) {
      const building = new Building(this, config, (buildingId) => {
        this.selectBuilding(buildingId);
      });
      this.buildings.push(building);
      this.buildingById.set(building.id, building);
    }

    this.crew = STARTING_CREW.map((member) => new Astronaut(this, member));
    this.activeAstronaut = this.crew[0] ?? null;
    this.stormLight = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff732c)
      .setOrigin(0).setDepth(24).setVisible(false);

    const watermark = this.add.text(640, 692, "Sprite art: AI-generated with ChatGPT", {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      color: "#c1cddc",
    }).setOrigin(0.5).setDepth(30);
    const resizeLabels = () => {
      const logicalPixelsPerCssPixel = this.scale.width / this.scale.displaySize.width;
      watermark.setFontSize(Math.round(Phaser.Math.Clamp(12 * logicalPixelsPerCssPixel, 24, 44)));
      const labelSize = Math.round(Phaser.Math.Clamp(9 * logicalPixelsPerCssPixel, 20, 32));
      for (const building of this.buildings) building.label.setFontSize(labelSize);
    };
    resizeLabels();
    this.scale.on(Phaser.Scale.Events.RESIZE, resizeLabels);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resizeLabels);
    });

    this.input.topOnly = true;
    this.input.on("pointerdown", (_pointer, currentlyOver) => {
      if (currentlyOver.length === 0) this.clearSelection();
    });

    this.bridge.clearSelection = () => this.clearSelection();
    this.bridge.moveAstronautTo = (buildingId) => this.moveAstronautTo(buildingId);
    this.bridge.playActionFeedback = (buildingId, changes) => this.playActionFeedback(buildingId, changes);
    this.bridge.playRadiationWarning = () => this.playRadiationWarning();
    this.bridge.resetVisuals = () => this.resetVisuals();
    this.bridge.selectBuilding = (buildingId) => this.selectBuilding(buildingId);

    if (this.bridge.pendingSelection) {
      const pending = this.bridge.pendingSelection;
      this.bridge.pendingSelection = null;
      this.selectBuilding(pending);
    }
  }

  selectBuilding(buildingId) {
    const building = this.buildingById.get(buildingId);
    if (!building) return;

    if (this.selectedId !== buildingId) {
      this.selectedId = buildingId;
      for (const entry of this.buildings) entry.setSelected(entry.id === buildingId);
      this.moveAstronautTo(buildingId);
    }
    this.bridge.onBuildingSelected(buildingId);
  }

  clearSelection() {
    if (this.selectedId === null) return;
    this.selectedId = null;
    for (const building of this.buildings) building.setSelected(false);
    this.bridge.onBuildingSelected(null);
  }

  moveAstronautTo(buildingId) {
    const building = this.buildingById.get(buildingId);
    if (!building || !this.activeAstronaut) return;
    this.activeAstronaut.moveTo(building.approachX, building.approachY);
  }

  playActionFeedback(buildingId, changes = []) {
    const building = this.buildingById.get(buildingId);
    if (!building) return;
    for (const other of this.buildings) {
      if (other !== building) other.clearActivity();
    }
    building.flash();
    this.activeAstronaut?.workAt(building.approachX, building.approachY, building.activityColor);
    this.clearResourceFeedback();
    if (!changes.length) return;

    const { x, y } = building.container;
    const offset = x < this.scale.width / 2 ? 94 : -94;
    const fontSize = Phaser.Math.Clamp(Math.round(11 * this.scale.width / this.scale.displaySize.width), 23, 36);
    const group = this.add.container(x + offset, y - 84).setDepth(26);
    changes.forEach(({ text, favorable }, index) => {
      const label = this.add.text(0, index * (fontSize + 11), text, {
        fontFamily: "Segoe UI, sans-serif",
        fontSize: `${fontSize}px`,
        fontStyle: "bold",
        color: favorable ? "#aef4c3" : "#ffd28f",
        backgroundColor: "#152237",
        padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      group.add(label);
    });
    this.resourceFeedback = group;
    if (prefersReducedMotion()) {
      this.resourceTimer = this.time.delayedCall(1150, () => this.clearResourceFeedback());
      return;
    }
    this.resourceTween = this.tweens.add({
      targets: group,
      y: group.y - 23,
      alpha: 0,
      delay: 380,
      duration: 760,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.resourceTween = null;
        this.clearResourceFeedback();
      },
    });
  }

  clearResourceFeedback() {
    this.resourceTween?.stop();
    this.resourceTimer?.remove();
    this.resourceFeedback?.destroy();
    this.resourceTween = null;
    this.resourceTimer = null;
    this.resourceFeedback = null;
  }

  playRadiationWarning() {
    this.buildingById.get("habitat")?.flash();
    if (prefersReducedMotion()) return;
    this.warningTween?.stop();
    this.stormLight.setVisible(true).setAlpha(0.17);
    this.warningTween = this.tweens.add({
      targets: this.stormLight,
      alpha: 0,
      duration: 1250,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.warningTween = null;
        this.stormLight.setVisible(false);
      },
    });
  }

  resetVisuals() {
    this.selectedId = null;
    for (const building of this.buildings) {
      building.setSelected(false);
      building.clearActivity();
    }
    this.clearResourceFeedback();
    this.warningTween?.stop();
    this.warningTween = null;
    this.stormLight.setVisible(false);
    if (!this.activeAstronaut) return;
    this.activeAstronaut.moveTo(this.activeAstronaut.homeX, this.activeAstronaut.homeY);
  }
}
