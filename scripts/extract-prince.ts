/**
 * PDF Extraction Script for "The Prince" by Machiavelli
 * Extracts first 5 chapters and splits them into paragraphs
 */

import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

async function extractPrince(): Promise<void> {
  const pdfPath = path.join(process.cwd(), 'sample books', 'Nicolo Machiavelli - The Prince.pdf');
  const outputPath = path.join(process.cwd(), 'content', 'the-prince-extracted.json');

  console.log('📖 Extracting text from The Prince PDF...');
  
  const text = await extractTextFromPDF(pdfPath);

  console.log(`✅ Extracted ${text.length} characters from PDF`);

  // Define chapter patterns for Roman numerals I through V
  const chapterPatterns = [
    { number: 1, roman: 'I', pattern: /CHAPTER\s+I\b[^\n]*\n([^]*?)(?=CHAPTER\s+II\b|$)/i },
    { number: 2, roman: 'II', pattern: /CHAPTER\s+II\b[^\n]*\n([^]*?)(?=CHAPTER\s+III\b|$)/i },
    { number: 3, roman: 'III', pattern: /CHAPTER\s+III\b[^\n]*\n([^]*?)(?=CHAPTER\s+IV\b|$)/i },
    { number: 4, roman: 'IV', pattern: /CHAPTER\s+IV\b[^\n]*\n([^]*?)(?=CHAPTER\s+V\b|$)/i },
    { number: 5, roman: 'V', pattern: /CHAPTER\s+V\b[^\n]*\n([^]*?)(?=CHAPTER\s+VI\b|$)/i },
  ];

  const chapters: Chapter[] = [];

  for (const { number, roman, pattern } of chapterPatterns) {
    const match = text.match(pattern);
    
    if (match) {
      const chapterText = match[1].trim();
      
      // Extract chapter title
      const titleMatch = text.match(new RegExp(`CHAPTER\\s+${roman}\\b[^\\n]*\\n([^\\n]+)`, 'i'));
      const title = titleMatch ? titleMatch[1].trim() : `Chapter ${roman}`;
      
      // Split into paragraphs
      const paragraphs = chapterText
        .split(/\n\s*\n+/) // Split on double newlines
        .map(p => p.replace(/\s+/g, ' ').trim()) // Normalize whitespace
        .filter(p => p.length > 50) // Filter out very short paragraphs (likely page numbers, etc.)
        .filter(p => !p.match(/^\d+$/)); // Filter out page numbers
      
      chapters.push({
        number,
        title,
        paragraphs
      });

      console.log(`✅ Chapter ${number}: "${title}" - ${paragraphs.length} paragraphs`);
    } else {
      console.warn(`⚠️  Could not find Chapter ${roman}`);
    }
  }

  const extractedContent: ExtractedContent = {
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    chapters
  };

  // Create content directory if it doesn't exist
  const contentDir = path.join(process.cwd(), 'content');
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  // Save to JSON
  fs.writeFileSync(outputPath, JSON.stringify(extractedContent, null, 2));

  console.log(`\n📝 Extraction complete!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total chapters: ${chapters.length}`);
  console.log(`   - Total paragraphs: ${chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)}`);
  
  // Show paragraph counts per chapter
  chapters.forEach(ch => {
    console.log(`   - Chapter ${ch.number}: ${ch.paragraphs.length} paragraphs`);
  });
}

// Run extraction
extractPrince().catch(error => {
  console.error('❌ Error extracting PDF:', error);
  process.exit(1);
});
