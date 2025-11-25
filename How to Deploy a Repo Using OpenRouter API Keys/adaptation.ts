/**
 * Content adaptation engine for adjusting text difficulty using LLM
 */

import { invokeLLM } from "./_core/llm";

export interface AdaptedContent {
  text: string;
  level: number;
  paragraphs: string[];
}

/**
 * Adapt text to a specific difficulty level (1-7)
 * Level 1: Elementary (Grade 1-2)
 * Level 2: Early Elementary (Grade 3-4)
 * Level 3: Upper Elementary (Grade 5-6)
 * Level 4: Middle School (Grade 7-8)
 * Level 5: High School (Grade 9-10)
 * Level 6: Advanced High School (Grade 11-12)
 * Level 7: College/Adult (Grade 13+)
 */
export async function adaptTextToLevel(
  originalText: string,
  targetLevel: number
): Promise<AdaptedContent> {
  const levelDescriptions = {
    1: "1st-2nd grade level with very simple sentences (5-8 words), basic vocabulary, and concrete concepts",
    2: "3rd-4th grade level with simple sentences (8-12 words), common vocabulary, and straightforward ideas",
    3: "5th-6th grade level with moderate sentences (12-15 words), age-appropriate vocabulary, and some abstract concepts",
    4: "7th-8th grade level with varied sentences (15-18 words), expanded vocabulary, and more complex ideas",
    5: "9th-10th grade level with sophisticated sentences (18-22 words), academic vocabulary, and nuanced concepts",
    6: "11th-12th grade level with complex sentences (22-25 words), advanced vocabulary, and abstract reasoning",
    7: "college/adult level with intricate sentences (25+ words), specialized vocabulary, and sophisticated analysis"
  };

  const prompt = `You are an expert reading specialist. Rewrite the following text to match a ${levelDescriptions[targetLevel as keyof typeof levelDescriptions]} reading level.

IMPORTANT RULES:
1. Preserve all key information and main ideas
2. Maintain the same meaning and factual accuracy
3. Adjust vocabulary complexity to match the target level
4. Adjust sentence structure and length appropriately
5. Break complex ideas into simpler steps for lower levels
6. Use more sophisticated language and structure for higher levels
7. Keep the same general length (number of paragraphs)
8. Do NOT add explanations or commentary - just rewrite the text

Original text:
${originalText}

Rewritten text at target level:`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert reading specialist who adapts text to different reading levels while preserving meaning." },
      { role: "user", content: prompt }
    ]
  });

  const messageContent = response.choices[0]?.message?.content;
  const adaptedText = typeof messageContent === 'string' ? messageContent : originalText;
  
  // Split into paragraphs
  const paragraphs = adaptedText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return {
    text: adaptedText,
    level: targetLevel,
    paragraphs
  };
}

/**
 * Adapt a single paragraph to a specific difficulty level
 * Used for progressive difficulty adjustment
 */
export async function adaptParagraph(
  paragraph: string,
  currentLevel: number,
  targetLevel: number
): Promise<string> {
  if (currentLevel === targetLevel) {
    return paragraph;
  }

  const direction = targetLevel > currentLevel ? "increase" : "decrease";
  const levelChange = Math.abs(targetLevel - currentLevel);

  const prompt = `${direction === "increase" ? "Increase" : "Decrease"} the reading difficulty of this paragraph by ${levelChange} grade level(s).

Rules:
- Preserve the exact meaning and information
- ${direction === "increase" ? "Use more sophisticated vocabulary and complex sentence structures" : "Use simpler words and shorter sentences"}
- Keep approximately the same length
- Do NOT add new information or explanations

Original paragraph:
${paragraph}

Rewritten paragraph:`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert at adjusting text difficulty while preserving meaning." },
      { role: "user", content: prompt }
    ]
  });

  const messageContent = response.choices[0]?.message?.content;
  return typeof messageContent === 'string' ? messageContent : paragraph;
}

/**
 * Generate comprehension questions for a paragraph
 */
export async function generateComprehensionQuestions(
  paragraph: string,
  count: number = 2
): Promise<Array<{ question: string; options: string[]; correctAnswer: number }>> {
  const prompt = `Generate ${count} multiple-choice comprehension questions for this paragraph.

Paragraph:
${paragraph}

Return ONLY a JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Rules:
- correctAnswer is the index (0-3) of the correct option
- Questions should test understanding, not just recall
- Make distractors plausible but clearly wrong
- Return ONLY the JSON array, no other text`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert at creating comprehension questions. Always respond with valid JSON only." },
      { role: "user", content: prompt }
    ]
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = typeof messageContent === 'string' ? messageContent : "[]";
  
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "[]";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse comprehension questions:", error);
    return [];
  }
}

/**
 * Split text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
