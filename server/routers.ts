import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { CALIBRATION_PASSAGES, assessReadingLevel, analyzePerformance } from './calibration';
import { 
  createCalibrationTest, 
  createReadingProfile, 
  getReadingProfileByUserId,
  updateReadingProfile,
  getAllContent,
  getContentById,
  createReadingSession,
  getActiveSessionByUserId,
  updateReadingSession,
  createProgressTracking,
  getSessionProgress
} from './db';
import { adaptTextToLevel } from './adaptation';

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
});

export type AppRouter = typeof appRouter;
