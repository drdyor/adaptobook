# PDF/Text Upload Requirements

## ✅ What Was Fixed

The upload endpoints now **pre-generate all difficulty levels (1-4)** when you upload a PDF or text file. This means:

- ✅ **Upload**: AI generates levels 1, 2, 3, and stores level 4 (original)
- ✅ **Reading**: Instant switching between levels (no AI calls needed)
- ✅ **CEFR Scanner**: Automatically detects the reading level of the original text

## 🔧 What You Need for PDF/Text Uploads

### 1. **DATABASE_URL** (PostgreSQL - Supabase)
   - **Required**: YES
   - **Purpose**: Stores uploaded content and all difficulty variants
   - **Setup**: 
     - Create project at https://supabase.com
     - Get connection string from Settings → Database
     - Format: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`

### 2. **OPENROUTER_API_KEY**
   - **Required**: YES
   - **Purpose**: AI generates difficulty levels 1-3 during upload
   - **Setup**: Get API key from https://openrouter.ai
   - **Note**: Without this, uploads will fail or store original text only

### 3. **Database Migrations**
   - **Required**: YES (one-time setup)
   - **Command**: `pnpm db:push`
   - **Purpose**: Creates tables for content, paragraph variants, etc.

### 4. **Vite Environment Variables** (for build)
   - `VITE_APP_TITLE=AdaptoBook`
   - `VITE_APP_LOGO=/logo.png`
   - `VITE_ENABLE_AUTH=false`

## 📋 How It Works Now

### PDF Upload Flow:
1. User uploads PDF → Server extracts text
2. **CEFR Scanner** analyzes text → Detects reading level (A1-B2)
3. Text split into paragraphs
4. **For each paragraph:**
   - Store level 4 (original text)
   - AI generates level 3 (easier)
   - AI generates level 2 (easier)
   - AI generates level 1 (easiest)
5. All variants stored in database
6. User can read at any level instantly!

### Text Upload Flow:
Same as PDF, but skips PDF extraction step.

## ⚡ Performance Notes

- **Upload time**: Slower (has to generate 3 AI variants per paragraph)
- **Reading time**: Instant (all variants pre-generated)
- **Example**: 10 paragraphs = ~30 AI calls during upload, but then instant reading

## 🚨 Error Handling

- If AI generation fails for a level, original text is stored as fallback
- Upload still succeeds even if some levels fail to generate
- Rate limiting: 10 uploads per IP per day

## 🧪 Testing

1. Upload a PDF or text file
2. Check database: Should see 4 variants per paragraph
3. Read the content: Switch difficulty levels - should be instant!
4. Check CEFR badge: Should show detected level

## 📝 Summary

**For PDF/text uploads to work, you need:**
1. ✅ DATABASE_URL (Supabase PostgreSQL)
2. ✅ OPENROUTER_API_KEY (for AI adaptation)
3. ✅ Database migrations run (`pnpm db:push`)
4. ✅ Vite env vars (for build)

**The app will:**
- ✅ Extract text from PDFs
- ✅ Scan and detect CEFR reading level
- ✅ Generate all 4 difficulty levels using AI
- ✅ Store everything in database
- ✅ Allow instant level switching during reading

