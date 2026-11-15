import assert from "node:assert/strict";
import test from "node:test";
import { assessBuildingAction } from "../src/core/buildingActions.js";
import { createGameController } from "../src/core/gameController.js";
import { createInitialState } from "../src/core/initialState.js";
import { applyResourceDelta, resolveEndOfDay } from "../src/core/gameRules.js";
import { describeDonkiObservation, donkiObservation, educationalContent } from "../src/data/educationalContent.js";

function endDay(controller) {
  return controller.dispatch({ type: "END_DAY" });
}

function action(controller, buildingId, actionId) {
  return controller.dispatch({ type: "BUILDING_ACTION", buildingId, actionId });
}

test("initial game state matches the five-day training setup", () => {
  assert.deepEqual(createInitialState(), {
    day: 1,
    maxDays: 5,
    actionsRemaining: 2,
    resources: {
      power: 48,
      oxygen: 30,
      food: 27,
      water: 46,
      radiationRisk: 35,
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
  assert.equal(createInitialState().resources.power, 48);
  assert.equal(createInitialState().greenhouse.crop, "empty");
});

test("power and radiation stay inside their meters", () => {
  const { resources } = createInitialState();
  const above = applyResourceDelta(resources, { power: 100, radiationRisk: 100 });
  const below = applyResourceDelta(resources, { power: -100, radiationRisk: -100 });
  assert.equal(above.power, 100);
  assert.equal(above.radiationRisk, 100);
  assert.equal(below.power, 0);
  assert.equal(below.radiationRisk, 0);
});

test("the Habitat science note links the verified read-only NASA DONKI record", () => {
  const source = educationalContent.habitat.nasaSource;
  assert.equal(source, donkiObservation);
  assert.match(source.sourceName, /NASA Community Coordinated Modeling Center.*DONKI/);
  assert.equal(source.notificationTitle, "Auto-generated Space Weather Notification - SEP");
  assert.equal(source.notificationId, "20260730-AL-005");
  assert.equal(source.eventType, "solar energetic particle (SEP)");
  assert.equal(source.observedAt, "2026-07-30T18:45:00Z");
  assert.equal(source.issuedAt, "2026-07-30T18:53:31Z");
  assert.deepEqual(source.observation, {
    instrument: "GOES",
    energyThresholdMeV: 10,
    fluxThresholdPfu: 10,
  });
  assert.equal(source.sourceUrl, "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/47880/1");
  assert.match(source.limitations, /near Earth.*lunar surface dose.*archived.*fictional risk points/i);
  assert.ok(Object.isFrozen(source));
  assert.ok(Object.isFrozen(source.observation));
  assert.match(describeDonkiObservation(), /30 July 2026.*18:45 UTC.*GOES.*10 MeV exceeded 10 particle flux units/);
});

test("daily consumption is applied once and the day 3 warning raises radiation once", () => {
  const controller = createGameController();
  assert.equal(action(controller, "habitat", "shelter").ok, true);

  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().day, 3);
  assert.equal(controller.getState().currentEvent, null);
  assert.equal(controller.getState().resources.radiationRisk, 15);
  assert.equal(controller.getState().resources.oxygen, 16);

  const dayThree = endDay(controller);
  assert.equal(dayThree.ok, true);
  assert.match(dayThree.message, /Solar Radiation Warning/);
  assert.match(dayThree.state.currentEvent.message, /NASA DONKI alert 20260730-AL-005/);
  assert.ok(dayThree.state.currentEvent.message.includes(describeDonkiObservation()));
  assert.match(dayThree.state.currentEvent.message, /65 fictional risk points/);
  assert.equal(controller.getState().day, 4);
  assert.deepEqual(controller.getState().resources, {
    power: 25,
    oxygen: 9,
    food: 9,
    water: 37,
    radiationRisk: 80,
  });
  assert.equal(controller.getState().currentEvent.id, "solar-radiation-warning");
  assert.deepEqual(controller.getState().triggeredEventIds, ["solar-radiation-warning"]);

  endDay(controller);
  assert.equal(controller.getState().resources.radiationRisk, 80);
  assert.equal(controller.getState().triggeredEventIds.length, 1);
});

test("a prepared shelter lowers the radiation carried into the day 3 warning", () => {
  const controller = createGameController();
  const sheltered = controller.dispatch({
    type: "BUILDING_ACTION",
    buildingId: "habitat",
    actionId: "shelter",
  });
  assert.equal(sheltered.state.resources.radiationRisk, 15);

  endDay(controller);
  endDay(controller);
  endDay(controller);
  assert.equal(controller.getState().resources.radiationRisk, 80);
});

test("the radiation event does not run a second time on the same mission", () => {
  const state = createInitialState();
  state.day = 3;
  state.resources.radiationRisk = 15;
  const first = resolveEndOfDay(state);
  assert.equal(first.state.resources.radiationRisk, 80);

  const replay = structuredClone(first.state);
  replay.day = 3;
  replay.missionStatus = "active";
  replay.actionsRemaining = 2;
  const second = resolveEndOfDay(replay);
  assert.equal(second.ok, true);
  assert.equal(second.state.resources.radiationRisk, 80);
  assert.deepEqual(second.state.triggeredEventIds, ["solar-radiation-warning"]);
});

test("ending days without building actions fails at the solar storm", () => {
  const controller = createGameController();
  const first = endDay(controller);
  assert.match(first.message, /Solar storm expected.*Prepare Radiation Shelter/);
  assert.equal(endDay(controller).state.day, 3);

  const last = endDay(controller);
  assert.equal(last.state.missionStatus, "defeat");
  assert.equal(last.state.day, 3);
  assert.equal(last.state.resources.radiationRisk, 100);
  assert.match(last.state.defeatReason, /Prepare Radiation Shelter/);
  assert.match(last.message, /fictional risk points/);
});

test("using all four facilities can win the five-day mission with supplies to spare", () => {
  const controller = createGameController();
  const plan = [
    [["solar", "maintain"], ["greenhouse", "plant"]],
    [["habitat", "shelter"], ["greenhouse", "care"]],
    [["greenhouse", "harvest"], ["oxygen", "operate"]],
    [["solar", "maintain"]],
    [],
  ];
  let finale;
  for (const actions of plan) {
    for (const [building, command] of actions) {
      const result = action(controller, building, command);
      assert.equal(result.ok, true, result.reason);
    }
    finale = endDay(controller);
    assert.equal(finale.ok, true, finale.reason);
  }
  assert.equal(finale.ok, true);
  assert.match(finale.message, /Mission success/);
  assert.deepEqual(controller.getState().resources, {
    power: 21,
    oxygen: 15,
    food: 27,
    water: 10,
    radiationRisk: 80,
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
  assert.match(lost.state.defeatReason, /^The colony ran out of oxygen\..*Operate Oxygen System/);
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
    assert.ok(result.state.defeatReason.startsWith(reason));
  }
});

test("the next-day oxygen warning tells the player how to recover", () => {
  const state = createInitialState();
  state.resources.oxygen = 14;
  const result = resolveEndOfDay(state);
  assert.equal(result.state.missionStatus, "active");
  assert.match(result.message, /use up all oxygen.*needs oxygen to breathe.*Operate Oxygen System/);
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
  for (let step = 0; step < 3; step += 1) endDay(controller);
  const finished = controller.getState();
  assert.equal(finished.missionStatus, "defeat");

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
  assert.equal(played.state.resources.oxygen, 50);
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
  assert.equal(controller.getState().resources.radiationRisk, 100);
  assert.equal(controller.getState().currentEvent.id, "solar-radiation-warning");
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
  assert.equal(controller.getState().resources.power, 48);
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
  assert.equal(second.getState().resources.power, 48);
});

test("resolveEndOfDay does not modify the state it receives", () => {
  const state = createInitialState();
  state.greenhouse.crop = "growing";
  const before = structuredClone(state);
  resolveEndOfDay(state);
  assert.deepEqual(state, before);
});
