import assert from "node:assert/strict";
import test from "node:test";
import { assessBuildingAction } from "../src/core/buildingActions.js";
import { buildings } from "../src/data/buildings.js";
import { BUILDING_ACTIONS } from "../src/core/buildingActions.js";
import { createGameController } from "../src/core/gameController.js";
import { createInitialState } from "../src/core/initialState.js";
import { resolveEndOfDay } from "../src/core/gameRules.js";

function perform(state, buildingId, actionId) {
  return assessBuildingAction(state, {
    type: "BUILDING_ACTION",
    buildingId,
    actionId,
  });
}

test("every building has a defined action and a shared configuration entry", () => {
  const buildingIds = buildings.map((building) => building.id);
  assert.deepEqual(buildingIds, ["habitat", "oxygen", "greenhouse", "solar"]);
  for (const buildingId of buildingIds) {
    const actions = BUILDING_ACTIONS.filter((action) => action.buildingId === buildingId);
    assert.ok(actions.length >= 1, `${buildingId} needs at least one action`);
  }
});

test("valid actions deduct the correct resources", () => {
  let state = createInitialState();

  const solar = perform(state, "solar", "maintain");
  assert.equal(solar.ok, true);
  assert.equal(solar.state.resources.power, 100);
  assert.equal(solar.state.actionsRemaining, 1);

  const oxygen = perform(solar.state, "oxygen", "operate");
  assert.equal(oxygen.ok, true);
  assert.equal(oxygen.state.resources.power, 90);
  assert.equal(oxygen.state.resources.oxygen, 100);
  assert.equal(oxygen.state.actionsRemaining, 0);

  state = createInitialState();
  const shelter = perform(state, "habitat", "shelter");
  assert.equal(shelter.ok, true);
  assert.equal(shelter.state.resources.power, 72);
  assert.equal(shelter.state.resources.radiationRisk, 0);
  assert.equal(shelter.state.resources.oxygen, 80);
  assert.equal(shelter.state.resources.food, 70);
  assert.equal(shelter.state.resources.water, 70);
});

test("invalid actions leave resources and the action count unchanged", () => {
  const state = createInitialState();
  const before = structuredClone(state);
  const harvest = perform(state, "greenhouse", "harvest");
  const care = perform(state, "greenhouse", "care");
  const unknown = perform(state, "greenhouse", "maintain");

  assert.equal(harvest.ok, false);
  assert.equal(harvest.reason, "The crop is not ready to harvest.");
  assert.equal(care.ok, false);
  assert.equal(care.reason, "There is no growing crop to care for.");
  assert.equal(unknown.ok, false);
  assert.deepEqual(state, before);
  assert.deepEqual(harvest.state.resources, before.resources);
  assert.equal(harvest.state.actionsRemaining, 2);
});

test("actions are rejected when resources are too low", () => {
  const state = createInitialState();
  state.resources.power = 7;
  state.resources.water = 7;
  const before = structuredClone(state);

  const oxygen = perform(state, "oxygen", "operate");
  const plant = perform(state, "greenhouse", "plant");
  const shelter = perform(state, "habitat", "shelter");

  assert.equal(oxygen.ok, false);
  assert.match(oxygen.reason, /Not enough resources/);
  assert.equal(plant.ok, false);
  assert.match(plant.reason, /water/);
  assert.equal(shelter.ok, false);
  assert.deepEqual(state, before);
});

test("a player cannot take a third action in the same day", () => {
  const controller = createGameController();
  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "oxygen", actionId: "operate" });
  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "oxygen", actionId: "operate" });
  const before = controller.getState();
  assert.equal(before.actionsRemaining, 0);
  assert.equal(before.resources.power, 60);
  assert.equal(before.resources.oxygen, 100);

  const third = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "oxygen",
    actionId: "operate",
  });
  assert.equal(third.ok, false);
  assert.match(third.reason, /No actions remaining/);
  assert.deepEqual(controller.getState(), before);
});

test("planting starts a growing crop and spends power and water", () => {
  const state = createInitialState();
  const planted = perform(state, "greenhouse", "plant");
  assert.equal(planted.ok, true);
  assert.equal(planted.state.greenhouse.crop, "growing");
  assert.equal(planted.state.greenhouse.growthProgress, 0);
  assert.equal(planted.state.greenhouse.cared, false);
  assert.equal(planted.state.resources.power, 74);
  assert.equal(planted.state.resources.water, 62);
  assert.equal(planted.state.actionsRemaining, 1);
  assert.equal(state.greenhouse.crop, "empty");
});

