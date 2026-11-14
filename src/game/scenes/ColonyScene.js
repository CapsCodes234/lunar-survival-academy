import Phaser from "phaser";
import { buildings } from "../../data/buildings.js";
import { Astronaut } from "../objects/Astronaut.js";
import { Building } from "../objects/Building.js";

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
  }

  create() {
    const registered = this.registry.get("bridge");
    if (!registered) {
      console.error("ColonyScene could not find the UI bridge. The map will still render.");
    }
    this.bridge = registered ?? { onBuildingSelected() {} };

    this.drawSky();
    this.drawGround();
    this.add.text(640, 42, "Click a building to choose it", {
      fontFamily: "Trebuchet MS, Verdana, sans-serif",
      fontSize: "18px",
      color: "#f4efe6",
    }).setOrigin(0.5).setDepth(2);

    for (const config of buildings) {
      const building = new Building(this, config, (buildingId) => {
        this.selectBuilding(buildingId);
      });
      this.buildings.push(building);
      this.buildingById.set(building.id, building);
    }

    this.crew = STARTING_CREW.map((member) => new Astronaut(this, member));
    this.activeAstronaut = this.crew[0] ?? null;

    this.input.topOnly = true;
    this.input.on("pointerdown", (_pointer, currentlyOver) => {
      if (currentlyOver.length === 0) this.clearSelection();
    });

    this.bridge.clearSelection = () => this.clearSelection();
    this.bridge.moveAstronautTo = (buildingId) => this.moveAstronautTo(buildingId);
    this.bridge.playActionFeedback = (buildingId) => {
      this.buildingById.get(buildingId)?.flash();
    };
    this.bridge.resetVisuals = () => this.resetVisuals();
    this.bridge.selectBuilding = (buildingId) => this.selectBuilding(buildingId);

    if (this.bridge.pendingSelection) {
      const pending = this.bridge.pendingSelection;
      this.bridge.pendingSelection = null;
      this.selectBuilding(pending);
    }
  }

  drawSky() {
    const sky = this.add.graphics();
    sky.setDepth(0);
    let seed = 42;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 48; index += 1) {
      const x = 40 + next() * 1200;
      const y = 16 + next() * 150;
      sky.fillStyle(0xf4efe6, 0.35 + next() * 0.5);
      sky.fillCircle(x, y, next() > 0.8 ? 2 : 1);
    }
  }

  drawGround() {
    const ground = this.add.graphics();
    ground.setDepth(1);
    const centerX = 640;
    const centerY = 400;

    ground.fillStyle(0xc4b39a, 0.12);
    ground.fillEllipse(centerX, centerY, 980, 460);

    const drawPad = (color) => {
      ground.fillStyle(color, 1);
      ground.beginPath();
      ground.moveTo(centerX, 180);
      ground.lineTo(1060, centerY);
      ground.lineTo(centerX, 620);
      ground.lineTo(220, centerY);
      ground.closePath();
      ground.fillPath();
    };

    drawPad(0x8d8478);
    ground.fillStyle(0x7a7268, 0.55);
    ground.fillEllipse(560, 430, 90, 32);
    ground.fillEllipse(760, 360, 54, 20);
    ground.fillEllipse(690, 500, 70, 24);

    ground.lineStyle(4, 0x6a6158, 1);
    ground.beginPath();
    ground.moveTo(centerX, 180);
    ground.lineTo(1060, centerY);
    ground.lineTo(centerX, 620);
    ground.lineTo(220, centerY);
    ground.closePath();
    ground.strokePath();
  }

  selectBuilding(buildingId) {
    const building = this.buildingById.get(buildingId);
    if (!building || this.selectedId === buildingId) return;

    this.selectedId = buildingId;
    for (const entry of this.buildings) entry.setSelected(entry.id === buildingId);
    this.moveAstronautTo(buildingId);
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

  resetVisuals() {
    this.selectedId = null;
    for (const building of this.buildings) building.setSelected(false);
    if (!this.activeAstronaut) return;
    this.activeAstronaut.moveTo(this.activeAstronaut.homeX, this.activeAstronaut.homeY);
  }
}
