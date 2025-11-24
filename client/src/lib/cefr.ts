/**
 * CEFR (Common European Framework of Reference) utilities for client-side
 */

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/**
 * Map reading level (1-4) to CEFR level
 */
export function mapLevelToCEFR(level: number): CEFRLevel {
  if (level <= 1) return "A1";
  if (level <= 2) return "A2";
  if (level <= 3) return "B1";
  if (level <= 4) return "B2";
  return "B2";
}

/**
 * Get CEFR level description
 */
export function getCEFRDescription(level: CEFRLevel): string {
  const descriptions: Record<CEFRLevel, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper Intermediate",
    C1: "Advanced",
    C2: "Proficient",
  };
  return descriptions[level];
}

/**
 * Get CEFR level color for badges
 */
export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "bg-blue-500",
    A2: "bg-green-500",
    B1: "bg-yellow-500",
    B2: "bg-orange-500",
    C1: "bg-red-500",
    C2: "bg-purple-500",
  };
  return colors[level];
}

