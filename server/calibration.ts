/**
 * Calibration test passages and utilities for reading level assessment
 */

export interface CalibrationPassage {
  text: string;
  fleschKincaid: number;
  questions: CalibrationQuestion[];
}

export interface CalibrationQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  type: 'comprehension' | 'vocabulary' | 'inference';
}

/**
 * Sample calibration passages at different difficulty levels
 */
export const CALIBRATION_PASSAGES: CalibrationPassage[] = [
  {
    text: `The sun rises in the east and sets in the west. Every morning, people wake up to see the bright yellow sun climbing into the sky. The sun gives us light and warmth. Without the sun, plants could not grow and animals would have no food. The sun is very important for life on Earth. During the day, the sun moves across the sky. At night, we cannot see it because Earth has turned away from the sun.`,
    fleschKincaid: 3,
    questions: [
      {
        question: "Where does the sun rise?",
        options: ["In the west", "In the east", "In the north", "In the south"],
        correctAnswer: 1,
        type: 'comprehension'
      },
      {
        question: "What does the sun give us?",
        options: ["Rain and snow", "Light and warmth", "Wind and clouds", "Stars and moon"],
        correctAnswer: 1,
        type: 'comprehension'
      },
      {
        question: "Why can't we see the sun at night?",
        options: ["The sun goes away", "Earth has turned away from the sun", "Clouds cover it", "It becomes too small"],
        correctAnswer: 1,
        type: 'inference'
      }
    ]
  },
  {
    text: `Climate change represents one of the most significant challenges facing humanity in the twenty-first century. The accumulation of greenhouse gases in the atmosphere, primarily carbon dioxide from fossil fuel combustion, has led to a measurable increase in global average temperatures. This warming trend has cascading effects on weather patterns, ocean currents, and ecosystems worldwide. Scientists have documented melting ice caps, rising sea levels, and increasingly frequent extreme weather events. The scientific consensus is clear: human activities are the dominant cause of observed warming since the mid-twentieth century.`,
    fleschKincaid: 12,
    questions: [
      {
        question: "What is the primary cause of greenhouse gas accumulation mentioned in the passage?",
        options: ["Natural volcanic activity", "Fossil fuel combustion", "Ocean evaporation", "Plant respiration"],
        correctAnswer: 1,
        type: 'comprehension'
      },
      {
        question: "What does 'cascading effects' most likely mean in this context?",
        options: ["Waterfall-like movements", "A series of connected consequences", "Rapid improvements", "Circular patterns"],
        correctAnswer: 1,
        type: 'vocabulary'
      },
      {
        question: "Based on the passage, what can be inferred about the scientific community's view?",
        options: ["They are uncertain about climate change", "They disagree on the causes", "They largely agree humans are responsible", "They think it's a natural cycle"],
        correctAnswer: 2,
        type: 'inference'
      }
    ]
  }
];

/**
 * Calculate Flesch-Kincaid Grade Level for a text
 * Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
 */
export function calculateFleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const totalSentences = sentences.length;
  const totalWords = words.length;
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  const grade = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Count syllables in a word (simplified algorithm)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i] || '');
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent e
  if (word.endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}

/**
 * Assess reading level based on test results
 * Returns a level from 1-7
 */
export function assessReadingLevel(
  readingTimeSeconds: number,
  correctAnswers: number,
  totalQuestions: number,
  passageDifficulty: number
): number {
  const comprehensionRate = correctAnswers / totalQuestions;
  const wordsPerMinute = calculateWPM(readingTimeSeconds, passageDifficulty);
  
  // Base level on passage difficulty
  let level = Math.round(passageDifficulty / 2);
  
  // Adjust based on comprehension
  if (comprehensionRate >= 0.9) {
    level += 1;
  } else if (comprehensionRate < 0.6) {
    level -= 1;
  }
  
  // Adjust based on reading speed
  if (wordsPerMinute > 250) {
    level += 1;
  } else if (wordsPerMinute < 150) {
    level -= 1;
  }
  
  // Clamp to 1-7 range
  return Math.max(1, Math.min(7, level));
}

/**
 * Calculate words per minute
 */
function calculateWPM(readingTimeSeconds: number, passageDifficulty: number): number {
  // Estimate word count based on difficulty (higher difficulty = longer passages)
  const estimatedWords = 100 + (passageDifficulty * 20);
  const minutes = readingTimeSeconds / 60;
  return Math.round(estimatedWords / minutes);
}

/**
 * Generate strengths and challenges based on question performance
 */
export function analyzePerformance(
  questions: CalibrationQuestion[],
  userAnswers: number[]
): { strengths: string[], challenges: string[] } {
  const performance = {
    comprehension: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    inference: { correct: 0, total: 0 }
  };
  
  questions.forEach((q, i) => {
    const type = q.type;
    performance[type].total++;
    if (userAnswers[i] === q.correctAnswer) {
      performance[type].correct++;
    }
  });
  
  const strengths: string[] = [];
  const challenges: string[] = [];
  
  Object.entries(performance).forEach(([type, stats]) => {
    if (stats.total === 0) return;
    const rate = stats.correct / stats.total;
    if (rate >= 0.8) {
      strengths.push(type);
    } else if (rate < 0.6) {
      challenges.push(type);
    }
  });
  
  return { strengths, challenges };
}
