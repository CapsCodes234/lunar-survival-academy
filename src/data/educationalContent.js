export const donkiObservation = Object.freeze({
  sourceName: "NASA Community Coordinated Modeling Center (CCMC) — DONKI",
  notificationTitle: "Auto-generated Space Weather Notification - SEP",
  notificationId: "20260730-AL-005",
  eventType: "solar energetic particle (SEP)",
  observedAt: "2026-07-30T18:45:00Z",
  issuedAt: "2026-07-30T18:53:31Z",
  observation: Object.freeze({
    instrument: "GOES",
    energyThresholdMeV: 10,
    fluxThresholdPfu: 10,
  }),
  sourceUrl: "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/47880/1",
  limitations: "GOES measured particle flux near Earth. A lunar surface dose would need separate data. This archived alert is historical, and the game calculates fictional risk points independently.",
});

const utcDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function describeDonkiObservation() {
  const { observedAt, observation, eventType } = donkiObservation;
  const { instrument, energyThresholdMeV, fluxThresholdPfu } = observation;
  return `On ${utcDateTime.format(new Date(observedAt))}, ${instrument} detected a ${eventType} event. The flux of protons with energies above ${energyThresholdMeV} MeV exceeded ${fluxThresholdPfu} particle flux units (pfu).`;
}

/** Short teaching notes shown in the building panel. */
export const educationalContent = {
  habitat: {
    concept: "Surface radiation and shelter",
    summary:
      "Fast particles from the Sun can expose astronauts to radiation. Extra shielding in a shelter helps protect the crew during a solar particle event.",
    gameMechanic: "Prepare Radiation Shelter lowers radiation risk and spends power.",
    simplification:
      "The risk meter and the 20-point shelter effect are fictional game values, not a radiation dose.",
    nasaSource: donkiObservation,
    sourceStatus: "verified",
  },
  oxygen: {
    concept: "Life support and power trade-offs",
    summary:
      "A crew needs a steady oxygen supply, and the equipment that provides it also needs power. Running life support harder leaves less electricity for other systems.",
    gameMechanic: "Operate Oxygen System gains oxygen and spends power.",
    simplification:
      "The oxygen gain and power cost are fictional game values, not a measured electrolyzer rate.",
    nasaSource: null,
    sourceStatus: "unverified",
  },
  greenhouse: {
    concept: "Growing food in a controlled habitat",
    summary:
      "Plants can grow inside a controlled habitat, but they need power, water, and time. Missing a care step does not destroy the crop in this training model. It only lowers the harvest.",
    gameMechanic: "Plant lettuce, care for it while it grows, then harvest food.",
    simplification:
      "Two growth days, upkeep costs, and harvest amounts are fictional game values.",
    nasaSource: null,
    sourceStatus: "unverified",
  },
  solar: {
    concept: "Power from sunlight",
    summary:
      "A lunar settlement can turn sunlight into electricity, and the arrays need maintenance. In this game, maintenance restores stored power. It is not a live model of solar generation.",
    gameMechanic: "Maintain Solar Array restores power, up to the meter maximum.",
    simplification:
      "The 20-point restoration is a fictional game value, not an electrical measurement.",
    nasaSource: null,
    sourceStatus: "unverified",
  },
};

export const shortageGuidance = {
  power: {
    impact: "Life support and the greenhouse need electricity.",
    action: "Use Maintain Solar Array.",
  },
  oxygen: {
    impact: "The crew needs oxygen to breathe.",
    action: "Save power for Operate Oxygen System.",
  },
  food: {
    impact: "The crew needs food every day.",
    action: "Plant lettuce early and harvest it after two days of growth.",
  },
  water: {
    impact: "The crew and growing crops both need water.",
    action: "Save water by skipping optional crop care or extra plantings.",
  },
  radiationRisk: {
    impact: "Shelter reduces the crew’s exposure during a solar storm.",
    action: "Use Prepare Radiation Shelter in the Habitat before ending Day 3.",
  },
};
