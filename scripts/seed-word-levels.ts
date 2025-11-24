/**
 * Seed Word-Level Data for Mind-Reader Slider
 * Converts paragraph-level text into word sequences for morphing
 */

import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/mysql2';
import { wordLevel, contentLibrary, WordSequenceEntry } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface ParagraphData {
  paragraphIndex: number;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
}

/**
 * Convert paragraph-level text into word sequences
 * Each word gets 4 level variants
 */
function convertToWordSequence(paragraph: ParagraphData): WordSequenceEntry[] {
  const words1 = paragraph.level1.split(/\s+/);
  const words2 = paragraph.level2.split(/\s+/);
  const words3 = paragraph.level3.split(/\s+/);
  const words4 = paragraph.level4.split(/\s+/);

  // Use the longest version as base
  const maxLen = Math.max(words1.length, words2.length, words3.length, words4.length);
  const sequence: WordSequenceEntry[] = [];

  for (let i = 0; i < maxLen; i++) {
    sequence.push({
      word: words4[i] || words3[i] || words2[i] || words1[i] || '',
      level1: words1[i] || '',
      level2: words2[i] || '',
      level3: words3[i] || '',
      level4: words4[i] || '',
    });
  }

  return sequence.filter(w => w.word.length > 0);
}

async function seedWordLevels() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set. Creating local JSON output instead.');
    return seedLocalJson();
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log('🌱 Seeding word-level data for Mind-Reader Slider...\n');

  // Load paragraph data
  const dataPath = path.join(process.cwd(), 'content', 'the-prince-word-levels.json');
  const paragraphs: ParagraphData[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Find The Prince content ID
  const content = await db.select().from(contentLibrary)
    .where(eq(contentLibrary.title, 'The Prince'))
    .limit(1);

  if (content.length === 0) {
    console.log('❌ "The Prince" not found in contentLibrary. Run seed-content.ts first.');
    process.exit(1);
  }

  const contentId = content[0].id;
  console.log(`📖 Found "The Prince" with contentId: ${contentId}`);
  console.log(`📝 Processing ${paragraphs.length} paragraphs...\n`);

  for (const para of paragraphs) {
    const wordSeq = convertToWordSequence(para);
    
    await db.insert(wordLevel).values({
      contentId,
      paragraphIndex: para.paragraphIndex,
      wordSequence: wordSeq,
    });

    console.log(`✅ Paragraph ${para.paragraphIndex}: ${wordSeq.length} words`);
  }

  console.log(`\n✅ Seeded ${paragraphs.length} word sequences!`);
  process.exit(0);
}

function seedLocalJson() {
  console.log('📝 Creating local word sequences JSON...\n');

  const dataPath = path.join(process.cwd(), 'content', 'the-prince-word-levels.json');
  const outputPath = path.join(process.cwd(), 'content', 'the-prince-word-sequences.json');
  
  const paragraphs: ParagraphData[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const wordSequences = paragraphs.map(para => ({
    paragraphIndex: para.paragraphIndex,
    wordSequence: convertToWordSequence(para),
  }));

  fs.writeFileSync(outputPath, JSON.stringify(wordSequences, null, 2));

  console.log(`✅ Created ${outputPath}`);
  console.log(`📊 Total paragraphs: ${wordSequences.length}`);
  console.log(`📊 Total words: ${wordSequences.reduce((sum, p) => sum + p.wordSequence.length, 0)}`);
}

seedWordLevels().catch(console.error);

