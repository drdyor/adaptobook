/**
 * Clean and split the extracted Prince content into proper paragraphs
 */

import fs from 'fs';
import path from 'path';

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

function splitIntoParagraphs(text: string, targetCount: number = 8): string[] {
  // Remove control characters
  let cleaned = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Remove page numbers and headers
  cleaned = cleaned.replace(/\d+\s+Free eBooks at Planet eBook\.com/g, '');
  cleaned = cleaned.replace(/The Prince\s+\d+/g, '');
  
  // Split into sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) return [];
  
  // Group sentences into paragraphs (aim for targetCount paragraphs)
  const sentencesPerParagraph = Math.max(3, Math.ceil(sentences.length / targetCount));
  const paragraphs: string[] = [];
  
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    const paragraphSentences = sentences.slice(i, i + sentencesPerParagraph);
    const paragraph = paragraphSentences.join(' ').trim().replace(/\s+/g, ' ');
    
    if (paragraph.length > 100) { // Only include substantial paragraphs
      paragraphs.push(paragraph);
    }
  }
  
  return paragraphs;
}

function cleanExtraction(): void {
  const inputPath = path.join(process.cwd(), 'content', 'the-prince-extracted.json');
  const outputPath = path.join(process.cwd(), 'content', 'the-prince-cleaned.json');

  console.log('📖 Cleaning extracted Prince content...');
  
  const rawContent: ExtractedContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  
  const cleanedChapters: Chapter[] = rawContent.chapters.map(chapter => {
    // Combine all paragraphs (since they're actually fragments)
    const fullText = chapter.paragraphs.join(' ');
    
    // Split into proper paragraphs
    const paragraphs = splitIntoParagraphs(fullText, 8);
    
    // Clean title
    let cleanTitle = chapter.title
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/\d+\s+Free eBooks at Planet eBook\.com/g, '')
      .replace(/The Prince\s+\d+/g, '')
      .trim();
    
    // Extract just the first meaningful part as title
    const titleSentences = cleanTitle.split(/[.!?]+/);
    cleanTitle = titleSentences[0].trim() || `Chapter ${chapter.number}`;
    
    return {
      number: chapter.number,
      title: cleanTitle.substring(0, 100), // Limit title length
      paragraphs
    };
  });

  const cleanedContent: ExtractedContent = {
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    chapters: cleanedChapters
  };

  fs.writeFileSync(outputPath, JSON.stringify(cleanedContent, null, 2));

  console.log(`✅ Cleaning complete!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total chapters: ${cleanedChapters.length}`);
  console.log(`   - Total paragraphs: ${cleanedChapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)}`);
  
  cleanedChapters.forEach(ch => {
    console.log(`   - Chapter ${ch.number}: ${ch.paragraphs.length} paragraphs`);
  });
}

cleanExtraction();

