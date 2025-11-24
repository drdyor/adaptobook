import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function Reader() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [adaptedParagraphs, setAdaptedParagraphs] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: content } = trpc.content.get.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id }
  );

  const adaptContent = trpc.content.adapt.useMutation({
    onSuccess: (data) => {
      setAdaptedParagraphs(data.paragraphs);
      setCurrentLevel(data.level);
      setIsAdapting(false);
    }
  });

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
      const targetLevel = profile.level;
      setCurrentLevel(targetLevel);
      setIsAdapting(true);
      
      adaptContent.mutate({
        contentId: content.id,
        targetLevel
      });

      startSession.mutate({
        contentId: content.id,
        difficultyLevel: targetLevel
      });
    }
  }, [content, profile]);

  const handleLevelChange = (delta: number) => {
    const newLevel = Math.max(1, Math.min(7, currentLevel + delta));
    if (newLevel === currentLevel) return;

    setCurrentLevel(newLevel);
    setIsAdapting(true);
    adaptContent.mutate({
      contentId: content!.id,
      targetLevel: newLevel
    });

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
    if (currentParagraph < adaptedParagraphs.length - 1) {
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

  const progress = adaptedParagraphs.length > 0 
    ? ((currentParagraph + 1) / adaptedParagraphs.length) * 100 
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
                {currentParagraph + 1} of {adaptedParagraphs.length}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Level: <span className="font-bold text-primary">L{currentLevel}</span>
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
        {isAdapting ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Adapting content to Level {currentLevel}...</p>
          </Card>
        ) : adaptedParagraphs.length > 0 ? (
          <Card className="p-8 mb-6">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="leading-relaxed text-lg">
                {adaptedParagraphs[currentParagraph]}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No content available</p>
          </Card>
        )}

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Navigation */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Navigation</h3>
            <div className="flex gap-2">
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
                disabled={currentParagraph >= adaptedParagraphs.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Difficulty Controls */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Difficulty Level</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleLevelChange(-1)}
                disabled={currentLevel === 1 || isAdapting}
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Easier
              </Button>
              <Button
                variant="outline"
                className="w-16"
                disabled
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleLevelChange(1)}
                disabled={currentLevel === 7 || isAdapting}
              >
                Harder
                <ChevronUp className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Current: Level {currentLevel} of 7
            </p>
          </Card>
        </div>

        {/* Info */}
        <Card className="p-4 mt-6 bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            💡 Tip: Use difficulty controls to find your optimal reading flow. 
            Content adapts in real-time to match your selected level.
          </p>
        </Card>
      </div>
    </div>
  );
}
