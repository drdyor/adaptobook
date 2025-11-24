import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

const LEVEL_NAMES = {
  1: "Elementary (1-2)",
  2: "Early Elementary (3-4)",
  3: "Upper Elementary (5-6)",
  4: "Middle School (7-8)"
};

export default function Reader() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<any>(null);

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: content } = trpc.content.get.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id }
  );

  const { data: chapter, isLoading: isLoadingChapter } = trpc.content.getChapter.useQuery(
    { contentId: parseInt(id || "0"), chapterNumber: currentChapter },
    { enabled: !!id }
  );

  const startSession = trpc.reading.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
    }
  });

  const updateProgress = trpc.reading.updateProgress.useMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (content && profile && !sessionId) {
      // Use profile level, but clamp to 1-4 for pre-generated content
      const targetLevel = Math.min(4, Math.max(1, profile.level));
      setCurrentLevel(targetLevel);

      startSession.mutate({
        contentId: content.id,
        difficultyLevel: targetLevel
      });
    }
  }, [content, profile]);

  useEffect(() => {
    if (chapter) {
      setChapterData(chapter);
    }
  }, [chapter]);

  const handleLevelChange = (delta: number) => {
    const newLevel = Math.max(1, Math.min(4, currentLevel + delta));
    if (newLevel === currentLevel) return;

    // Instant level switching - no API call needed!
    setCurrentLevel(newLevel);

    if (sessionId) {
      updateProgress.mutate({
        sessionId,
        paragraphIndex: currentParagraph,
        difficultyLevel: newLevel,
        manualAdjustment: true
      });
    }
  };

  const handleNextParagraph = () => {
    if (chapterData && currentParagraph < chapterData.paragraphs.length - 1) {
      const nextIndex = currentParagraph + 1;
      setCurrentParagraph(nextIndex);
      
      if (sessionId) {
        updateProgress.mutate({
          sessionId,
          paragraphIndex: nextIndex,
          difficultyLevel: currentLevel
        });
      }
    }
  };

  const handlePrevParagraph = () => {
    if (currentParagraph > 0) {
      setCurrentParagraph(currentParagraph - 1);
    }
  };

  const handleNextChapter = () => {
    setCurrentChapter(prev => prev + 1);
    setCurrentParagraph(0);
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(prev => prev - 1);
      setCurrentParagraph(0);
    }
  };

  if (!isAuthenticated || !content || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const currentParagraphText = chapterData?.paragraphs[currentParagraph]?.levels[currentLevel] || "";
  const totalParagraphs = chapterData?.paragraphs.length || 0;
  const progress = totalParagraphs > 0 
    ? ((currentParagraph + 1) / totalParagraphs) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/library")}>
            ← Library
          </Button>
          <div className="flex-1 mx-8">
            <div className="max-w-md mx-auto">
              <div className="text-sm text-muted-foreground mb-1 text-center">
                Chapter {currentChapter} • Paragraph {currentParagraph + 1} of {totalParagraphs}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}</Badge>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
          {content.author && (
            <p className="text-muted-foreground">by {content.author}</p>
          )}
        </div>

        {/* Reading Area */}
        {isLoadingChapter ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chapter...</p>
          </Card>
        ) : currentParagraphText ? (
          <Card className="p-8 mb-6">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="leading-relaxed text-lg">
                {currentParagraphText}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No content available at this level</p>
          </Card>
        )}

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Navigation */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Navigation</h3>
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePrevParagraph}
                disabled={currentParagraph === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                className="flex-1"
                onClick={handleNextParagraph}
                disabled={currentParagraph >= totalParagraphs - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handlePrevChapter}
                disabled={currentChapter === 1}
              >
                ← Prev Chapter
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleNextChapter}
                disabled={currentChapter >= 5}
              >
                Next Chapter →
              </Button>
            </div>
          </Card>

          {/* Difficulty Controls */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Reading Level</h3>
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleLevelChange(-1)}
                disabled={currentLevel === 1}
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Too Hard
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleLevelChange(1)}
                disabled={currentLevel === 4}
              >
                Too Easy
                <ChevronUp className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Level {currentLevel} of 4 • {LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}
            </p>
          </Card>
        </div>

        {/* Info */}
        <Card className="p-4 mt-6 bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            ⚡ Instant Switching: Content adapts immediately - no loading! 
            Click "Too Hard" or "Too Easy" to adjust difficulty.
          </p>
        </Card>
      </div>
    </div>
  );
}
