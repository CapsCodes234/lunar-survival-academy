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
  "buildings-menu",
  "notification",
  "open-mission-control",
  "open-mission-log",
  "mission-control",
  "dialog-title",
  "close-mission-control",
  "resume-game",
  "mission-control-back",
  "cancel-restart",
  "confirm-restart",
  "mission-log-empty",
  "mission-log-entries",
];

const DIALOG_TITLES = {
  menu: "Mission Control",
  help: "How to Play",
  science: "NASA Science / References",
  restart: "Restart Mission?",
  log: "Mission Log",
};

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
  const panel = element["building-panel"];
  const buildingsMenu = element["buildings-menu"];
  const buildingsToggle = buildingsMenu.querySelector("summary");
  const dialog = element["mission-control"];
  const log = element["mission-log-entries"];
  const notificationTitle = element.notification.querySelector(".notification__title");
  const notificationMessage = element.notification.querySelector(".notification__message");
  let selectedId = null;
  let dialogTrigger;
  let viewTrigger;
  let notificationTimer;

  const pickerButtons = buildings.map((building) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-button";
    button.dataset.selectBuilding = building.id;
    button.textContent = building.name;
    button.addEventListener("click", () => {
      buildingsMenu.open = false;
      buildingsToggle.focus({ preventScroll: true });
      bridge.selectBuilding(building.id);
    });
    element["building-picker"].append(button);
    return button;
  });

  function syncPicker() {
    for (const button of pickerButtons) {
      button.setAttribute("aria-pressed", button.dataset.selectBuilding === selectedId ? "true" : "false");
    }
  }

  function addToLog(title, message, tone) {
    const entry = document.createElement("li");
    const heading = document.createElement("strong");
    const copy = document.createElement("p");
    entry.dataset.tone = tone;
    heading.textContent = title;
    copy.textContent = message;
    entry.append(heading, copy);
    log.prepend(entry);
    log.hidden = false;
    element["mission-log-empty"].hidden = true;
  }

  function showFeedback(result, title, previousEventId) {
    const message = result.ok ? result.message : result.reason;
    element.feedback.textContent = message;
    const status = result.state.missionStatus;
    const event = result.state.currentEvent;
    const newWarning = event && event.id !== previousEventId;
    let heading = result.ok ? title : "Action unavailable";
    let tone = result.ok ? "ok" : "error";

    if (status === "defeat") {
      heading = "Mission failed";
      tone = "error";
    } else if (status === "victory") {
      heading = "Mission success";
    } else if (newWarning) {
      heading = event.title;
      tone = "warning";
    }

    if (newWarning && heading !== event.title) addToLog(event.title, event.message, "warning");
    addToLog(heading, message, tone);
    notificationTitle.textContent = heading;
    let notification = message;
    if (status === "defeat") {
      notification = result.state.defeatReason;
    } else if (newWarning) {
      notification = "The simulated storm raised radiation risk. Shelter reduces exposure. See Mission Log for details.";
    }
    notificationMessage.textContent = notification;
    element.notification.dataset.tone = tone;
    element.notification.hidden = false;
    window.clearTimeout(notificationTimer);
    notificationTimer = window.setTimeout(() => {
      element.notification.hidden = true;
    }, 8000);
  }

  function renderPanel(state) {
    const building = getBuildingById(selectedId);
    if (!building) return;

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

    renderBuildingPanel(panel, {
      building,
      topic: educationalContent[building.id],
      state,
      actions,
      onAction(actionId) {
        const eventId = controller.getState().currentEvent?.id;
        const result = controller.dispatch({
          type: COMMANDS.BUILDING_ACTION,
          buildingId: building.id,
          actionId,
        });
        showFeedback(result, "Action complete", eventId);
        if (result.ok) bridge.playActionFeedback(building.id);
      },
      onClose() {
        hidePanel();
      },
    });
    panel.hidden = false;
  }

  function openPanel(buildingId) {
    if (selectedId !== buildingId) panel.replaceChildren();
    if (selectedId !== buildingId || panel.hidden) panel.scrollTop = 0;
    selectedId = buildingId;
    buildingsMenu.open = false;
    syncPicker();
    renderPanel(controller.getState());
    panel.querySelector(".panel-close").focus({ preventScroll: true });
  }

  function hidePanel() {
    if (panel.contains(document.activeElement)) buildingsToggle.focus({ preventScroll: true });
    panel.hidden = true;
    panel.replaceChildren();
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

    if (!panel.hidden) renderPanel(state);
  }

  bridge.onBuildingSelected = (buildingId) => {
    if (!buildingId) {
      selectedId = null;
      syncPicker();
      hidePanel();
      return;
    }
    openPanel(buildingId);
  };

  element["end-day"].addEventListener("click", () => {
    const eventId = controller.getState().currentEvent?.id;
    showFeedback(controller.dispatch({ type: COMMANDS.END_DAY }), "Day complete", eventId);
  });

  function showDialogView(view) {
    for (const section of dialog.querySelectorAll("[data-dialog-view]")) {
      section.hidden = section.dataset.dialogView !== view;
    }
    element["dialog-title"].textContent = DIALOG_TITLES[view];
    element["mission-control-back"].hidden = view === "menu" || view === "log" || view === "restart";
    dialog.scrollTop = 0;
  }

  function openDialog(view, trigger) {
    buildingsMenu.open = false;
    dialogTrigger = trigger;
    viewTrigger = null;
    showDialogView(view);
    dialog.showModal();
    if (view === "log") element["close-mission-control"].focus();
  }

  function returnToMenu() {
    showDialogView("menu");
    (viewTrigger ?? element["resume-game"]).focus();
  }

  element["open-mission-control"].addEventListener("click", (event) => openDialog("menu", event.currentTarget));
  element["open-mission-log"].addEventListener("click", (event) => openDialog("log", event.currentTarget));
  element["resume-game"].addEventListener("click", () => dialog.close());
  element["close-mission-control"].addEventListener("click", () => dialog.close());
  element["mission-control-back"].addEventListener("click", returnToMenu);
  element["cancel-restart"].addEventListener("click", returnToMenu);
  dialog.addEventListener("close", () => dialogTrigger?.focus({ preventScroll: true }));

  for (const button of dialog.querySelectorAll("[data-show-view]")) {
    button.addEventListener("click", () => {
      viewTrigger = button;
      const view = button.dataset.showView;
      showDialogView(view);
      const focusTarget = view === "restart" ? element["cancel-restart"] : element["close-mission-control"];
      focusTarget.focus();
    });
  }

  element["confirm-restart"].addEventListener("click", () => {
    hidePanel();
    bridge.clearSelection();
    selectedId = null;
    syncPicker();
    bridge.resetVisuals();
    log.replaceChildren();
    showFeedback(controller.reset(), "Mission restarted");
    dialog.close();
  });

  document.addEventListener("pointerdown", (event) => {
    if (buildingsMenu.open && !buildingsMenu.contains(event.target)) buildingsMenu.open = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || dialog.open) return;
    if (buildingsMenu.open) {
      buildingsMenu.open = false;
      buildingsToggle.focus({ preventScroll: true });
    } else if (!panel.hidden) {
      hidePanel();
    }
  });

  controller.subscribe(renderHud);
  renderHud(controller.getState());
  syncPicker();
  return { ok: true };
}

function formatMeter(value) {
  return Number.isFinite(value) ? String(value) : "—";
}
