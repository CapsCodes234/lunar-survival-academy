import {
  GREENHOUSE,
  MISSION_STATUS,
  OXYGEN_GAIN,
  OXYGEN_POWER_COST,
  SHELTER_POWER_COST,
  SHELTER_RADIATION_RELIEF,
  SOLAR_MAINTAIN_POWER,
} from "./constants.js";
import { cloneState, createGreenhouseState } from "./initialState.js";
import { applyResourceDelta, applySurvivalOutcome, canAfford } from "./gameRules.js";
import { shortageGuidance } from "../data/educationalContent.js";

const RESOURCE_LABELS = {
  power: "power",
  oxygen: "oxygen",
  food: "food",
  water: "water",
  radiationRisk: "radiation risk",
};

/**
 * One action definition per player choice.
 * costs are spent only when the action is valid.
 * effects are applied after costs. Harvest food is calculated separately
 * because the amount depends on whether the crop was cared for.
 */
export const BUILDING_ACTIONS = [
  {
    id: "maintain",
    buildingId: "solar",
    name: "Maintain Solar Array",
    description:
      "Service the arrays and restore stored power. This represents maintenance, not a live model of electricity generation.",
    costs: {},
    effects: { power: SOLAR_MAINTAIN_POWER },
    actionsConsumed: 1,
    successMessage: "Maintained the solar array and restored power.",
  },
  {
    id: "operate",
    buildingId: "oxygen",
    name: "Operate Oxygen System",
    description: "Run the oxygen system harder. The colony gains oxygen and spends power.",
    costs: { power: OXYGEN_POWER_COST },
    effects: { oxygen: OXYGEN_GAIN },
    actionsConsumed: 1,
    successMessage: "Operated the oxygen system. Oxygen increased and power decreased.",
  },
  {
    id: "shelter",
    buildingId: "habitat",
    name: "Prepare Radiation Shelter",
    description: "Move the crew into shelter and spend power to lower radiation risk.",
    costs: { power: SHELTER_POWER_COST },
    effects: { radiationRisk: -SHELTER_RADIATION_RELIEF },
    actionsConsumed: 1,
    successMessage: "Prepared the radiation shelter. Radiation risk decreased and power decreased.",
  },
  {
    id: "plant",
    buildingId: "greenhouse",
    name: "Plant Lettuce",
    description: "Start a lettuce crop. The greenhouse must be empty.",
    costs: { power: GREENHOUSE.plantPower, water: GREENHOUSE.plantWater },
    effects: {},
    actionsConsumed: 1,
    successMessage: "Planted lettuce. The crop is now growing.",
  },
  {
    id: "care",
    buildingId: "greenhouse",
    name: "Care for Crops",
    description: "Tend the current planting once. Care improves the harvest and cannot be repeated for extra rewards.",
    costs: { power: GREENHOUSE.carePower, water: GREENHOUSE.careWater },
    effects: {},
    actionsConsumed: 1,
    successMessage: "Cared for the crop. This planting can yield more food at harvest.",
  },
  {
    id: "harvest",
    buildingId: "greenhouse",
    name: "Harvest Lettuce",
    description: `Collect a ready crop for ${GREENHOUSE.harvestFood} food, or ${GREENHOUSE.caredHarvestFood} food if the crop was cared for. The greenhouse is emptied.`,
    costs: {},
    effects: {},
    actionsConsumed: 1,
    successMessage: "Harvested lettuce.",
  },
];

export function getAction(actionId) {
  return BUILDING_ACTIONS.find((action) => action.id === actionId) ?? null;
}

export function listActionsForBuilding(buildingId) {
  return BUILDING_ACTIONS.filter((action) => action.buildingId === buildingId);
}

