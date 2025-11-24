import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import MindReaderSlider from "@/components/MindReaderSlider";
import { useWordLevelMorph, getTypographyVars, triggerHaptic, WordSequenceEntry } from "@/hooks/useWordLevelMorph";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useCallback, CSSProperties } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const LEVEL_NAMES = {
  1: "Starter",
  2: "Rising",
  3: "Advanced",
  4: "Original"
};

export default function Reader() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [microLevel, setMicroLevel] = useState(2.0);
  const [physicalMode, setPhysicalMode] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<any>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  const contentId = parseInt(id || "0");

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: content } = trpc.content.get.useQuery(
    { id: contentId },
    { enabled: !!id }
  );

  const { data: chapter, isLoading: isLoadingChapter } = trpc.content.getChapter.useQuery(
    { contentId, chapterNumber: currentChapter },
    { enabled: !!id }
  );

  // Fetch word-level data for the current paragraph
  const { data: wordSeq } = trpc.wordLevel.getWordSeq.useQuery(
    { contentId, paragraphIndex: currentParagraph },
    { enabled: !!id && physicalMode }
  );

  const startSession = trpc.reading.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
    }
  });

  const updateProgress = trpc.reading.updateProgress.useMutation();
  const saveMicroLevel = trpc.wordLevel.saveMicroLevel.useMutation();

  // Get morphed text from word sequences
  const morphedText = useWordLevelMorph(wordSeq as WordSequenceEntry[] | undefined, microLevel);

  // Get typography CSS variables
  const typographyVars = getTypographyVars(microLevel);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (content && profile && !sessionId) {
      // Use profile microLevel if available, otherwise use level
      const initialMicroLevel = profile.microLevel ?? Math.min(4, Math.max(1, profile.level));
      setMicroLevel(initialMicroLevel);

      startSession.mutate({
        contentId: content.id,
        difficultyLevel: Math.round(initialMicroLevel)
      });
    }
  }, [content, profile]);

  useEffect(() => {
    if (chapter) {
      setChapterData(chapter);
    }
  }, [chapter]);

  // Debounced save of microLevel
  const debouncedSaveMicroLevel = useCallback(
    debounce((level: number) => {
      saveMicroLevel.mutate({ microLevel: level });
    }, 500),
    []
  );

  const handleMicroLevelChange = (value: number) => {
    setMicroLevel(value);
    
    // Trigger haptic feedback
    if (physicalMode) {
      triggerHaptic(value);
    }

    // Debounced save to profile
    debouncedSaveMicroLevel(value);

    if (sessionId) {
      updateProgress.mutate({
        sessionId,
        paragraphIndex: currentParagraph,
        difficultyLevel: Math.round(value),
        manualAdjustment: true
      });
    }
  };

  // Long press handlers for physical mode
  const handlePointerDown = () => {
    if (!physicalMode) return;
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      triggerHaptic(microLevel);
    }, 300);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLongPressing || !physicalMode) return;
    
    // Map vertical movement to microLevel change
    const deltaY = e.movementY;
    const newLevel = Math.max(1, Math.min(4, microLevel - deltaY * 0.02));
    setMicroLevel(newLevel);
    triggerHaptic(newLevel);
  };

  const handleNextParagraph = () => {
    if (chapterData && currentParagraph < chapterData.paragraphs.length - 1) {
      const nextIndex = currentParagraph + 1;
      setCurrentParagraph(nextIndex);
      
      if (sessionId) {
        updateProgress.mutate({
          sessionId,
          paragraphIndex: nextIndex,
          difficultyLevel: Math.round(microLevel)
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

  // Use morphed text if available, otherwise fall back to chapter data
  const displayText = physicalMode && morphedText 
    ? morphedText 
    : chapterData?.paragraphs[currentParagraph]?.levels[Math.round(microLevel)] || "";
  
  const totalParagraphs = chapterData?.paragraphs.length || 0;
  const progress = totalParagraphs > 0 
    ? ((currentParagraph + 1) / totalParagraphs) * 100 
    : 0;

  // Physical text style
  const physicalTextStyle: CSSProperties = physicalMode ? {
    fontVariationSettings: `"wght" ${typographyVars["--wght"]}, "GRAD" ${typographyVars["--grade"]}, "opsz" ${typographyVars["--opsz"]}`,
    letterSpacing: typographyVars["--ls"],
    lineHeight: typographyVars["--lh"],
    transition: "all 150ms ease",
    filter: `brightness(${1 + (microLevel - 2) * 0.05})`,
  } : {};

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Physical</span>
              <Switch 
                checked={physicalMode} 
                onCheckedChange={setPhysicalMode}
              />
            </div>
            <Badge variant="secondary">
              {LEVEL_NAMES[Math.round(microLevel) as keyof typeof LEVEL_NAMES]}
            </Badge>
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

        {/* Mind-Reader Slider */}
        <Card className="p-6 mb-6">
          <MindReaderSlider
            microLevel={microLevel}
            onChange={handleMicroLevelChange}
          />
        </Card>

        {/* Reading Area */}
        {isLoadingChapter ? (
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chapter...</p>
          </Card>
        ) : displayText ? (
          <Card 
            className={`p-8 mb-6 ${isLongPressing ? 'ring-2 ring-primary' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
          >
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${currentParagraph}-${Math.round(microLevel)}`}
                  ref={paragraphRef}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.4 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 20,
                    duration: 0.15 
                  }}
                  className="leading-relaxed text-lg select-none"
                  style={physicalTextStyle}
                >
                  {displayText}
                </motion.p>
              </AnimatePresence>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No content available at this level</p>
          </Card>
        )}

        {/* Navigation Controls */}
        <Card className="p-6 mb-4">
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

        {/* Info */}
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            {physicalMode ? (
              <>🪄 <strong>Physical Mode:</strong> Drag the slider to morph text. Long-press and drag vertically on the paragraph for tactile control.</>
            ) : (
              <>⚡ <strong>Instant Switching:</strong> Content adapts immediately - no loading!</>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
