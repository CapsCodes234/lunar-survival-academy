import { assessBuildingAction } from "./buildingActions.js";
import { resolveEndOfDay } from "./gameRules.js";
import { createInitialState } from "./initialState.js";

export const COMMANDS = {
  BUILDING_ACTION: "BUILDING_ACTION",
  END_DAY: "END_DAY",
  RESET: "RESET",
};

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function expose(state) {
  return deepFreeze(structuredClone(state));
}

/**
 * The only place mission state is stored.
 *
 * UI and Phaser should call:
 *   getState() -> frozen snapshot of the current mission
 *   subscribe(listener) -> listener(snapshot) after every successful change
 *   dispatch(command) -> { ok, message|reason, state }
 *   reset() -> same as dispatch({ type: "RESET" })
 *
 * Commands:
 *   { type: "BUILDING_ACTION", buildingId: "greenhouse", actionId: "plant" }
 *   { type: "END_DAY" }
 *   { type: "RESET" }
 *
 * Selecting a building is not a command. Selection does not change resources.
 * Listeners receive a frozen copy. Changing that copy does not change the game.
 */
export function createGameController() {
  let state = createInitialState();
  const listeners = [];

  function getState() {
    return expose(state);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("subscribe(listener) expects a function.");
    }
    listeners.push(listener);
    return function unsubscribe() {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  function publish() {
    const snapshot = getState();
    for (const listener of [...listeners]) listener(snapshot);
    return snapshot;
  }

  function failure(reason) {
    return { ok: false, reason, state: getState() };
  }

  function dispatch(command) {
    if (!command || typeof command !== "object") {
      return failure("That command could not be read.");
    }

    if (command.type === COMMANDS.RESET) {
      state = createInitialState();
      return { ok: true, message: "Mission restarted.", state: publish() };
    }

    let result;
    if (command.type === COMMANDS.END_DAY) {
      result = resolveEndOfDay(state);
    } else if (command.type === COMMANDS.BUILDING_ACTION) {
      result = assessBuildingAction(state, command);
    } else {
      return failure("Unknown command.");
    }

    if (!result.ok) return failure(result.reason);

    state = result.state;
    return { ok: true, message: result.message, state: publish() };
  }

  function reset() {
    return dispatch({ type: COMMANDS.RESET });
  }

  return { getState, subscribe, dispatch, reset };
}