export function describeActionCost(action) {
  const parts = [];
  for (const [key, amount] of Object.entries(action.costs)) {
    parts.push(`−${amount} ${RESOURCE_LABELS[key]}`);
  }
  for (const [key, amount] of Object.entries(action.effects)) {
    const sign = amount > 0 ? "+" : "−";
    parts.push(`${sign}${Math.abs(amount)} ${RESOURCE_LABELS[key]}`);
  }
  if (action.id === "harvest") {
    parts.push(
      `+${GREENHOUSE.harvestFood} food, or +${GREENHOUSE.caredHarvestFood} food if crop care was completed`,
    );
  }
  const actionWord = action.actionsConsumed === 1 ? "action" : "actions";
  parts.push(`${action.actionsConsumed} ${actionWord}`);
  return parts.join(", ");
}

function rejection(state, reason) {
  return { ok: false, reason, state: cloneState(state) };
}

function preconditionFailure(state, action) {
  if (action.id === "plant" && state.greenhouse.crop !== "empty") {
    return "The greenhouse already has a crop.";
  }
  if (action.id === "care" && state.greenhouse.crop !== "growing") {
    return "There is no growing crop to care for.";
  }
  if (action.id === "care" && state.greenhouse.cared) {
    return "Crop care is already complete for this planting.";
  }
  if (action.id === "harvest" && state.greenhouse.crop !== "ready") {
    return "The crop is not ready to harvest.";
  }
  return null;
}

function missingResourceMessage(state, action) {
  const missing = [];
  const guidance = [];
  for (const [key, amount] of Object.entries(action.costs)) {
    if (state.resources[key] < amount) {
      missing.push(`${amount} ${RESOURCE_LABELS[key]} (you have ${state.resources[key]})`);
      const { impact, action: nextStep } = shortageGuidance[key];
      guidance.push(`${impact} ${nextStep}`);
    }
  }
  return `Not enough resources. This action needs ${missing.join(" and ")}. ${guidance.join(" ")}`;
}

function applySideEffects(next, action) {
  if (action.id === "plant") {
    next.greenhouse = { ...createGreenhouseState(), crop: "growing" };
  }
  if (action.id === "care") {
    next.greenhouse = { ...next.greenhouse, cared: true };
  }
  if (action.id === "harvest") {
    const food = next.greenhouse.cared ? GREENHOUSE.caredHarvestFood : GREENHOUSE.harvestFood;
    next.resources = applyResourceDelta(next.resources, { food });
    next.greenhouse = createGreenhouseState();
  }
}

function successText(action, before, after) {
  if (action.id !== "harvest") return action.successMessage;
  const gained = after.resources.food - before.resources.food;
  return `Harvested lettuce and gained ${gained} food. The greenhouse is empty.`;
}

/**
 * Validates and applies one building action.
 * Returns a new state. The state argument is not modified.
 */
export function assessBuildingAction(state, command) {
  if (state.missionStatus !== MISSION_STATUS.active) {
    return rejection(state, "The mission is over. Restart to play again.");
  }

  const buildingId = command?.buildingId;
  const action = getAction(command?.actionId);
  if (!action || action.buildingId !== buildingId) {
    return rejection(state, "That action is not available at this building.");
  }
  if (state.actionsRemaining < action.actionsConsumed) {
    return rejection(state, "No actions remaining today. End the day to continue.");
  }

  const building = state.buildings[buildingId];
  if (!building) return rejection(state, "Unknown building.");
  if (!building.operational) return rejection(state, "This building is offline.");

  const precondition = preconditionFailure(state, action);
  if (precondition) return rejection(state, precondition);
  if (!canAfford(state.resources, action.costs)) {
    return rejection(state, missingResourceMessage(state, action));
  }

  const next = cloneState(state);
  const costDelta = {};
  for (const [key, amount] of Object.entries(action.costs)) costDelta[key] = -amount;
  next.resources = applyResourceDelta(next.resources, costDelta);
  next.resources = applyResourceDelta(next.resources, action.effects);
  applySideEffects(next, action);
  next.actionsRemaining -= action.actionsConsumed;

  const survival = applySurvivalOutcome(next);
  const message = survival.defeated
    ? `${successText(action, state, survival.state)} ${survival.reason}`
    : successText(action, state, survival.state);

  return { ok: true, message, state: survival.state };
}
