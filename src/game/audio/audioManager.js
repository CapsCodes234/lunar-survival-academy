import { soundDefinitions } from "./soundDefinitions.js";

const STORAGE_KEY = "lunar-survival-audio";
const DEFAULTS = { enabled: true, volume: 0.4, ambience: false };
const FLOOR = 0.0001;

function normalize(options) {
  const { enabled, volume, ambience } = options ?? {};
  return {
    enabled: typeof enabled === "boolean" ? enabled : DEFAULTS.enabled,
    volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULTS.volume,
    ambience: typeof ambience === "boolean" ? ambience : DEFAULTS.ambience,
  };
}

function ramp(param, target, now, timeConstant) {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(target, now, timeConstant);
}

export function createAudioManager({
  Context = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  storage,
  now = () => performance.now(),
} = {}) {
  const listeners = new Set();
  const voices = new Set();
  let preferences = DEFAULTS;
  try {
    storage ??= globalThis.localStorage;
    preferences = normalize(JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    // Settings remain usable in memory when storage is blocked or invalid.
  }

  let context;
  let master;
  let effects;
  let activeCue;
  let ambientVoice;
  let pendingCue;
  let lastCueAt = -Infinity;
  let lastResumeAt = -Infinity;
  let unavailable = typeof Context !== "function";
  let visible = true;
  let sceneActive = true;
  let destroyed = false;

  function getState() {
    let status = "locked";
    if (unavailable || destroyed) status = "unavailable";
    else if (!preferences.enabled) status = "muted";
    else if (context?.state === "running") status = "ready";
    return { ...preferences, status };
  }

  function notify() {
    const snapshot = getState();
    for (const listener of listeners) listener(snapshot);
  }

  function createVoice(destination, level) {
    const gain = context.createGain();
    gain.gain.value = level;
    gain.connect(destination);
    const voice = { gain, nodes: new Set(), stopping: false };
    voices.add(voice);
    return voice;
  }

  function addOscillator(voice, waveform, cutoff) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    const filter = cutoff ? context.createBiquadFilter() : null;
    if (filter) {
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      filter.Q.value = 0.4;
      oscillator.connect(filter);
      filter.connect(envelope);
    } else {
      oscillator.connect(envelope);
    }
    envelope.connect(voice.gain);
    voice.nodes.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter?.disconnect();
      envelope.disconnect();
      voice.nodes.delete(oscillator);
      if (voice.nodes.size) return;
      voice.gain.disconnect();
      voices.delete(voice);
      if (activeCue === voice) activeCue = null;
      if (ambientVoice === voice) {
        ambientVoice = null;
        guard(syncAmbience)();
      }
    };
    return { oscillator, envelope: envelope.gain };
  }

  function stopVoice(voice, fade = 0.038) {
    if (!voice || voice.stopping) return;
    voice.stopping = true;
    const time = context.currentTime;
    ramp(voice.gain.gain, 0, time, fade / 5);
    for (const oscillator of voice.nodes) oscillator.stop(time + fade);
  }

  function stopEffects() {
    pendingCue = null;
    for (const voice of voices) if (voice !== ambientVoice) stopVoice(voice);
    activeCue = null;
    lastCueAt = -Infinity;
  }

  function syncAmbience() {
    if (destroyed || !context) return;
    const wanted = visible && sceneActive && preferences.enabled && preferences.ambience && context.state === "running";
    if (!wanted) {
      stopVoice(ambientVoice, 0.32);
      return;
    }
    if (ambientVoice) return;

    ambientVoice = createVoice(master, 0);
    const time = context.currentTime;
    for (const [frequency, level] of [[58, 0.65], [87, 0.29]]) {
      const { oscillator, envelope } = addOscillator(ambientVoice, "sine");
      oscillator.frequency.value = frequency;
      envelope.value = level;
      oscillator.start(time);
    }
    ramp(ambientVoice.gain.gain, 0.014, time, 0.14);
  }

  function play(cue, { spentOnly = false } = {}) {
    if (!cue || !Object.hasOwn(soundDefinitions, cue) || unavailable || destroyed
        || !visible || !sceneActive || !preferences.enabled || !preferences.volume) return;
    if (context?.state !== "running") {
      pendingCue = { cue, spentOnly, at: now() };
      return;
    }

    const { priority, tones } = soundDefinitions[cue];
    if (activeCue && (activeCue.priority > priority
        || (activeCue.priority === priority && now() - lastCueAt < 85))) return;
    stopVoice(activeCue);
    lastCueAt = now();
    const voice = createVoice(effects, 1);
    voice.priority = priority;
    activeCue = voice;
    const time = context.currentTime + 0.006;
    for (const [index, note] of tones.entries()) {
      const start = time + note.at;
      const end = start + note.duration;
      const { oscillator, envelope } = addOscillator(voice, note.wave, note.cutoff);
      oscillator.frequency.setValueAtTime(note.from, start);
      const target = spentOnly && index === tones.length - 1 ? note.to * 0.79 : note.to;
      oscillator.frequency.exponentialRampToValueAtTime(target, end);
      envelope.setValueAtTime(FLOOR, start);
      envelope.linearRampToValueAtTime(note.level, start + 0.018);
      envelope.exponentialRampToValueAtTime(FLOOR, end);
      oscillator.start(start);
      oscillator.stop(end + 0.008);
    }
  }

  function onContextChange() {
    if (destroyed || unavailable) return;
    if (context.state === "closed") {
      disableAudio();
      return;
    }
    if (context.state === "running") {
      const next = pendingCue;
      pendingCue = null;
      if (next && now() - next.at < 450) guard(play)(next.cue, next);
    } else if (activeCue) {
      guard(stopEffects)();
    }
    guard(syncAmbience)();
    notify();
  }

  function unlock(event) {
    if (!event?.isTrusted || unavailable || destroyed || !visible || !sceneActive || !preferences.enabled) return;
    try {
      if (!context) {
        context = new Context();
        master = context.createGain();
        effects = context.createGain();
        effects.gain.value = preferences.volume * 0.72;
        effects.connect(master);
        master.connect(context.destination);
        context.addEventListener("statechange", onContextChange);
        onContextChange();
      }
      if (unavailable || context.state === "running" || now() - lastResumeAt < 250) return;
      lastResumeAt = now();
      // A denied resume leaves the game playable. Another trusted gesture can retry.
      Promise.resolve(context.resume()).then(onContextChange, notify);
    } catch {
      disableAudio();
    }
  }

  function setPreferences(patch) {
    preferences = normalize({ ...preferences, ...patch });
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* session only */ }
    if (master && !unavailable && !destroyed) {
      const time = context.currentTime;
      ramp(master.gain, preferences.enabled ? 1 : 0, time, 0.023);
      ramp(effects.gain, preferences.volume * 0.72, time, 0.025);
    }
    if (!preferences.enabled || !preferences.volume) stopEffects();
    syncAmbience();
    notify();
  }

  function closeContext() {
    const closing = context;
    const output = master;
    context = null;
    master = null;
    effects = null;
    activeCue = null;
    ambientVoice = null;
    pendingCue = null;
    voices.clear();
    if (!closing) return;
    try {
      closing.removeEventListener("statechange", onContextChange);
      output?.disconnect();
      if (closing.state !== "closed") Promise.resolve(closing.close()).catch(() => {});
    } catch { /* A failed audio device is already silent. */ }
  }

  function disableAudio() {
    unavailable = true;
    closeContext();
    notify();
  }

  function guard(operation) {
    return (...args) => {
      if (destroyed) return;
      try { return operation(...args); } catch { disableAudio(); }
    };
  }

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPreferences: guard(setPreferences),
    unlock,
    play: guard(play),
    stopEffects: guard(stopEffects),
    setVisible: guard((value) => {
      visible = value;
      if (!visible) stopEffects();
      syncAmbience();
    }),
    setSceneActive: guard((value) => {
      sceneActive = value;
      if (!sceneActive) stopEffects();
      syncAmbience();
    }),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      closeContext();
    },
  };
}
