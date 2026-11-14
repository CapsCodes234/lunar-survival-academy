import assert from "node:assert/strict";
import test from "node:test";
import { assessBuildingAction } from "../src/core/buildingActions.js";
import { createGameController } from "../src/core/gameController.js";
import { createInitialState } from "../src/core/initialState.js";
import { resolveEndOfDay } from "../src/core/gameRules.js";

function endDay(controller) {
  return controller.dispatch({ type: "END_DAY" });
}

test("initial game state matches the Phase 1 contract", () => {
  assert.deepEqual(createInitialState(), {
    day: 1,
    maxDays: 5,
    actionsRemaining: 2,
    resources: {
      power: 80,
      oxygen: 80,
      food: 70,
      water: 70,
      radiationRisk: 10,
    },
    greenhouse: {
      crop: "empty",
      growthProgress: 0,
      growthRequired: 2,
      cared: false,
      growthPaused: false,
    },
    buildings: {
      habitat: { operational: true },
      oxygen: { operational: true },
      greenhouse: { operational: true },
      solar: { operational: true },
    },
    currentEvent: null,
    triggeredEventIds: [],
    missionStatus: "active",
    defeatReason: null,
  });
});

test("each new state object has its own resource values", () => {
  const first = createInitialState();
  first.resources.power = 1;
  first.greenhouse.crop = "ready";
  assert.equal(createInitialState().resources.power, 80);
  assert.equal(createInitialState().greenhouse.crop, "empty");
});

test("power and radiation stay inside their meters", () => {
  const controller = createGameController();
  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "solar", actionId: "maintain" });
  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "solar", actionId: "maintain" });
  assert.equal(controller.getState().resources.power, 100);

  const sheltered = controller.dispatch({ type: "RESET" });
  assert.equal(sheltered.state.resources.power, 80);
  const result = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "habitat",
    actionId: "shelter",
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.resources.radiationRisk, 0);
  assert.equal(result.state.resources.power, 72);
});

test("daily consumption is applied once and the day 3 warning raises radiation once", () => {
  const controller = createGameController();

  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().day, 3);
  assert.equal(controller.getState().currentEvent, null);
  assert.equal(controller.getState().resources.radiationRisk, 10);
  assert.equal(controller.getState().resources.oxygen, 66);

  const dayThree = endDay(controller);
  assert.equal(dayThree.ok, true);
  assert.match(dayThree.message, /Solar Radiation Warning/);
  assert.equal(controller.getState().day, 4);
  assert.equal(controller.getState().resources.radiationRisk, 35);
  assert.equal(controller.getState().currentEvent.id, "solar-radiation-warning");
  assert.deepEqual(controller.getState().triggeredEventIds, ["solar-radiation-warning"]);

  endDay(controller);
  assert.equal(controller.getState().resources.radiationRisk, 35);
  assert.equal(controller.getState().triggeredEventIds.length, 1);
});

test("a prepared shelter lowers the radiation carried into the day 3 warning", () => {
  const controller = createGameController();
  const sheltered = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "habitat",
    actionId: "shelter",
  });
  assert.equal(sheltered.state.resources.radiationRisk, 0);

  endDay(controller);
  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().resources.radiationRisk, 25);
});

test("the radiation event does not run a second time on the same mission", () => {
  const state = createInitialState();
  state.day = 3;
  const first = resolveEndOfDay(state);
  assert.equal(first.state.resources.radiationRisk, 35);

  const replay = structuredClone(first.state);
  replay.day = 3;
  replay.missionStatus = "active";
  replay.actionsRemaining = 2;
  const second = resolveEndOfDay(replay);
  assert.equal(second.ok, true);
  assert.equal(second.state.resources.radiationRisk, 35);
  assert.deepEqual(second.state.triggeredEventIds, ["solar-radiation-warning"]);
});

test("five daily evaluations from the start produce victory on day 5", () => {
  const controller = createGameController();

  for (let step = 0; step < 4; step += 1) endDay(controller);
  assert.equal(controller.getState().day, 5);
  assert.equal(controller.getState().missionStatus, "active");

  const finale = endDay(controller);
  assert.equal(finale.ok, true);
  assert.match(finale.message, /Mission success/);
  assert.deepEqual(controller.getState().resources, {
    power: 55,
    oxygen: 45,
    food: 40,
    water: 55,
    radiationRisk: 35,
  });
  assert.equal(controller.getState().day, 5);
  assert.equal(controller.getState().missionStatus, "victory");
  assert.equal(controller.getState().actionsRemaining, 0);
});

test("surviving day 5 with oxygen left is victory, and empty oxygen is defeat", () => {
  const victory = createInitialState();
  victory.day = 5;
  victory.resources.oxygen = 8;
  const won = resolveEndOfDay(victory);
  assert.equal(won.outcome, "victory");
  assert.equal(won.state.day, 5);
  assert.equal(won.state.resources.oxygen, 1);

  const defeat = createInitialState();
  defeat.day = 5;
  defeat.resources.oxygen = 7;
  const lost = resolveEndOfDay(defeat);
  assert.equal(lost.outcome, "defeat");
  assert.equal(lost.state.day, 5);
  assert.equal(lost.state.resources.oxygen, 0);
  assert.equal(lost.state.defeatReason, "The colony ran out of oxygen.");
});

