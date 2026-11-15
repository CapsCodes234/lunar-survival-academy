/**
 * Shared callbacks between Phaser and the HTML interface.
 * main.js creates one bridge and both sides use that same object.
 * Methods other than onBuildingSelected are replaced by ColonyScene when it boots.
 */
export function createSceneBridge() {
  const bridge = {
    pendingSelection: null,
    onBuildingSelected() {},
    selectBuilding(buildingId) {
      bridge.pendingSelection = buildingId;
    },
    clearSelection() {
      bridge.pendingSelection = null;
    },
    moveAstronautTo() {},
    playActionFeedback() {},
    playRadiationWarning() {},
    resetVisuals() {},
  };
  return bridge;
}
