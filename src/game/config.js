import Phaser from "phaser";
import { ColonyScene } from "./scenes/ColonyScene.js";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function createGameConfig(parent, bridge, audio) {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#12161c",
    banner: false,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [ColonyScene],
    callbacks: {
      preBoot(game) {
        game.registry.set("bridge", bridge);
        game.registry.set("missionAudio", audio);
      },
    },
  };
}
