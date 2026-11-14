function cropStatus(greenhouse) {
  if (greenhouse.crop === "empty") return "Crop status: empty.";
  if (greenhouse.crop === "ready") return "Crop status: ready to harvest.";
  const paused = greenhouse.growthPaused
    ? " Growth is paused until upkeep can be paid."
    : "";
  return `Crop status: growing, ${greenhouse.growthProgress} of ${greenhouse.growthRequired} days complete.${paused}`;
}

function addLine(parent, className, text) {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

/**
 * Fills the shared building panel. The simulation still decides whether an action works.
 */
export function renderBuildingPanel(panel, { building, topic, state, actions, onAction, onClose }) {
  const previousFocus = panel.contains(document.activeElement) ? document.activeElement : null;
  const scienceOpen = panel.querySelector(".education-details")?.open ?? false;
  const scrollTop = panel.scrollTop;
  panel.replaceChildren();

  const header = document.createElement("div");
  header.className = "panel-header";

  const title = document.createElement("h2");
  title.id = "building-panel-title";
  title.className = "panel-title";
  title.textContent = building.name;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "panel-close";
  close.textContent = "Close";
  close.addEventListener("click", onClose);

  header.append(title, close);
  panel.append(header);

  addLine(panel, "panel-summary", building.summary);

  const operational = state.buildings[building.id]?.operational;
  addLine(
    panel,
    operational ? "panel-status panel-status--online" : "panel-status panel-status--offline",
    operational ? "Operational" : "Offline",
  );
  if (building.id === "greenhouse") addLine(panel, "panel-status", cropStatus(state.greenhouse));
  addLine(panel, "panel-status", `Actions left today: ${state.actionsRemaining}.`);

  const list = document.createElement("div");
  list.className = "action-list";

  for (const item of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.actionId = item.action.id;
    button.className = item.available ? "action-button" : "action-button action-button--blocked";

    const name = document.createElement("span");
    name.className = "action-button__name";
    name.textContent = item.action.name;

    const cost = document.createElement("span");
    cost.className = "action-button__cost";
    cost.textContent = item.costLabel;

    button.append(name, cost);
    if (item.action.description) {
      const detail = document.createElement("span");
      detail.className = "action-button__detail";
      detail.textContent = item.action.description;
      button.append(detail);
    }
    if (!item.available) {
      const reason = document.createElement("span");
      reason.className = "action-button__reason";
      reason.textContent = item.reason;
      button.append(reason);
    }
    button.addEventListener("click", () => onAction(item.action.id));
    list.append(button);
  }

  panel.append(list);

  if (topic) {
    const science = document.createElement("details");
    science.className = "education-details";
    science.open = scienceOpen;
    const summary = document.createElement("summary");
    summary.textContent = "Mission science";
    science.append(summary);
    addLine(science, "education-note", topic.summary);
    addLine(
      science,
      "education-note education-note--source",
      "A NASA data source has not been linked to this note yet.",
    );
    panel.append(science);
  }

  panel.scrollTop = scrollTop;
  if (previousFocus) {
    const nextFocus = previousFocus.dataset.actionId
      ? [...list.children].find((button) => button.dataset.actionId === previousFocus.dataset.actionId)
      : panel.querySelector(previousFocus.matches("summary") ? ".education-details summary" : ".panel-close");
    nextFocus?.focus({ preventScroll: true });
  }
}
