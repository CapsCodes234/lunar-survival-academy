function tone(at, duration, from, to, level, wave = "sine", cutoff) {
  return { at, duration, from, to, level, wave, cutoff };
}

const radiation = [
  tone(0, 0.19, 430, 415, 0.19, "triangle"),
  tone(0.29, 0.24, 430, 385, 0.17, "triangle"),
];
const defeat = [
  tone(0, 0.26, 330, 294, 0.20),
  tone(0.20, 0.32, 262, 233, 0.20, "triangle"),
  tone(0.41, 0.45, 196, 174, 0.17),
];

export const soundDefinitions = {
  select: { priority: 0, tones: [tone(0, 0.11, 420, 340, 0.17, "triangle")] },
  task: { priority: 0, tones: [tone(0, 0.13, 515, 590, 0.12)] },
  reject: { priority: 1, tones: [tone(0, 0.17, 322, 205, 0.18, "triangle")] },
  oxygen: { priority: 1, tones: [
    tone(0, 0.23, 240, 465, 0.21, "triangle", 920),
    tone(0.06, 0.18, 490, 620, 0.09),
  ] },
  greenhouse: { priority: 1, tones: [
    tone(0, 0.13, 285, 420, 0.17),
    tone(0.075, 0.19, 390, 549, 0.18),
  ] },
  solar: { priority: 1, tones: [
    tone(0, 0.29, 132, 290, 0.21),
    tone(0.06, 0.25, 220, 440, 0.15, "triangle"),
  ] },
  habitat: { priority: 1, tones: [
    tone(0, 0.32, 160, 205, 0.24, "triangle"),
    tone(0.04, 0.25, 320, 408, 0.11),
  ] },
  harvest: { priority: 1, tones: [
    tone(0, 0.22, 392, 392, 0.19),
    tone(0.10, 0.22, 494, 494, 0.19),
    tone(0.20, 0.24, 587, 587, 0.18, "triangle"),
    tone(0.31, 0.38, 784, 784, 0.15),
  ] },
  day: { priority: 2, tones: [
    tone(0, 0.37, 182, 395, 0.21, "triangle"),
    tone(0.10, 0.36, 360, 186, 0.10),
  ] },
  radiation: { priority: 3, tones: radiation },
  radiationDefeat: { priority: 3, tones: [
    ...radiation, ...defeat.map((note) => ({ ...note, at: note.at + 0.57 })),
  ] },
  victory: { priority: 3, tones: [
    tone(0, 0.34, 262, 262, 0.19, "triangle"),
    tone(0.16, 0.35, 330, 330, 0.20),
    tone(0.32, 0.37, 392, 392, 0.20),
    tone(0.54, 0.86, 523, 523, 0.22, "triangle"),
    tone(0.56, 0.71, 659, 659, 0.10),
    tone(0.60, 0.75, 784, 784, 0.09),
  ] },
  defeat: { priority: 3, tones: defeat },
};
