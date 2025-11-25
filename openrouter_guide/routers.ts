          cefrLevel,
        });
        
        const contentId = contentResult.id;
        
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