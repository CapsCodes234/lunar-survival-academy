/**
 * Short teaching notes shown in the building panel.
 * nasaSource stays null until a teammate verifies a source on the official
 * challenge Resources list and records it in NASA_SOURCES.md.
 * Game numbers mentioned elsewhere are fictional balance values.
 */
export const educationalContent = {
  habitat: {
    concept: "Surface radiation and shelter",
    summary:
      "The Moon has no substantial atmosphere and no global magnetic field, so a habitat has to provide the crew's radiation shelter. Covering a shelter with lunar soil is one engineering idea teams study.",
    gameMechanic: "Prepare Radiation Shelter lowers radiation risk and spends power.",
    simplification:
      "The risk meter and the 20-point shelter effect are fictional game values, not a radiation dose.",
    nasaSource: null,
    sourceStatus: "unverified",
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