test("critical resource depletion produces defeat and stops the day from advancing", () => {
  const cases = [
    ["power", 4, "The colony ran out of power."],
    ["oxygen", 6, "The colony ran out of oxygen."],
    ["food", 5, "The colony ran out of food."],
    ["water", 2, "The colony ran out of water."],
  ];

  for (const [resource, amount, reason] of cases) {
    const state = createInitialState();
    state.resources[resource] = amount;
    const result = resolveEndOfDay(state);
    assert.equal(result.outcome, "defeat");
    assert.equal(result.state.resources[resource], 0);
    assert.equal(result.state.day, 1);
    assert.equal(result.state.actionsRemaining, 0);
    assert.equal(result.state.defeatReason, reason);
  }
});

test("radiation risk of 100 ends the mission during day 3 processing", () => {
  const state = createInitialState();
  state.day = 3;
  state.resources.radiationRisk = 80;
  const result = resolveEndOfDay(state);
  assert.equal(result.outcome, "defeat");
  assert.equal(result.state.resources.radiationRisk, 100);
  assert.equal(result.state.day, 3);
  assert.match(result.state.defeatReason, /Radiation risk reached 100/);
  assert.deepEqual(result.state.triggeredEventIds, ["solar-radiation-warning"]);
});

test("no gameplay command changes the mission after it ends", () => {
  const controller = createGameController();
  for (let step = 0; step < 5; step += 1) endDay(controller);
  const finished = controller.getState();

  const action = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "solar",
    actionId: "maintain",
  });
  const anotherDay = endDay(controller);

  assert.equal(action.ok, false);
  assert.match(action.reason, /mission is over/i);
  assert.equal(anotherDay.ok, false);
  assert.deepEqual(controller.getState(), finished);
});

test("spending the last power point on oxygen defeats the mission", () => {
  const state = createInitialState();
  state.resources.power = 10;
  const before = structuredClone(state);
  const played = assessBuildingAction(state, {
    type: "BUILDING_ACTION",
    buildingId: "oxygen",
    actionId: "operate",
  });

  assert.equal(played.ok, true);
  assert.equal(played.state.resources.power, 0);
  assert.equal(played.state.resources.oxygen, 100);
  assert.equal(played.state.missionStatus, "defeat");
  assert.equal(played.state.actionsRemaining, 0);
  assert.deepEqual(state, before);
});

test("restart restores the initial mission and lets the warning happen again", () => {
  const controller = createGameController();
  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "solar", actionId: "maintain" });
  endDay(controller);
  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().currentEvent.id, "solar-radiation-warning");

  const restarted = controller.reset();
  assert.equal(restarted.ok, true);
  assert.deepEqual(controller.getState(), createInitialState());

  endDay(controller);
  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().resources.radiationRisk, 35);
});

test("callers cannot mutate the controller state", () => {
  const controller = createGameController();
  const snapshot = controller.getState();
  assert.throws(() => {
    snapshot.resources.power = 0;
  });
  assert.throws(() => {
    snapshot.day = 4;
  });
  assert.equal(controller.getState().resources.power, 80);
  assert.equal(controller.getState().day, 1);
});

test("subscribers hear successful changes only", () => {
  const controller = createGameController();
  let calls = 0;
  const unsubscribe = controller.subscribe(() => {
    calls += 1;
  });

  const rejected = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "greenhouse",
    actionId: "harvest",
  });
  assert.equal(rejected.ok, false);
  assert.equal(calls, 0);

  controller.dispatch({ type: "BUILDING_ACTION", buildingId: "solar", actionId: "maintain" });
  assert.equal(calls, 1);
  unsubscribe();
  controller.reset();
  assert.equal(calls, 1);
});

test("unknown and mismatched commands leave the mission unchanged", () => {
  const controller = createGameController();
  const before = controller.getState();
  assert.equal(controller.dispatch(null).ok, false);
  assert.equal(controller.dispatch({ type: "LAUNCH" }).ok, false);
  assert.equal(
    controller.dispatch({ type: "BUILDING_ACTION", buildingId: "habitat", actionId: "plant" }).ok,
    false,
  );
  assert.deepEqual(controller.getState(), before);
});

test("separate controllers do not share a mission", () => {
  const first = createGameController();
  const second = createGameController();
  first.dispatch({ type: "BUILDING_ACTION", buildingId: "solar", actionId: "maintain" });
  assert.equal(second.getState().resources.power, 80);
});

test("resolveEndOfDay does not modify the state it receives", () => {
  const state = createInitialState();
  state.greenhouse.crop = "growing";
  const before = structuredClone(state);
  resolveEndOfDay(state);
  assert.deepEqual(state, before);
});
