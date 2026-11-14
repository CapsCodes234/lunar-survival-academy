import "./styles/main.css";
import Phaser from "phaser";
import { createGameController } from "./core/gameController.js";
import { createGameConfig } from "./game/config.js";
import { createSceneBridge } from "./game/sceneBridge.js";
import { mountInterface } from "./ui/uiController.js";

const app = document.querySelector("#app");
const container = document.querySelector("#game-container");

if (!app || !container) {
  const message = "The page is missing the game layout, so the colony cannot start.";
  console.error(message);
  const note = document.createElement("p");
  note.className = "boot-error";
  note.textContent = message;
  document.body.prepend(note);
} else {
  const controller = createGameController();
  const bridge = createSceneBridge();
  const interfaceReady = mountInterface({ controller, bridge });

  if (interfaceReady.ok) {
    try {
      const game = new Phaser.Game(createGameConfig(container, bridge));
      requestAnimationFrame(() => game.scale.refresh());
    } catch (error) {
      console.error(error);
      const note = document.createElement("p");
      note.className = "boot-error";
      note.textContent = `The colony view could not start. ${error.message}`;
      app.prepend(note);
    }
  }
}
