/**
 * PDF text extraction utilities
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
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

/**
 * Split text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/) // Split on double newlines
    .map(p => p.replace(/\s+/g, ' ').trim()) // Normalize whitespace
    .filter(p => p.length > 50) // Filter out very short paragraphs
    .filter(p => !p.match(/^\d+$/)); // Filter out page numbers
}

/**
 * Extract text and split into paragraphs from PDF buffer
 */
export async function extractAndSplitPDF(buffer: Buffer): Promise<string[]> {
  const text = await extractTextFromPDFBuffer(buffer);
  return splitIntoParagraphs(text);
}

