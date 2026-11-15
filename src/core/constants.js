/**
 * Fictional gameplay numbers for Lunar Survival Academy.
 * These are balance values for the training game. They are not NASA measurements.
 */

export const RESOURCE_MAX = 100;
export const RADIATION_MIN = 0;
export const RADIATION_MAX = 100;

export const TRACKED_RESOURCES = ["power", "oxygen", "food", "water"];

export const INITIAL_RESOURCES = {
  power: 48,
  oxygen: 30,
  food: 27,
  water: 46,
  radiationRisk: 35,
};

export const STARTING_DAY = 1;
export const MAX_DAYS = 5;
export const ACTIONS_PER_DAY = 2;

export const MISSION_STATUS = {
  active: "active",
  victory: "victory",
  defeat: "defeat",
};

/**
 * Amounts subtracted once, at the end of each day, before greenhouse upkeep.
 * Fictional daily consumption, not a life-support measurement.
 */
export const DAILY_CONSUMPTION = {
  power: 5,
  oxygen: 7,
  food: 6,
  water: 3,
};

export const SOLAR_MAINTAIN_POWER = 20;
export const OXYGEN_GAIN = 20;
export const OXYGEN_POWER_COST = 10;
export const SHELTER_RADIATION_RELIEF = 20;
export const SHELTER_POWER_COST = 8;

export const GREENHOUSE = {
  growthTurnsRequired: 2,
  upkeepPower: 7,
  upkeepWater: 4,
  plantPower: 6,
  plantWater: 8,
  carePower: 4,
  careWater: 5,
  harvestFood: 22,
  caredHarvestFood: 30,
};

export const SOLAR_RADIATION_EVENT = {
  id: "solar-radiation-warning",
  title: "Solar Radiation Warning",
  day: 3,
  radiationIncrease: 65,
};

/**
 * End-of-day work always runs in this order inside resolveEndOfDay().
 * Daily costs are applied once. The day number advances only if the colony survives
 * and the completed day is earlier than day 5.
 */
export const END_OF_DAY_ORDER = [
  "Confirm the mission is active",
  "Apply daily colony consumption",
  "Process greenhouse upkeep and growth",
  "Apply any scheduled mission event",
  "Evaluate victory or defeat",
  "Advance the day when the colony survives before day 5",
  "Reset the action count for the next day",
];
