import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getWordLevelSequence, saveWordLevelSequence, updateMicroLevel } from "./db";
import { invokeLLM } from "./_core/llm";
import type { WordSequenceEntry } from "../drizzle/schema";

const paragraphInput = z.object({
  index: z.number().nonnegative(),
  text: z.string().min(1),
});

export const adaptWordLevelRouter = router({
  /**
   * Get word sequence for a paragraph (contains all 4 levels in JSON)
   */
  getWordSeq: publicProcedure
    .input(
      z.object({
        contentId: z.number().min(1),
        paragraphIndex: z.number().nonnegative(),
      })
    )
    .query(async ({ input }) => {
      const row = await getWordLevelSequence(
        input.contentId,
        input.paragraphIndex
      );
      return row?.wordSequence ?? [];
    }),

  /**
   * Save user's microLevel preference (1.0 - 4.0)
   */
  saveMicroLevel: protectedProcedure
    .input(
      z.object({
        microLevel: z.number().min(1).max(4),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateMicroLevel(ctx.user.id, input.microLevel);
      return { success: true };
    }),

  /**
   * Pre-generate word-level variants for paragraphs (one-time batch)
   */
  preGenWordLevels: protectedProcedure
    .input(
      z.object({
        contentId: z.number().min(1),
        paragraphs: z.array(paragraphInput).min(1),
      })
    )
    .mutation(async ({ input }) => {
      for (const paragraph of input.paragraphs) {
        const sequence = await generateWordSequence(paragraph.text);
        await saveWordLevelSequence({
          contentId: input.contentId,
          paragraphIndex: paragraph.index,
          wordSequence: sequence,
        });
      }
      return { done: true, count: input.paragraphs.length };
    }),
});

async function generateWordSequence(paragraph: string): Promise<WordSequenceEntry[]> {
  const prompt = `Split this paragraph into individual words.
For each word give four versions:
- level1 (grade 1–2)
- level2 (grade 5–6)
- level3 (grade 8–9)
- level4 (original wording)

Return strictly valid JSON array in this format (no commentary):
[
  {"word":"quick","level1":"fast","level2":"rapid","level3":"swift","level4":"expeditious"}
]

Paragraph:
${paragraph}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a linguistic expert who rewrites words for different reading levels and always responds with valid JSON arrays.",
      },
      { role: "user", content: prompt },
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  const raw = typeof messageContent === "string" ? messageContent : "";

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonPayload = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonPayload);
    if (Array.isArray(parsed)) {
      return parsed.filter(isWordSequenceEntry);
    }
  } catch (error) {
    console.error("Failed to parse word sequence JSON", error, raw);
  }

  return [];
}

function isWordSequenceEntry(entry: any): entry is WordSequenceEntry {
  return (
    entry &&
    typeof entry.word === "string" &&
    typeof entry.level1 === "string" &&
    typeof entry.level2 === "string" &&
    typeof entry.level3 === "string" &&
    typeof entry.level4 === "string"
  );
}
