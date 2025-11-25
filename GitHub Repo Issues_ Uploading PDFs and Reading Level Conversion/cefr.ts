/**
 * CEFR (Common European Framework of Reference) classification utilities
 * Maps reading levels to CEFR labels and provides text classification
 */

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/**
 * Map our internal reading level (1-4) to CEFR level
 */
export function mapLevelToCEFR(level: number): CEFRLevel {
  if (level <= 1) return "A1";
  if (level <= 2) return "A2";
  if (level <= 3) return "B1";
  if (level <= 4) return "B2";
  return "B2"; // Default for higher levels
}

/**
 * Get CEFR level description
 */
export function getCEFRDescription(level: CEFRLevel): string {
  const descriptions: Record<CEFRLevel, string> = {
    A1: "Beginner - Can understand and use familiar everyday expressions",
    A2: "Elementary - Can understand sentences and frequently used expressions",
    B1: "Intermediate - Can understand the main points of clear standard input",
    B2: "Upper Intermediate - Can understand the main ideas of complex text",
    C1: "Advanced - Can understand a wide range of demanding texts",
    C2: "Proficient - Can understand with ease virtually everything",
  };
  return descriptions[level];
}

/**
 * Simple CEFR classification based on text characteristics
 * This is a heuristic-based approach. For more accurate classification,
 * integrate with a trained CEFR classifier model.
 */
export function classifyTextCEFR(text: string): CEFRLevel {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
  
  // Count complex words (3+ syllables approximation: words with 3+ vowels)
  const complexWords = text
    .split(/\s+/)
    .filter(word => {
      const vowels = word.match(/[aeiouAEIOU]/g)?.length || 0;
      return vowels >= 3;
    }).length;
  const complexWordRatio = words > 0 ? complexWords / words : 0;

  // Simple heuristic classification
  if (avgWordsPerSentence < 10 && complexWordRatio < 0.1) {
    return "A1";
  }
  if (avgWordsPerSentence < 15 && complexWordRatio < 0.15) {
    return "A2";
  }
  if (avgWordsPerSentence < 20 && complexWordRatio < 0.25) {
    return "B1";
  }
  if (avgWordsPerSentence < 25 && complexWordRatio < 0.35) {
    return "B2";
  }
  return "C1";
}

/**
 * Cache for CEFR classifications to avoid redundant calculations
 */
const cefrCache = new Map<string, CEFRLevel>();

/**
 * Classify text with caching
 */
export function classifyTextCEFRCached(text: string): CEFRLevel {
  // Use first 500 chars as cache key to avoid storing full text
  const cacheKey = text.substring(0, 500).trim();
  
  if (cefrCache.has(cacheKey)) {
    return cefrCache.get(cacheKey)!;
  }
  
  const level = classifyTextCEFR(text);
  cefrCache.set(cacheKey, level);
  
  // Limit cache size
  if (cefrCache.size > 1000) {
    const firstKey = cefrCache.keys().next().value;
    cefrCache.delete(firstKey);
  }
  
  return level;
}

