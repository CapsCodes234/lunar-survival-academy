import { scheduledEventsFor } from "./events.js";
import { cloneState, createGreenhouseState } from "./initialState.js";
import {
  ACTIONS_PER_DAY,
  DAILY_CONSUMPTION,
  GREENHOUSE,
  MISSION_STATUS,
  RADIATION_MAX,
  RADIATION_MIN,
  RESOURCE_MAX,
  TRACKED_RESOURCES,
} from "./constants.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function canAfford(resources, costs) {
  for (const [key, amount] of Object.entries(costs)) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Invalid cost for ${key}.`);
    }
    if ((resources[key] ?? 0) < amount) return false;
  }
  return true;
}

export function applyResourceDelta(resources, delta) {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(delta)) {
    if (!Number.isFinite(amount) || amount === 0) continue;
    if (key === "radiationRisk") {
      next.radiationRisk = clamp(next.radiationRisk + amount, RADIATION_MIN, RADIATION_MAX);
      continue;
    }
    if (!TRACKED_RESOURCES.includes(key)) {
      throw new Error(`Unknown resource "${key}".`);
    }
    next[key] = clamp(next[key] + amount, 0, RESOURCE_MAX);
  }
  return next;
}

/**
 * Defeat is checked after an action and again after the full end-of-day sequence.
 * The first matching reason is the one shown to the player.
 */
export function getDefeatReason(state) {
  const { power, oxygen, food, water, radiationRisk } = state.resources;
  if (power <= 0) return "The colony ran out of power.";
  if (oxygen <= 0) return "The colony ran out of oxygen.";
  if (food <= 0) return "The colony ran out of food.";
  if (water <= 0) return "The colony ran out of water.";
  if (radiationRisk >= RADIATION_MAX) {
    return "Radiation risk reached 100. The crew cannot continue.";
  }
  return null;
}

export function applySurvivalOutcome(state) {
  const reason = getDefeatReason(state);
  if (!reason) return { state, defeated: false, reason: null };
  const next = cloneState(state);
  next.missionStatus = MISSION_STATUS.defeat;
  next.defeatReason = reason;
  next.actionsRemaining = 0;
  return { state: next, defeated: true, reason };
}

export function applyDailyConsumption(state) {
  const next = cloneState(state);
  for (const key of TRACKED_RESOURCES) {
    next.resources[key] = clamp(next.resources[key] - DAILY_CONSUMPTION[key], 0, RESOURCE_MAX);
  }
  return next;
}

/**
 * A growing crop advances only when both upkeep costs can be paid in full.
 * If either cost is short, nothing is deducted and growth stays where it is.
 */
export function processGreenhouseDay(state) {
  const next = cloneState(state);
  if (next.greenhouse.crop !== "growing") {
    return { state: next, grew: false, paused: false, becameReady: false };
  }

  const costs = {
    power: GREENHOUSE.upkeepPower,
    water: GREENHOUSE.upkeepWater,
  };

  if (!canAfford(next.resources, costs)) {
    next.greenhouse.growthPaused = true;
    return { state: next, grew: false, paused: true, becameReady: false };
  }

  next.resources = applyResourceDelta(next.resources, {
    power: -costs.power,
    water: -costs.water,
  });
  next.greenhouse.growthPaused = false;
  next.greenhouse.growthProgress += 1;
  next.greenhouse.growthRequired = GREENHOUSE.growthTurnsRequired;
  const becameReady = next.greenhouse.growthProgress >= GREENHOUSE.growthTurnsRequired;
  if (becameReady) next.greenhouse.crop = "ready";
  return { state: next, grew: true, paused: false, becameReady };
}

export function applyScheduledEvent(state) {
  const next = cloneState(state);
  const applied = [];

  for (const event of scheduledEventsFor(next)) {
    if (Number.isFinite(event.radiationIncrease)) {
      next.resources = applyResourceDelta(next.resources, {
        radiationRisk: event.radiationIncrease,
      });
    }
    next.triggeredEventIds = [...next.triggeredEventIds, event.id];
    const record = {
      id: event.id,
      title: event.title,
      day: event.day,
      message: event.message,
    };
    next.currentEvent = record;
    applied.push(record);
  }

  return { state: next, appliedEvents: applied };
}

function dayMessage({ completedDay, growth, appliedEvents, outcome, reason, nextDay }) {
  const parts = [`Day ${completedDay} complete. Daily supplies were consumed.`];
  if (growth.paused) {
    parts.push("Greenhouse growth paused because power or water could not cover upkeep.");
  } else if (growth.becameReady) {
    parts.push("Lettuce is ready to harvest.");
  } else if (growth.grew) {
    parts.push("The crop grew.");
  }
  for (const event of appliedEvents) parts.push(event.message);
  if (outcome === "defeat") parts.push(reason);
  if (outcome === "victory") {
    parts.push("The colony stayed operational through Day 5. Mission success.");
  }
  if (outcome === "continued") {
    parts.push(`Day ${nextDay} begins with ${ACTIONS_PER_DAY} actions.`);
  }
  return parts.join(" ");
}

/**
 * Ends the current day. See END_OF_DAY_ORDER in constants.js for the sequence.
 * The caller's state object is not modified.
 */
export function resolveEndOfDay(state) {
  if (state.missionStatus !== MISSION_STATUS.active) {
    return {
      ok: false,
      reason: "The mission is over. Restart to play again.",
      state: cloneState(state),
    };
  }

  const completedDay = state.day;
  let next = applyDailyConsumption(state);
  const growth = processGreenhouseDay(next);
  next = growth.state;
  const eventResult = applyScheduledEvent(next);
  next = eventResult.state;
  const failure = getDefeatReason(next);

  if (failure) {
    next.missionStatus = MISSION_STATUS.defeat;
    next.defeatReason = failure;
    next.actionsRemaining = 0;
    return {
      ok: true,
      outcome: "defeat",
      message: dayMessage({
        completedDay,
        growth,
        appliedEvents: eventResult.appliedEvents,
        outcome: "defeat",
        reason: failure,
      }),
      state: next,
    };
  }

  if (next.day >= next.maxDays) {
    next.missionStatus = MISSION_STATUS.victory;
    next.defeatReason = null;
    next.actionsRemaining = 0;
    return {
      ok: true,
      outcome: "victory",
      message: dayMessage({
        completedDay,
        growth,
        appliedEvents: eventResult.appliedEvents,
        outcome: "victory",
      }),
      state: next,
    };
  }

  next.day += 1;
  next.actionsRemaining = ACTIONS_PER_DAY;
  next.defeatReason = null;
  return {
    ok: true,
    outcome: "continued",
    message: dayMessage({
      completedDay,
      growth,
      appliedEvents: eventResult.appliedEvents,
      outcome: "continued",
      nextDay: next.day,
    }),
    state: next,
  };
}
