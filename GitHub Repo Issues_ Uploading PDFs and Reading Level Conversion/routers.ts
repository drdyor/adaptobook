            paragraphIndex: i,
            level: 4,
            text: originalText,
            originalText: originalText,
          });
          
          // Generate and store levels 1, 2, and 3 using AI
          // This makes reading instant - no AI calls needed during reading
          const levelsToGenerate = [1, 2, 3];
          for (const targetLevel of levelsToGenerate) {
            try {
              const adaptedText = await adaptParagraph(
                originalText,
                4, // current level (original)
                targetLevel
              );
              
              await createParagraphVariant({
                contentId,
                chapterNumber: 1,
                paragraphIndex: i,
                level: targetLevel,
                text: adaptedText,
                originalText: originalText,
              });
            } catch (error) {
              console.error(`Failed to generate level ${targetLevel} for paragraph ${i}:`, error);
              // If AI generation fails, store original text as fallback
              await createParagraphVariant({
                contentId,
                chapterNumber: 1,
                paragraphIndex: i,
                level: targetLevel,
                text: originalText,
                originalText: originalText,
              });
            }
          }
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
        const clientIP = getClientIP({ headers: ctx.req.headers as Record<string, string | string[] | undefined> });
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