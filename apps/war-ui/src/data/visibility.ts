export type VisibilityLevel = "NONE" | "KNOWN" | "SCOUTED" | "FULL";

export const visibilityOrder: VisibilityLevel[] = ["NONE", "KNOWN", "SCOUTED", "FULL"];

export function isVisible(level: VisibilityLevel) {
  return level !== "NONE";
}
