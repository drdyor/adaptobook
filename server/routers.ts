import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { CALIBRATION_PASSAGES, assessReadingLevel, analyzePerformance } from './calibration';
import { z } from "zod";
import { 
  createCalibrationTest, 
  createReadingProfile, 
  getReadingProfileByUserId,
  updateReadingProfile,
  getAllContent,
  getContentById,
  createContent,
  createReadingSession,
  getActiveSessionByUserId,
  updateReadingSession,
  createProgressTracking,
  getSessionProgress,
  getParagraphVariant,
  createParagraphVariant,
  getChapterVariants,
  getAllVariantsForContent
} from './db';
import { adaptTextToLevel, adaptParagraph } from './adaptation';
import { extractAndSplitPDF } from './_core/pdfExtraction';
import { classifyTextCEFRCached } from './_core/cefr';
import { storagePut } from './storage';
import { checkRateLimit, getClientIP } from './_core/rateLimit';
import { adaptWordLevelRouter } from "./adaptWordLevelRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  calibration: router({
    getPassage: publicProcedure.query(() => {
      // Return a random passage for testing
      const passage = CALIBRATION_PASSAGES[Math.floor(Math.random() * CALIBRATION_PASSAGES.length)];
      return {
        text: passage.text,
        fleschKincaid: passage.fleschKincaid,
        questions: passage.questions.map((q: { question: string; options: string[]; type: string }) => ({
          question: q.question,
          options: q.options,
          type: q.type
        }))
      };
    }),
    
    submitTest: protectedProcedure
      .input((val: unknown) => {
        const input = val as { passageText: string; passageDifficulty: number; readingTime: number; answers: number[] };
        return input;
      })
      .mutation(async ({ ctx, input }) => {
        // Find the matching passage to get correct answers
        const passage = CALIBRATION_PASSAGES.find((p: { text: string }) => p.text === input.passageText);
        if (!passage) {
          throw new Error('Invalid passage');
        }
        
        // Calculate correct answers
        const correctAnswers = input.answers.filter((answer: number, i: number) => answer === passage.questions[i].correctAnswer).length;
        const totalQuestions = passage.questions.length;
        
        // Assess reading level
        const assessedLevel = assessReadingLevel(
          input.readingTime,
          correctAnswers,
          totalQuestions,
          input.passageDifficulty
        );
        
        // Analyze performance
        const { strengths, challenges } = analyzePerformance(passage.questions, input.answers);
        
        // Calculate reading speed (WPM)
        const words = input.passageText.split(/\s+/).length;
        const readingSpeed = Math.round((words / input.readingTime) * 60);
        const comprehensionAccuracy = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Save calibration test
        await createCalibrationTest({
          userId: ctx.user.id,
          passageText: input.passageText,
          passageDifficulty: input.passageDifficulty,
          readingTime: input.readingTime,
          correctAnswers,
          totalQuestions,
          assessedLevel
        });
        
        // Create or update reading profile
        const existingProfile = await getReadingProfileByUserId(ctx.user.id);
        const profileData = {
          userId: ctx.user.id,
          level: assessedLevel,
          microLevel: existingProfile?.microLevel ?? 2,
          readingSpeed,
          comprehensionAccuracy,
          strengths: JSON.stringify(strengths),
          challenges: JSON.stringify(challenges),
          lastCalibrated: new Date()
        };
        
        if (existingProfile) {
          await updateReadingProfile(ctx.user.id, profileData);
        } else {
          await createReadingProfile(profileData);
        }
        
        return {
          level: assessedLevel,
          readingSpeed,
          comprehensionAccuracy,
          strengths,
          challenges,
          correctAnswers,
          totalQuestions
        };
      })
  }),
  
  profile: router({
    get: protectedProcedure.query(async ({ ctx }: { ctx: { user: { id: number } } }) => {
      const profile = await getReadingProfileByUserId(ctx.user.id);
      if (!profile) return null;
      
      return {
        ...profile,
        strengths: profile.strengths ? JSON.parse(profile.strengths) : [],
        challenges: profile.challenges ? JSON.parse(profile.challenges) : []
      };
    }),

    updateMicroLevel: protectedProcedure
      .input((val: unknown) => {
        const input = val as { microLevel: number };
        return input;
      })
      .mutation(async ({ ctx, input }) => {
        const clamped = Math.min(4, Math.max(1, input.microLevel));
        await updateReadingProfile(ctx.user.id, { microLevel: clamped });
        return { microLevel: clamped };
      })
  }),
  
  content: router({
    list: publicProcedure.query(async () => {
      return await getAllContent();
    }),
    
    get: publicProcedure
      .input((val: unknown) => {
        const input = val as { id: number };
        return input;
      })
      .query(async ({ input }) => {
        return await getContentById(input.id);
      }),
    
    // Get a single paragraph variant at a specific difficulty level
    getParagraphVariant: publicProcedure
      .input((val: unknown) => {
        const input = val as { 
          contentId: number; 
          chapterNumber: number; 
          paragraphIndex: number; 
          level: number;
        };
        return input;
      })
      .query(async ({ input }) => {
        const variant = await getParagraphVariant(
          input.contentId,
          input.chapterNumber,
          input.paragraphIndex,
          input.level
        );
        
        if (!variant) {
          throw new Error('Paragraph variant not found');
        }
        
        return variant;
      }),
    
    // Get all paragraph variants for a chapter (all levels)
    getChapter: publicProcedure
      .input((val: unknown) => {
        const input = val as { 
          contentId: number; 
          chapterNumber: number;
        };
        return input;
      })
      .query(async ({ input }) => {
        const variants = await getChapterVariants(
          input.contentId,
          input.chapterNumber
        );
        
        // Group variants by paragraph index
        const paragraphGroups: Record<number, any> = {};
        
        for (const variant of variants) {
          if (!paragraphGroups[variant.paragraphIndex]) {
            paragraphGroups[variant.paragraphIndex] = {
              paragraphIndex: variant.paragraphIndex,
              levels: {}
            };
          }
          paragraphGroups[variant.paragraphIndex].levels[variant.level] = variant.text;
        }
        
        return {
          chapterNumber: input.chapterNumber,
          paragraphs: Object.values(paragraphGroups)
        };
      }),
    
    // Get all variants for entire content (useful for preloading)
    getAllVariants: publicProcedure
      .input((val: unknown) => {
        const input = val as { contentId: number };
        return input;
      })
      .query(async ({ input }) => {
        return await getAllVariantsForContent(input.contentId);
      }),
    
    // Legacy adapt endpoint - kept for backwards compatibility but deprecated
    adapt: protectedProcedure
      .input((val: unknown) => {
        const input = val as { contentId: number; targetLevel: number };
        return input;
      })
      .mutation(async ({ input }) => {
        const content = await getContentById(input.contentId);
        if (!content) {
          throw new Error('Content not found');
        }
        
        const adapted = await adaptTextToLevel(content.originalText, input.targetLevel);
        return adapted;
      }),
    
    // Upload PDF and extract text
    uploadPdf: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          author: z.string().optional(),
          pdfData: z.string(), // base64 encoded PDF
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 10 PDF uploads per IP per day
        const clientIP = getClientIP(ctx.req.headers as Record<string, string | string[] | undefined>);
        const rateLimitKey = `pdf_upload:${clientIP}`;
        const allowed = checkRateLimit(rateLimitKey, 10, 24 * 60 * 60 * 1000); // 24 hours
        
        if (!allowed) {
          throw new Error('Rate limit exceeded: Maximum 10 PDF uploads per day');
        }
        
        // Decode base64 PDF
        const pdfBuffer = Buffer.from(input.pdfData, 'base64');
        
        // Validate PDF size (max 10MB)
        const sizeMB = pdfBuffer.length / (1024 * 1024);
        if (sizeMB > 10) {
          throw new Error('PDF file exceeds maximum size limit of 10MB');
        }
        
        // Extract text from PDF
        const paragraphs = await extractAndSplitPDF(pdfBuffer);
        
        if (paragraphs.length === 0) {
          throw new Error('No text could be extracted from PDF');
        }
        
        // Classify CEFR level
        const sampleText = paragraphs.slice(0, 3).join(' ');
        const cefrLevel = classifyTextCEFRCached(sampleText);
        
        // Store PDF file (optional, for future reference)
        let pdfUrl: string | undefined;
        try {
          const { url } = await storagePut(
            `pdfs/${Date.now()}-${input.title.replace(/[^a-z0-9]/gi, '-')}.pdf`,
            pdfBuffer,
            'application/pdf'
          );
          pdfUrl = url;
        } catch (error) {
          console.warn('Failed to store PDF file:', error);
        }
        
        // Create content entry
        const fullText = paragraphs.join('\n\n');
        const wordCount = fullText.split(/\s+/).length;
        
        const contentResult = await createContent({
          title: input.title,
          author: input.author || null,
          originalText: fullText,
          baseDifficulty: 4, // Default to level 4 (original)
          wordCount,
          category: 'pdf_upload',
          sourceType: 'pdf_upload',
          pdfUrl: pdfUrl || null,
          cefrLevel,
        });
        
        const contentId = (contentResult as any).insertId;
        
        // Store paragraphs as level 4 (original) variants
        // PDFs are treated as single "chapter" with paragraphs
        for (let i = 0; i < paragraphs.length; i++) {
          await createParagraphVariant({
            contentId,
            chapterNumber: 1,
            paragraphIndex: i,
            level: 4,
            text: paragraphs[i],
            originalText: paragraphs[i],
          });
        }
        
        return {
          contentId,
          title: input.title,
          author: input.author,
          paragraphCount: paragraphs.length,
          cefrLevel,
        };
      }),
    
    // Adapt a paragraph on-the-fly
    adaptParagraph: publicProcedure
      .input(
        z.object({
          contentId: z.number(),
          chapterNumber: z.number(),
          paragraphIndex: z.number(),
          currentLevel: z.number().min(1).max(4),
          targetLevel: z.number().min(1).max(4),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 50 paragraph adaptations per IP per day
        const clientIP = getClientIP(ctx.req.headers as Record<string, string | string[] | undefined>);
        const rateLimitKey = `adapt_paragraph:${clientIP}`;
        const allowed = checkRateLimit(rateLimitKey, 50, 24 * 60 * 60 * 1000); // 24 hours
        
        if (!allowed) {
          throw new Error('Rate limit exceeded: Maximum 50 paragraph adaptations per day');
        }
        
        // Check if variant already exists
        const existing = await getParagraphVariant(
          input.contentId,
          input.chapterNumber,
          input.paragraphIndex,
          input.targetLevel
        );
        
        if (existing) {
          return { text: existing.text };
        }
        
        // Get original paragraph (level 4)
        const original = await getParagraphVariant(
          input.contentId,
          input.chapterNumber,
          input.paragraphIndex,
          4
        );
        
        if (!original) {
          throw new Error('Paragraph not found');
        }
        
        // Adapt paragraph using LLM
        const adaptedText = await adaptParagraph(
          original.text,
          input.currentLevel,
          input.targetLevel
        );
        
        // Cache the result
        await createParagraphVariant({
          contentId: input.contentId,
          chapterNumber: input.chapterNumber,
          paragraphIndex: input.paragraphIndex,
          level: input.targetLevel,
          text: adaptedText,
          originalText: original.text,
        });
        
        return { text: adaptedText };
      }),
    
    // Upload text file directly (simpler than PDF)
    uploadText: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          author: z.string().optional(),
          textContent: z.string().min(100), // At least 100 characters
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Rate limiting: 10 uploads per IP per day
        const clientIP = getClientIP(ctx.req.headers as Record<string, string | string[] | undefined>);
        const rateLimitKey = `text_upload:${clientIP}`;
        const allowed = checkRateLimit(rateLimitKey, 10, 24 * 60 * 60 * 1000); // 24 hours
        
        if (!allowed) {
          throw new Error('Rate limit exceeded: Maximum 10 uploads per day');
        }
        
        // Split text into paragraphs
        const paragraphs = input.textContent
          .split(/\n\s*\n+/) // Split on double newlines
          .map(p => p.replace(/\s+/g, ' ').trim()) // Normalize whitespace
          .filter(p => p.length > 50) // Filter out very short paragraphs
          .filter(p => !p.match(/^\d+$/)); // Filter out page numbers
        
        if (paragraphs.length === 0) {
          throw new Error('No valid paragraphs found in text. Please ensure your text has proper paragraph breaks.');
        }
        
        // Classify CEFR level
        const sampleText = paragraphs.slice(0, 3).join(' ');
        const cefrLevel = classifyTextCEFRCached(sampleText);
        
        // Create content entry
        const wordCount = input.textContent.split(/\s+/).length;
        
        const contentResult = await createContent({
          title: input.title,
          author: input.author || null,
          originalText: input.textContent,
          baseDifficulty: 4, // Default to level 4 (original)
          wordCount,
          category: 'text_upload',
          sourceType: 'pdf_upload', // Reuse same type for simplicity
          pdfUrl: null,
          cefrLevel,
        });
        
        const contentId = (contentResult as any).insertId;
        
        // Store paragraphs as level 4 (original) variants
        // Text files are treated as single "chapter" with paragraphs
        for (let i = 0; i < paragraphs.length; i++) {
          await createParagraphVariant({
            contentId,
            chapterNumber: 1,
            paragraphIndex: i,
            level: 4,
            text: paragraphs[i],
            originalText: paragraphs[i],
          });
        }
        
        return {
          contentId,
          title: input.title,
          author: input.author,
          paragraphCount: paragraphs.length,
          cefrLevel,
        };
      })
  }),
  
  reading: router({
    startSession: protectedProcedure
      .input((val: unknown) => {
        const input = val as { contentId: number; difficultyLevel: number };
        return input;
      })
      .mutation(async ({ ctx, input }) => {
        const result = await createReadingSession({
          userId: ctx.user.id,
          contentId: input.contentId,
          difficultyLevel: input.difficultyLevel,
          currentPosition: 0,
          completedParagraphs: 0,
          status: 'active'
        });
        
        return { sessionId: (result as any).insertId };
      }),
    
    getActiveSession: protectedProcedure.query(async ({ ctx }) => {
      return await getActiveSessionByUserId(ctx.user.id);
    }),
    
    updateProgress: protectedProcedure
      .input((val: unknown) => {
        const input = val as { 
          sessionId: number; 
          paragraphIndex: number; 
          difficultyLevel: number;
          comprehensionScore?: number;
          timeSpent?: number;
          manualAdjustment?: boolean;
        };
        return input;
      })
      .mutation(async ({ ctx, input }) => {
        await createProgressTracking({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          paragraphIndex: input.paragraphIndex,
          difficultyLevel: input.difficultyLevel,
          comprehensionScore: input.comprehensionScore,
          timeSpent: input.timeSpent,
          manualAdjustment: input.manualAdjustment ? 1 : 0
        });
        
        // Update session's current position
        await updateReadingSession(input.sessionId, {
          currentPosition: input.paragraphIndex,
          completedParagraphs: input.paragraphIndex + 1,
          lastAccessedAt: new Date()
        });
        
        return { success: true };
      }),
    
    getProgress: protectedProcedure
      .input((val: unknown) => {
        const input = val as { sessionId: number };
        return input;
      })
      .query(async ({ input }) => {
        return await getSessionProgress(input.sessionId);
      })
  }),
  wordLevel: adaptWordLevelRouter,
});

export type AppRouter = typeof appRouter;
