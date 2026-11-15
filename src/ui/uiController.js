import { assessBuildingAction, describeActionCost, listActionsForBuilding } from "../core/buildingActions.js";
import { COMMANDS } from "../core/gameController.js";
import { actionAudio, dayAudio } from "../game/audio/audioRouting.js";
import { describeDonkiObservation, donkiObservation, educationalContent } from "../data/educationalContent.js";
import { buildings, getBuildingById } from "../data/buildings.js";
import { resourceChanges, resourceLabels } from "../data/missionFeedback.js";
import { renderBuildingPanel } from "./buildingPanel.js";
import { mountAudioSettings } from "./audioSettings.js";

const DAY_RECAP_MS = 2200;

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
  "day-recap",
  "day-recap-title",
  "day-recap-changes",
  "day-recap-crop",
  "day-recap-warning",
  "skip-day-recap",
  "result-days",
  "result-message",
  "result-resources",
  "result-restart",
  "open-mission-control",
  "open-mission-log",
  "mission-control",
  "dialog-title",
  "donki-observation",
  "donki-limitations",
  "donki-source",
  "close-mission-control",
  "resume-game",
  "mission-control-back",
  "audio-master",
  "audio-volume",
  "audio-volume-text",
  "audio-ambience",
  "audio-status",
  "cancel-restart",
  "confirm-restart",
  "mission-log-empty",
  "mission-log-entries",
];

