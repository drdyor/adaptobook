/**
 * useWordLevelMorph Hook
 * Morphs word sequences based on the current microLevel
 * Returns the text string at the appropriate difficulty level
 */

import { useMemo } from "react";

export interface WordSequenceEntry {
  word: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
}

/**
 * Given a word sequence array and a microLevel (1.0-4.0),
 * returns the morphed text string at the appropriate level
 */
export function useWordLevelMorph(
  wordSequence: WordSequenceEntry[] | undefined | null,
  microLevel: number
): string {
  return useMemo(() => {
    if (!wordSequence || wordSequence.length === 0) {
      return "";
    }

    // Clamp to valid bounds before snapping to nearest integer level
    const clampedLevel = Math.min(4, Math.max(1, microLevel));
    const cacheLevel = Math.round(clampedLevel) as 1 | 2 | 3 | 4;
    const levelKey = `level${cacheLevel}` as keyof WordSequenceEntry;

    return wordSequence
      .map((entry) => entry[levelKey] || entry.word)
      .join(" ");
  }, [wordSequence, microLevel]);
}

/**
 * Get CSS variables for typography physics based on microLevel
 */
export function getTypographyVars(microLevel: number) {
  // Map microLevel (1-4) to typography values
  const clampedLevel = Math.min(4, Math.max(1, microLevel));
  const t = (clampedLevel - 1) / 3; // normalize to 0-1

  return {
    "--wght": Math.round(200 + t * 700), // 200 → 900
    "--grade": Math.round(-50 + t * 100), // -50 → +50
    "--opsz": Math.round(10 + t * 30), // 10 → 40
    "--lh": (1.8 - t * 0.6).toFixed(2), // 1.8 → 1.2
    "--ls": `${(0.04 - t * 0.05).toFixed(3)}em`, // 0.04em → -0.01em
  };
}

/**
 * Trigger haptic feedback based on microLevel
 */
export function triggerHaptic(microLevel: number) {
  if ("vibrate" in navigator) {
    navigator.vibrate([Math.round(microLevel * 20)]);
  }
}
