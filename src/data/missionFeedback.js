export const resourceLabels = {
  power: "Power",
  oxygen: "Oxygen",
  food: "Food",
  water: "Water",
  radiationRisk: "Radiation risk",
};

export function resourceChanges(before, after) {
  return Object.entries(resourceLabels).flatMap(([key, label]) => {
    const amount = after[key] - before[key];
    if (!amount) return [];
    return [{
      text: `${amount > 0 ? "+" : "−"}${Math.abs(amount)} ${label}`,
      favorable: key === "radiationRisk" ? amount < 0 : amount > 0,
    }];
  });
}
