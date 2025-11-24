# Pre-Generated Content System

## Overview

This adaptive reading platform has been optimized for **cost-efficiency** by using **pre-generated paragraph variants** instead of real-time LLM adaptation. This means content difficulty switching is **instant** and **free** during reading.

## Cost Analysis

### Traditional Real-Time Approach
- **Per adaptation**: ~$0.002 per LLM call
- **Per user session**: Multiple adaptations as users adjust difficulty
- **Example**: 10 level changes = $0.02 per reading session
- **1000 users**: $20+ in LLM costs

### Pre-Generated Approach (Current Implementation)
- **One-time generation cost**: ~$0.15 (76 variants × $0.002)
- **Per user session**: $0.00 (instant switching from cached variants!)
- **1000 users**: $0.00 in runtime costs
- **ROI**: Pays for itself after ~8 reading sessions

## Implementation

### Content Structure

**The Prince** by Niccolò Machiavelli
- **Chapters**: 5 (I through V)
- **Paragraphs**: 19 total across all chapters
- **Difficulty Levels**: 4 levels per paragraph
  - Level 1: Elementary (Grade 1-2)
  - Level 2: Early Elementary (Grade 3-4)
  - Level 3: Upper Elementary (Grade 5-6)
  - Level 4: Middle School (Grade 7-8)
- **Total Variants**: 76 (19 paragraphs × 4 levels)

### Database Schema

```sql
CREATE TABLE paragraphVariants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contentId INT NOT NULL,
  chapterNumber INT NOT NULL,
  paragraphIndex INT NOT NULL,
  level INT NOT NULL,
  text TEXT NOT NULL,
  originalText TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (contentId) REFERENCES contentLibrary(id),
  INDEX idx_paragraph_lookup (contentId, chapterNumber, paragraphIndex, level)
);
```

### API Endpoints

1. **Get Paragraph Variant**
   ```typescript
   content.getParagraphVariant({
     contentId: number,
     chapterNumber: number,
     paragraphIndex: number,
     level: number
   })
   ```

2. **Get Chapter (All Levels)**
   ```typescript
   content.getChapter({
     contentId: number,
     chapterNumber: number
   })
   // Returns all paragraphs with all 4 difficulty levels pre-loaded
   ```

3. **Get All Variants**
   ```typescript
   content.getAllVariants({ contentId: number })
   // Returns complete book with all variants
   ```

### User Experience

- **Instant level switching**: No loading spinner, no API delays
- **"Too Hard" / "Too Easy" buttons**: Simple one-click difficulty adjustment
- **Chapter navigation**: Move between chapters while maintaining chosen level
- **Progress tracking**: Records level changes and reading progress

## Files & Structure

```
adaptobook/
├── content/
│   ├── the-prince-variants.json          # 121 KB of pre-generated content
│   ├── the-prince-extracted.json         # Raw PDF extraction
│   └── the-prince-cleaned.json           # Processed chapters
├── scripts/
│   ├── extract-prince.ts                 # PDF extraction script
│   ├── clean-extraction.ts               # Text cleaning
│   └── generate-variants.ts              # Batch LLM generation
├── drizzle/
│   ├── schema.ts                         # Database schema with paragraphVariants
│   └── 0002_add_paragraph_variants.sql   # Migration
├── server/
│   ├── db.ts                             # DB functions for variants
│   └── routers.ts                        # API endpoints
└── client/src/pages/
    └── Reader.tsx                        # Updated reader UI
```

## Generation Process

1. **Extract PDF** (`extract-prince.ts`)
   - Read PDF using pdfjs-dist
   - Identify chapters I-V
   - Split into paragraphs

2. **Clean Text** (`clean-extraction.ts`)
   - Remove formatting artifacts
   - Normalize whitespace
   - Split into proper paragraphs

3. **Generate Variants** (`generate-variants.ts`)
   - For each paragraph, generate 4 difficulty levels
   - Use LLM with specific prompts for each level
   - Save to JSON file (committed to repo)

4. **Seed Database** (`seed-content.ts`)
   - Insert "The Prince" into contentLibrary
   - Insert all 76 variants into paragraphVariants
   - Create index for fast lookups

## Future Enhancements

1. **Add More Books**
   - Run generation script for additional classic literature
   - Expand to 7 difficulty levels (currently 4)

2. **Batch Processing**
   - Generate multiple books in parallel
   - Optimize LLM prompts for consistency

3. **Compression**
   - Store variants as diffs from base text
   - Use compression for large books

4. **Analytics**
   - Track which levels users prefer
   - Identify paragraphs that need regeneration

## Maintenance

### Adding New Content

```bash
# 1. Add PDF to sample books folder
# 2. Update extract-prince.ts for new book
npm run extract

# 3. Generate variants
npm run generate

# 4. Update seed script
# 5. Run migration and seed
npm run db:push
npm run seed
```

### Regenerating Variants

If LLM quality improves or you want to update content:

```bash
# Regenerate all variants
npm run generate

# Re-seed database
npm run seed
```

## Key Takeaways

✅ **One-time cost**: $0.15 for 76 variants
✅ **Instant switching**: No loading, no delays
✅ **Scalable**: Works for unlimited users
✅ **Version controlled**: Variants committed to git
✅ **Maintainable**: Easy to regenerate or update

🚀 **Result**: A cost-effective, high-performance adaptive reading platform!

