import { SOLAR_RADIATION_EVENT } from "./constants.js";

/**
 * Add future mission events by appending a builder to SCHEDULED_EVENTS.
 * A builder returns an event object for the current day, or null.
 * applyScheduledEvent() in gameRules.js applies every due event that has not
 * already been recorded in state.triggeredEventIds. The game controller does
 * not need to change when a new day-based event is added here.
 */
function solarRadiationWarning(state) {
  if (state.day !== SOLAR_RADIATION_EVENT.day) return null;

  const increase = SOLAR_RADIATION_EVENT.radiationIncrease;
  return {
    id: SOLAR_RADIATION_EVENT.id,
    title: SOLAR_RADIATION_EVENT.title,
    day: SOLAR_RADIATION_EVENT.day,
    radiationIncrease: increase,
    message: `${SOLAR_RADIATION_EVENT.title}: radiation risk rises by ${increase}. Shelter preparation earlier in the mission lowers the risk the crew is already carrying. This increase is a fictional game value, not a measured solar dose.`,
  };
}

const SCHEDULED_EVENTS = [solarRadiationWarning];

export function scheduledEventsFor(state) {
  const due = [];
  for (const buildEvent of SCHEDULED_EVENTS) {
    const event = buildEvent(state);
    if (!event || state.triggeredEventIds.includes(event.id)) continue;
    due.push(event);
  }
  return due;
}
