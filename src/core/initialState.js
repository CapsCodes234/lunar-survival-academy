import { buildings } from "../data/buildings.js";
import {
  ACTIONS_PER_DAY,
  GREENHOUSE,
  INITIAL_RESOURCES,
  MAX_DAYS,
  MISSION_STATUS,
  STARTING_DAY,
} from "./constants.js";

export function cloneState(state) {
  return structuredClone(state);
}

export function createGreenhouseState() {
  return {
    crop: "empty",
    growthProgress: 0,
    growthRequired: GREENHOUSE.growthTurnsRequired,
    cared: false,
    growthPaused: false,
  };
}

export function createBuildingStates() {
  return Object.fromEntries(
    buildings.map((building) => [building.id, { operational: true }]),
  );
}

export function createInitialState() {
  return {
    day: STARTING_DAY,
    maxDays: MAX_DAYS,
    actionsRemaining: ACTIONS_PER_DAY,
    resources: { ...INITIAL_RESOURCES },
    greenhouse: createGreenhouseState(),
    buildings: createBuildingStates(),
    currentEvent: null,
    triggeredEventIds: [],
    missionStatus: MISSION_STATUS.active,
    defeatReason: null,
  };
}
