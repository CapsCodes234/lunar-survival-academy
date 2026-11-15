import assert from "node:assert/strict";
import test from "node:test";
import { createAudioManager } from "../src/game/audio/audioManager.js";
import { actionAudio, dayAudio } from "../src/game/audio/audioRouting.js";

class AudioParamMock {
  value = 0;
  cancelScheduledValues() {}
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class AudioContextMock extends EventTarget {
  state = "suspended";
  currentTime = 0;
  destination = {};
  oscillators = [];
  gains = [];

  constructor() {
    super();
    AudioContextMock.last = this;
  }

  createGain() {
    const node = { gain: new AudioParamMock(), connect() {}, disconnect() {} };
    this.gains.push(node);
    return node;
  }

  createOscillator() {
    const node = {
      frequency: new AudioParamMock(),
      connect() {},
      disconnect() {},
      start() { this.started = true; },
      stop(time) { this.stopAt = time; },
      finish() { this.onended(); },
    };
    this.oscillators.push(node);
    return node;
  }

  resume() {
    this.state = "running";
    this.dispatchEvent(new Event("statechange"));
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
}

const gesture = { isTrusted: true };

test("audio starts on a trusted gesture and honors mute and effects gain", () => {
  let time = 0;
  const manager = createAudioManager({ Context: AudioContextMock, storage: memoryStorage(), now: () => time });
  AudioContextMock.last = null;
  manager.unlock({ isTrusted: false });
  manager.play("select");
  assert.equal(AudioContextMock.last, null);
  assert.equal(manager.getState().status, "locked");
  manager.unlock(gesture);
  const context = AudioContextMock.last;
  assert.equal(manager.getState().status, "ready");
  assert.equal(context.oscillators.length, 1);
  manager.setPreferences({ enabled: false });
  assert.equal(manager.getState().status, "muted");
  manager.play("harvest");
  assert.equal(context.oscillators.length, 1);
  assert.equal(context.gains[0].gain.value, 0);
  manager.setPreferences({ enabled: true, volume: 0.25 });
  assert.equal(context.gains[0].gain.value, 1);
  assert.equal(context.gains[1].gain.value, 0.18);
  manager.play("solar");
  assert.equal(context.oscillators.length, 3);
  time += 20;
  manager.play("solar");
  assert.equal(context.oscillators.length, 3);
  manager.destroy();
  assert.equal(context.state, "closed");
});

test("preferences clamp and persist with a session fallback if storage is blocked", () => {
  const storage = memoryStorage();
  const manager = createAudioManager({ Context: null, storage });
  assert.deepEqual(manager.getState(), { enabled: true, volume: 0.4, ambience: false, status: "unavailable" });
  manager.setPreferences({ enabled: false, volume: 5, ambience: true });
  const loaded = createAudioManager({ Context: null, storage });
  assert.deepEqual(loaded.getState(), { enabled: false, volume: 1, ambience: true, status: "unavailable" });
  loaded.setPreferences({ volume: -1 });
  assert.equal(loaded.getState().volume, 0);
  loaded.setPreferences({ volume: NaN });
  assert.equal(loaded.getState().volume, 0.4);

  const denied = createAudioManager({ Context: null, storage: {
    getItem() { throw new Error("Denied"); },
    setItem() { throw new Error("Denied"); },
  } });
  denied.setPreferences({ volume: 0.65 });
  assert.equal(denied.getState().volume, 0.65);
});

test("a settings listener is registered once and stops receiving updates after disposal", () => {
  const manager = createAudioManager({ Context: null, storage: memoryStorage() });
  let changes = 0;
  const listener = () => { changes += 1; };
  const unsubscribe = manager.subscribe(listener);
  manager.subscribe(listener);
  manager.setPreferences({ volume: 0.3 });
  assert.equal(changes, 1);
  unsubscribe();
  manager.setPreferences({ volume: 0.2 });
  assert.equal(changes, 1);
});

test("ambience stays opt-in and fade-out prevents duplicate hum voices", () => {
  const manager = createAudioManager({ Context: AudioContextMock, storage: memoryStorage() });
  manager.unlock(gesture);
  const context = AudioContextMock.last;
  assert.equal(context.oscillators.length, 0);
  manager.setPreferences({ ambience: true });
  assert.equal(context.oscillators.length, 2);
  manager.setVisible(false);
  assert.ok(context.oscillators.every((node) => Number.isFinite(node.stopAt)));
  manager.setVisible(true);
  assert.equal(context.oscillators.length, 2);
  context.oscillators.slice().forEach((node) => node.finish());
  assert.equal(context.oscillators.length, 4);
  manager.setSceneActive(false);
  assert.ok(context.oscillators.every((node) => Number.isFinite(node.stopAt)));
  manager.destroy();
});

test("failed audio construction and denied resume leave the game free to continue", async () => {
  const failed = createAudioManager({
    Context: class { constructor() { throw new Error("No device"); } },
    storage: memoryStorage(),
  });
  assert.doesNotThrow(() => failed.unlock(gesture));
  assert.equal(failed.getState().status, "unavailable");
  assert.doesNotThrow(() => failed.play("victory"));

  const denied = createAudioManager({
    Context: class extends AudioContextMock { resume() { return Promise.reject(new Error("Blocked")); } },
    storage: memoryStorage(),
  });
  denied.unlock(gesture);
  denied.play("victory");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(denied.getState().status, "locked");
  assert.equal(AudioContextMock.last.oscillators.length, 0);
  denied.destroy();
});

test("action routing groups resource changes and reserves the harvest chime for success", () => {
  const accepted = { ok: true, state: { missionStatus: "active" } };
  assert.deepEqual(actionAudio({ ok: false }, "greenhouse", "harvest", []), { cue: "reject" });
  assert.deepEqual(actionAudio(accepted, "greenhouse", "harvest", [{ favorable: true }]), { cue: "harvest" });
  assert.deepEqual(actionAudio(accepted, "oxygen", "operate", [{ favorable: true }, { favorable: false }]),
    { cue: "oxygen", spentOnly: false, task: true });
  assert.deepEqual(actionAudio(accepted, "greenhouse", "plant", [{ favorable: false }, { favorable: false }]),
    { cue: "greenhouse", spentOnly: true, task: true });
  assert.deepEqual(actionAudio({ ok: true, state: { missionStatus: "defeat" } }, "oxygen", "operate", []),
    { cue: "defeat" });
});

test("day routing acknowledges a real advance and recognizes a new radiation event once", () => {
  const event = { id: "solar-radiation-warning" };
  const active = (day, currentEvent = null) => ({ day, currentEvent, missionStatus: "active" });
  assert.equal(dayAudio(active(1), { ok: true, state: active(2) }), "day");
  assert.equal(dayAudio(active(2), { ok: false }), null);
  assert.equal(dayAudio(active(2), { ok: true, state: active(2) }), null);
  assert.equal(dayAudio(active(3), { ok: true, state: active(4, event) }), "radiation");
  assert.equal(dayAudio(active(4, event), { ok: true, state: active(5, event) }), "day");
  assert.equal(dayAudio(active(3), { ok: true, state: { ...active(3, event), missionStatus: "defeat" } }), "radiationDefeat");
  assert.equal(dayAudio(active(5, event), { ok: true, state: { ...active(5, event), missionStatus: "victory" } }), "victory");
});