test("premature harvesting is rejected while the crop is growing", () => {
  const state = createInitialState();
  const planted = perform(state, "greenhouse", "plant");
  const before = structuredClone(planted.state);
  const harvest = perform(planted.state, "greenhouse", "harvest");
  assert.equal(harvest.ok, false);
  assert.equal(harvest.reason, "The crop is not ready to harvest.");
  assert.deepEqual(planted.state, before);
});

test("crop growth advances only when upkeep is paid in full", () => {
  let state = createInitialState();
  state = perform(state, "greenhouse", "plant").state;

  const firstDay = resolveEndOfDay(state);
  assert.equal(firstDay.state.greenhouse.crop, "growing");
  assert.equal(firstDay.state.greenhouse.growthProgress, 1);
  assert.equal(firstDay.state.greenhouse.growthPaused, false);
  assert.equal(firstDay.state.resources.power, 62);
  assert.equal(firstDay.state.resources.water, 55);
  assert.equal(firstDay.state.resources.food, 64);

  const ready = resolveEndOfDay(firstDay.state);
  assert.equal(ready.state.greenhouse.crop, "ready");
  assert.equal(ready.state.greenhouse.growthProgress, 2);
  assert.match(ready.message, /ready to harvest/);
  assert.equal(ready.state.resources.power, 50);
  assert.equal(ready.state.resources.water, 48);

  const paused = createInitialState();
  paused.resources.power = 10;
  paused.resources.water = 50;
  paused.greenhouse.crop = "growing";
  const held = resolveEndOfDay(paused);
  assert.equal(held.state.missionStatus, "active");
  assert.equal(held.state.greenhouse.crop, "growing");
  assert.equal(held.state.greenhouse.growthProgress, 0);
  assert.equal(held.state.greenhouse.growthPaused, true);
  assert.equal(held.state.resources.power, 5);
  assert.equal(held.state.resources.water, 47);

  const shortWater = createInitialState();
  shortWater.resources.power = 40;
  shortWater.resources.water = 5;
  shortWater.greenhouse.crop = "growing";
  const waterHeld = resolveEndOfDay(shortWater);
  assert.equal(waterHeld.state.greenhouse.growthProgress, 0);
  assert.equal(waterHeld.state.resources.power, 35);
  assert.equal(waterHeld.state.resources.water, 2);
});

test("harvesting adds food and resets the greenhouse", () => {
  let state = createInitialState();
  state = perform(state, "greenhouse", "plant").state;
  state = resolveEndOfDay(state).state;
  state = resolveEndOfDay(state).state;
  assert.equal(state.greenhouse.crop, "ready");
  assert.equal(state.resources.food, 58);

  const harvested = perform(state, "greenhouse", "harvest");
  assert.equal(harvested.ok, true);
  assert.equal(harvested.state.resources.food, 80);
  assert.match(harvested.message, /gained 22 food/);
  assert.equal(harvested.state.greenhouse.crop, "empty");
  assert.equal(harvested.state.greenhouse.growthProgress, 0);
  assert.equal(harvested.state.greenhouse.cared, false);
});

test("crop care is optional, improves one harvest, and cannot be repeated", () => {
  let state = createInitialState();
  state = perform(state, "greenhouse", "plant").state;
  const cared = perform(state, "greenhouse", "care");
  assert.equal(cared.ok, true);
  assert.equal(cared.state.greenhouse.cared, true);
  assert.equal(cared.state.resources.food, 70);
  assert.equal(cared.state.resources.power, 70);
  assert.equal(cared.state.resources.water, 57);

  const retryState = structuredClone(cared.state);
  retryState.actionsRemaining = 1;
  const beforeRepeat = structuredClone(retryState);
  const repeat = perform(retryState, "greenhouse", "care");
  assert.equal(repeat.ok, false);
  assert.equal(repeat.reason, "Crop care is already complete for this planting.");
  assert.deepEqual(retryState, beforeRepeat);

  state = resolveEndOfDay(cared.state).state;
  state = resolveEndOfDay(state).state;
  assert.equal(state.greenhouse.crop, "ready");
  const harvested = perform(state, "greenhouse", "harvest");
  assert.equal(harvested.ok, true);
  assert.equal(harvested.state.resources.food, 88);
  assert.match(harvested.message, /gained 30 food/);
  assert.equal(harvested.state.greenhouse.crop, "empty");

  const replanted = perform(harvested.state, "greenhouse", "plant");
  assert.equal(replanted.ok, true);
  assert.equal(replanted.state.greenhouse.cared, false);
});

test("an offline building rejects its action without spending resources", () => {
  const state = createInitialState();
  state.buildings.solar.operational = false;
  const before = structuredClone(state);
  const result = perform(state, "solar", "maintain");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "This building is offline.");
  assert.deepEqual(state, before);
});
