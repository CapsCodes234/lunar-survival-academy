import { assessBuildingAction, describeActionCost, listActionsForBuilding } from "../core/buildingActions.js";
import { COMMANDS } from "../core/gameController.js";
import { educationalContent } from "../data/educationalContent.js";
import { buildings, getBuildingById } from "../data/buildings.js";
import { renderBuildingPanel } from "./buildingPanel.js";

const REQUIRED_IDS = [
  "meter-power",
  "meter-oxygen",
  "meter-food",
  "meter-water",
  "meter-radiation",
  "mission-day",
  "actions-remaining",
  "building-panel",
  "building-picker",
  "event-banner",
  "mission-status",
  "feedback",
  "end-day",
  "restart-mission",
];

function showSetupError(message) {
  console.error(message);
  const host = document.querySelector("#app") ?? document.body;
  const note = document.createElement("p");
  note.className = "boot-error";
  note.textContent = message;
  host.prepend(note);
}

/**
 * Connects the HTML interface to the game controller and the Phaser bridge.
 * Resource numbers are always read from controller state. They are not stored here.
 */
export function mountInterface({ controller, bridge }) {
  const missing = REQUIRED_IDS.filter((id) => !document.getElementById(id));
  if (missing.length > 0) {
    showSetupError(`The page is missing these interface elements: ${missing.join(", ")}.`);
    return { ok: false };
  }

  const element = Object.fromEntries(REQUIRED_IDS.map((id) => [id, document.getElementById(id)]));
  let selectedId = null;

  const pickerButtons = buildings.map((building) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-button";
    button.dataset.selectBuilding = building.id;
    button.textContent = building.name;
    button.addEventListener("click", () => bridge.selectBuilding(building.id));
    element["building-picker"].append(button);
    return button;
  });

  function syncPicker() {
    for (const button of pickerButtons) {
      button.setAttribute("aria-pressed", button.dataset.selectBuilding === selectedId ? "true" : "false");
    }
  }

  function showFeedback(result) {
    element.feedback.textContent = result.ok ? result.message : result.reason;
    element.feedback.className = result.ok ? "feedback feedback--ok" : "feedback feedback--error";
  }

  function renderPanel(state) {
    const building = getBuildingById(selectedId);
    if (!building) {
      closePanel({ notifyScene: false });
      return;
    }

    const actions = listActionsForBuilding(building.id).map((action) => {
      const preview = assessBuildingAction(state, {
        type: COMMANDS.BUILDING_ACTION,
        buildingId: building.id,
        actionId: action.id,
      });
      return {
        action,
        costLabel: describeActionCost(action),
        available: preview.ok,
        reason: preview.ok ? "" : preview.reason,
      };
    });

    renderBuildingPanel(element["building-panel"], {
      building,
      topic: educationalContent[building.id],
      state,
      actions,
      onAction(actionId) {
        const result = controller.dispatch({
          type: COMMANDS.BUILDING_ACTION,
          buildingId: building.id,
          actionId,
        });
        showFeedback(result);
        if (result.ok) bridge.playActionFeedback(building.id);
      },
      onClose() {
        closePanel({ notifyScene: true });
      },
    });
    element["building-panel"].hidden = false;
  }

  function openPanel(buildingId) {
    selectedId = buildingId;
    syncPicker();
    renderPanel(controller.getState());
    element["building-panel"].querySelector(".panel-close")?.focus();
  }

  function closePanel({ notifyScene }) {
    selectedId = null;
    syncPicker();
    element["building-panel"].hidden = true;
    element["building-panel"].replaceChildren();
    if (notifyScene) bridge.clearSelection();
  }

  function renderHud(state) {
    element["meter-power"].textContent = formatMeter(state.resources.power);
    element["meter-oxygen"].textContent = formatMeter(state.resources.oxygen);
    element["meter-food"].textContent = formatMeter(state.resources.food);
    element["meter-water"].textContent = formatMeter(state.resources.water);
    element["meter-radiation"].textContent = formatMeter(state.resources.radiationRisk);
    element["mission-day"].textContent = formatMeter(state.day);
    element["actions-remaining"].textContent = formatMeter(state.actionsRemaining);
    element["end-day"].disabled = state.missionStatus !== "active";

    const status = element["mission-status"];
    status.className = `mission-status mission-status--${state.missionStatus}`;
    if (state.missionStatus === "victory") {
      status.textContent = "Mission success. The colony completed 5 days.";
    } else if (state.missionStatus === "defeat") {
      status.textContent = state.defeatReason || "The mission has failed.";
    } else {
      status.textContent = `Mission underway. Day ${state.day} of ${state.maxDays}.`;
    }

    if (state.currentEvent) {
      element["event-banner"].hidden = false;
      element["event-banner"].textContent = state.currentEvent.message;
    } else {
      element["event-banner"].hidden = true;
      element["event-banner"].textContent = "";
    }

    if (selectedId) renderPanel(state);
  }

  bridge.onBuildingSelected = (buildingId) => {
    if (!buildingId) {
      closePanel({ notifyScene: false });
      return;
    }
    openPanel(buildingId);
  };

  element["end-day"].addEventListener("click", () => {
    showFeedback(controller.dispatch({ type: COMMANDS.END_DAY }));
  });

  element["restart-mission"].addEventListener("click", () => {
    showFeedback(controller.reset());
    closePanel({ notifyScene: true });
    bridge.resetVisuals();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedId) closePanel({ notifyScene: true });
  });

  controller.subscribe(renderHud);
  renderHud(controller.getState());
  syncPicker();
  return { ok: true };
}

function formatMeter(value) {
  return Number.isFinite(value) ? String(value) : "—";
}
