import { SOLAR_RADIATION_EVENT } from "./constants.js";
import { shortageGuidance } from "../data/educationalContent.js";

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
    message: `${SOLAR_RADIATION_EVENT.title}: a simulated solar storm adds ${increase} fictional risk points. ${shortageGuidance.radiationRisk.impact} Preparing the Habitat shelter before the storm lowers the crew’s risk in this scenario. Risk points have no radiation-dose units.`,
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
