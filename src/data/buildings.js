/**
 * Single source for building identity, copy, and map positions.
 * Phaser and the HTML panel both read this list.
 * x/y are ground contact positions inside the 1280×720 game scene.
 * approachX/approachY is where an astronaut stops to interact.
 */
export const buildings = [
  {
    id: "habitat",
    name: "Lunar Habitat",
    shortName: "Habitat",
    type: "habitat",
    summary: "Crew shelter and radiation protection.",
    x: 448,
    y: 324,
    padWidth: 233,
    approachX: 500,
    approachY: 390,
    color: 0xd7b48a,
    accent: 0x8d5a3c,
  },
  {
    id: "oxygen",
    name: "Oxygen Station",
    shortName: "Oxygen",
    type: "oxygen",
    summary: "Oxygen production and life-support management.",
    x: 822,
    y: 324,
    padWidth: 234,
    approachX: 780,
    approachY: 390,
    color: 0x5ec2b7,
    accent: 0x1e6e68,
  },
  {
    id: "greenhouse",
    name: "Hydroponic Greenhouse",
    shortName: "Greenhouse",
    type: "greenhouse",
    summary: "Planting, crop growth, and food harvesting.",
    x: 410,
    y: 538,
    padWidth: 233,
    approachX: 520,
    approachY: 530,
    color: 0x7dba64,
    accent: 0x2f6b3a,
  },
  {
    id: "solar",
    name: "Solar Power Station",
    shortName: "Solar",
    type: "solar",
    summary: "Electricity generation and array maintenance.",
    x: 864,
    y: 538,
    padWidth: 262,
    approachX: 760,
    approachY: 530,
    color: 0xe6c15a,
    accent: 0x8a5a12,
  },
];

export function getBuildingById(buildingId) {
  return buildings.find((building) => building.id === buildingId) ?? null;
}
