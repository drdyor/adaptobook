/**
 * Batch Generation Script for "The Prince"
 * Generates 4 difficulty level variants for each paragraph
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { invokeLLM } = require('../server/_core/llm.ts');

interface Chapter {
  number: number;
  title: string;
  paragraphs: string[];
}

interface ExtractedContent {
  title: string;
  author: string;
  chapters: Chapter[];
}

interface ParagraphVariant {
  chapterNumber: number;
  paragraphIndex: number;
  level: number;
  text: string;
  originalText: string;
}

interface VariantsOutput {
  title: string;
  author: string;
  totalChapters: number;
  totalParagraphs: number;
  levels: number;
  variants: ParagraphVariant[];
}

const LEVEL_DESCRIPTIONS = {
  1: {
    name: "Elementary (Grade 1-2)",
    description: "1st-2nd grade level with very simple sentences (5-8 words), basic vocabulary, and concrete concepts"
  },
  2: {
    name: "Early Elementary (Grade 3-4)",
    description: "3rd-4th grade level with simple sentences (8-12 words), common vocabulary, and straightforward ideas"
  },
  3: {
    name: "Upper Elementary (Grade 5-6)",
    description: "5th-6th grade level with moderate sentences (12-15 words), age-appropriate vocabulary, and some abstract concepts"
  },
  4: {
    name: "Middle School (Grade 7-8)",
    description: "7th-8th grade level with varied sentences (15-18 words), expanded vocabulary, and more complex ideas"
  }
};

async function generateVariantForParagraph(
  originalText: string,
  targetLevel: number,
  chapterNumber: number,
  paragraphIndex: number
): Promise<string> {
  const levelInfo = LEVEL_DESCRIPTIONS[targetLevel as keyof typeof LEVEL_DESCRIPTIONS];
  
  const prompt = `You are an expert reading specialist. Rewrite the following text from "The Prince" by Machiavelli to match a ${levelInfo.description} reading level.

IMPORTANT RULES:
1. Preserve all key information and main ideas
2. Maintain the same meaning and factual accuracy
3. Adjust vocabulary complexity to match the target level
4. Adjust sentence structure and length appropriately
5. For lower levels, break complex ideas into simpler steps
6. Keep the historical and political context accurate
7. Do NOT add explanations or commentary - just rewrite the text
8. Output ONLY the rewritten text, nothing else

Original text:
${originalText}

Rewritten text at ${levelInfo.name}:`;

  try {
    const response = await invokeLLM({
      messages: [
        { 
          role: "system", 
          content: "You are an expert reading specialist who adapts text to different reading levels while preserving meaning. Always respond with ONLY the rewritten text, no additional commentary."
        },
        { role: "user", content: prompt }
      ]
    });

    const messageContent = response.choices[0]?.message?.content;
    return typeof messageContent === 'string' ? messageContent.trim() : originalText;
  } catch (error) {
    console.error(`❌ Error generating variant for Chapter ${chapterNumber}, Paragraph ${paragraphIndex}, Level ${targetLevel}:`, error);
    return originalText;
  }
}

async function generateAllVariants(): Promise<void> {
  const inputPath = path.join(process.cwd(), 'content', 'the-prince-cleaned.json');
  const outputPath = path.join(process.cwd(), 'content', 'the-prince-variants.json');

  console.log('🚀 Starting batch generation of paragraph variants...\n');
  
  const extractedContent: ExtractedContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  
  // Calculate total work
  const totalParagraphs = extractedContent.chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0);
  const totalVariants = totalParagraphs * 4; // 4 levels per paragraph
  
  console.log(`📊 Generation Plan:`);
  console.log(`   - Chapters: ${extractedContent.chapters.length}`);
  console.log(`   - Paragraphs: ${totalParagraphs}`);
  console.log(`   - Variants to generate: ${totalVariants} (${totalParagraphs} paragraphs × 4 levels)`);
  console.log(`   - Estimated cost: $${(totalVariants * 0.002).toFixed(2)} (rough estimate)\n`);

  const variants: ParagraphVariant[] = [];
  let completed = 0;

  // Process each chapter
  for (const chapter of extractedContent.chapters) {
    console.log(`\n📖 Processing Chapter ${chapter.number}: "${chapter.title}"`);
    console.log(`   Paragraphs: ${chapter.paragraphs.length}\n`);

    // Process each paragraph in the chapter
    for (let pIndex = 0; pIndex < chapter.paragraphs.length; pIndex++) {
      const originalText = chapter.paragraphs[pIndex];
      
      console.log(`   Paragraph ${pIndex + 1}/${chapter.paragraphs.length}:`);

      // Generate all 4 levels for this paragraph
      for (let level = 1; level <= 4; level++) {
        process.stdout.write(`      Level ${level}... `);
        
        const variantText = await generateVariantForParagraph(
          originalText,
          level,
          chapter.number,
          pIndex
        );

        variants.push({
          chapterNumber: chapter.number,
          paragraphIndex: pIndex,
          level,
          text: variantText,
          originalText: level === 4 ? originalText : ''
        });

        completed++;
        const progress = ((completed / totalVariants) * 100).toFixed(1);
        console.log(`✓ [${progress}% complete]`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  const output: VariantsOutput = {
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    totalChapters: extractedContent.chapters.length,
    totalParagraphs,
    levels: 4,
    variants
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n\n✅ Generation complete!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`\n📊 Final Summary:`);
  console.log(`   - Total variants generated: ${variants.length}`);
  console.log(`   - File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`\n💰 Cost Analysis:`);
  console.log(`   - LLM calls made: ${totalVariants}`);
  console.log(`   - One-time generation cost: ~$${(totalVariants * 0.002).toFixed(2)}`);
  console.log(`   - Per-read cost with pre-generation: $0.00 (instant switching!)`);
}

// Run generation
generateAllVariants().catch(error => {
  console.error('❌ Fatal error during generation:', error);
  process.exit(1);
});

