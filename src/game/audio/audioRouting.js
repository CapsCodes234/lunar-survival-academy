import { SOLAR_RADIATION_EVENT } from "../../core/constants.js";

export function actionAudio(result, buildingId, actionId, changes) {
  if (!result.ok) return { cue: "reject" };
  if (result.state.missionStatus === "defeat") return { cue: "defeat" };
  if (actionId === "harvest") return { cue: "harvest" };
  return {
    cue: buildingId,
    spentOnly: changes.length > 0 && changes.every(({ favorable }) => !favorable),
    task: true,
  };
}

export function dayAudio(before, result) {
  if (!result.ok) return null;
  const { state } = result;
  const warning = state.currentEvent?.id === SOLAR_RADIATION_EVENT.id
    && state.currentEvent.id !== before.currentEvent?.id;
  if (warning) return state.missionStatus === "defeat" ? "radiationDefeat" : "radiation";
  if (state.missionStatus === "defeat" || state.missionStatus === "victory") return state.missionStatus;
  return state.day > before.day ? "day" : null;
}