const DIALOG_TITLES = {
  menu: "Mission Control",
  help: "How to Play",
  science: "NASA Science / References",
  sound: "Sound settings",
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
export function mountInterface({ controller, bridge, audio }) {
  const missing = REQUIRED_IDS.filter((id) => !document.getElementById(id));
  if (missing.length > 0) {
    showSetupError(`The page is missing these interface elements: ${missing.join(", ")}.`);
    return { ok: false };
  }

  const element = Object.fromEntries(REQUIRED_IDS.map((id) => [id, document.getElementById(id)]));
  mountAudioSettings({
    audio,
    master: element["audio-master"],
    volume: element["audio-volume"],
    volumeText: element["audio-volume-text"],
    ambience: element["audio-ambience"],
    status: element["audio-status"],
  });
  const panel = element["building-panel"];
  const buildingsMenu = element["buildings-menu"];
  const buildingsToggle = buildingsMenu.querySelector("summary");
  const dialog = element["mission-control"];
  const log = element["mission-log-entries"];
  element["donki-observation"].textContent = describeDonkiObservation();
  element["donki-limitations"].textContent = donkiObservation.limitations;
  element["donki-source"].href = donkiObservation.sourceUrl;
  element["donki-source"].textContent = `NASA DONKI alert ${donkiObservation.notificationId} (opens in a new tab)`;
  const notificationTitle = element.notification.querySelector(".notification__title");
  const notificationMessage = element.notification.querySelector(".notification__message");
  let selectedId = null;
  let dialogTrigger;
  let viewTrigger;
  let notificationTimer;
  let dayRecapTimer;
  let endingDay = false;

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
    if (newWarning) bridge.playRadiationWarning();
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
      notification = "A real solar particle event inspired this drill. Shelter reduces exposure. See Mission Log for the observation.";
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
        const before = controller.getState();
        const result = controller.dispatch({
          type: COMMANDS.BUILDING_ACTION,
          buildingId: building.id,
          actionId,
        });
        showFeedback(result, "Action complete", before.currentEvent?.id);
        const changes = resourceChanges(before.resources, result.state.resources);
        const { cue, spentOnly, task } = actionAudio(result, building.id, actionId, changes);
        audio.play(cue, { spentOnly });
        if (result.ok) {
          const onTaskComplete = task ? () => {
            const state = controller.getState();
            if (state.day === before.day && state.missionStatus === "active") audio.play("task");
          } : undefined;
          bridge.playActionFeedback(building.id, changes, onTaskComplete);
          if (result.state.missionStatus !== "active") {
            finishDayRecap();
            showMissionResult(result.state);
          }
        }
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
    element["end-day"].disabled = endingDay || state.missionStatus !== "active";

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
    if (selectedId !== buildingId) audio.play("select");
    openPanel(buildingId);
  };

  function finishDayRecap() {
    window.clearTimeout(dayRecapTimer);
    endingDay = false;
    const moveFocus = document.activeElement === element["skip-day-recap"];
    element["day-recap"].hidden = true;
    const endDay = element["end-day"];
    endDay.disabled = controller.getState().missionStatus !== "active";
    if (moveFocus && !endDay.disabled && !dialog.open) endDay.focus({ preventScroll: true });
  }

  function showDayRecap(before, after, restoreFocus) {
    element["day-recap-title"].textContent = `Day ${before.day} complete · Day ${after.day} begins`;
    const changes = resourceChanges(before.resources, after.resources);
    element["day-recap-changes"].replaceChildren(...changes.map(({ text }) => {
      const change = document.createElement("span");
      change.textContent = text;
      return change;
    }));

    const crop = after.greenhouse;
    let cropUpdate = "";
    if (crop.crop === "growing") {
      cropUpdate = crop.growthPaused
        ? "Lettuce growth paused. Check power and water."
        : `Lettuce grew (${crop.growthProgress}/${crop.growthRequired} days).`;
    } else if (crop.crop === "ready" && before.greenhouse.crop !== "ready") {
      cropUpdate = "Lettuce is ready to harvest.";
    }
    element["day-recap-crop"].textContent = cropUpdate;
    element["day-recap-crop"].hidden = !cropUpdate;
    const warning = after.currentEvent && after.currentEvent.id !== before.currentEvent?.id;
    element["day-recap-warning"].hidden = !warning;
    element["day-recap"].dataset.tone = warning ? "warning" : "ok";
    element["day-recap"].hidden = false;
    if (restoreFocus) element["skip-day-recap"].focus({ preventScroll: true });
    dayRecapTimer = window.setTimeout(finishDayRecap, DAY_RECAP_MS);
  }

  element["skip-day-recap"].addEventListener("click", finishDayRecap);
  element["end-day"].addEventListener("click", (event) => {
    if (endingDay) return;
    const before = controller.getState();
    if (before.missionStatus !== "active") return;
    const restoreFocus = document.activeElement === event.currentTarget;
    endingDay = true;
    event.currentTarget.disabled = true;
    const result = controller.dispatch({ type: COMMANDS.END_DAY });
    showFeedback(result, "Day complete", before.currentEvent?.id);
    audio.play(dayAudio(before, result));
    if (result.ok && result.state.missionStatus === "active") {
      showDayRecap(before, result.state, restoreFocus);
      return;
    }
    finishDayRecap();
    if (result.ok) showMissionResult(result.state);
  });

  function showDialogView(view, title = DIALOG_TITLES[view]) {
    for (const section of dialog.querySelectorAll("[data-dialog-view]")) {
      section.hidden = section.dataset.dialogView !== view;
    }
    element["dialog-title"].textContent = title;
    element["mission-control-back"].hidden = ["menu", "log", "restart", "result"].includes(view);
    dialog.scrollTop = 0;
  }

  function openDialog(view, trigger, title) {
    buildingsMenu.open = false;
    dialogTrigger = trigger;
    viewTrigger = null;
    showDialogView(view, title);
    if (!dialog.open) dialog.showModal();
    if (view === "log") element["close-mission-control"].focus();
  }

  function showMissionResult(state) {
    const won = state.missionStatus === "victory";
    const survived = won ? state.day : state.day - 1;
    element["result-days"].textContent = `${survived} of ${state.maxDays} days survived`;
    element["result-message"].textContent = won
      ? "You planned ahead, kept the crew supplied, and made it through the solar storm."
      : state.defeatReason;
    const supplies = Object.entries(resourceLabels).map(([key, label]) => {
      const row = document.createElement("div");
      const name = document.createElement("dt");
      const value = document.createElement("dd");
      name.textContent = label;
      value.textContent = formatMeter(state.resources[key]);
      row.append(name, value);
      return row;
    });
    element["result-resources"].replaceChildren(...supplies);
    element.notification.hidden = true;
    openDialog("result", element["open-mission-control"], won ? "Mission complete" : "Mission failed");
    element["result-restart"].focus();
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

  function restartMission() {
    audio.stopEffects();
    finishDayRecap();
    hidePanel();
    bridge.clearSelection();
    selectedId = null;
    syncPicker();
    bridge.resetVisuals();
    log.replaceChildren();
    showFeedback(controller.reset(), "Mission restarted");
    dialog.close();
  }

  element["confirm-restart"].addEventListener("click", restartMission);
  element["result-restart"].addEventListener("click", restartMission);

  document.addEventListener("pointerdown", (event) => {
    if (buildingsMenu.open && !buildingsMenu.contains(event.target)) buildingsMenu.open = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")
      && [element["end-day"], element["skip-day-recap"]].includes(event.target)) {
      event.preventDefault();
    }
    if (event.key !== "Escape" || dialog.open) return;
    if (!element["day-recap"].hidden) {
      finishDayRecap();
    } else if (buildingsMenu.open) {
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
