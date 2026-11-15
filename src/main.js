import "./styles/main.css";
import Phaser from "phaser";
import { createGameController } from "./core/gameController.js";
import { createAudioManager } from "./game/audio/audioManager.js";
import { createGameConfig } from "./game/config.js";
import { createSceneBridge } from "./game/sceneBridge.js";
import { mountInterface } from "./ui/uiController.js";

function bindAudioLifecycle(audio) {
  const listeners = new AbortController();
  const options = { capture: true, signal: listeners.signal };
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") audio.unlock(event);
  }, options);
  document.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse") audio.unlock(event);
  }, options);
  document.addEventListener("keydown", (event) => {
    if (!event.repeat && (event.key === "Enter" || event.key === " ")) audio.unlock(event);
  }, options);
  document.addEventListener("click", (event) => {
    if (event.detail === 0) audio.unlock(event);
  }, options);
  const syncVisibility = () => audio.setVisible(!document.hidden);
  const dispose = () => {
    listeners.abort();
    audio.destroy();
  };
  document.addEventListener("visibilitychange", syncVisibility, options);
  window.addEventListener("pageshow", syncVisibility, options);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) audio.setVisible(false);
    else dispose();
  }, options);
  syncVisibility();
  return dispose;
}

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
  const audio = createAudioManager();
  const interfaceReady = mountInterface({ controller, bridge, audio });

  if (interfaceReady.ok) {
    const disposeAudio = bindAudioLifecycle(audio);
    try {
      const game = new Phaser.Game(createGameConfig(container, bridge, audio));
      game.events.once(Phaser.Core.Events.DESTROY, disposeAudio);
      requestAnimationFrame(() => game.scale.refresh());
    } catch (error) {
      disposeAudio();
      console.error(error);
      const note = document.createElement("p");
      note.className = "boot-error";
      note.textContent = `The colony view could not start. ${error.message}`;
      app.prepend(note);
    }
  } else {
    audio.destroy();
  }
}
