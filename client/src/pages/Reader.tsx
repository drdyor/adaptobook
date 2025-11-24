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
import { useEffect, useState, useRef, useCallback, useMemo, CSSProperties } from "react";
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

  const demoMode =
    import.meta.env.VITE_ENABLE_AUTH === "false" ||
    !import.meta.env.VITE_ENABLE_AUTH;

  const [demoChapters, setDemoChapters] = useState<Record<number, { paragraphs: Array<{ levels: Record<number, string> }> }> | null>(null);
  const [demoWordSequences, setDemoWordSequences] = useState<Record<string, WordSequenceEntry[]>>({});
  const [demoContentMeta, setDemoContentMeta] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(demoMode);

  const { data: profile } = trpc.profile.get.useQuery(undefined, {
    enabled: !demoMode,
  });
  const { data: content } = trpc.content.get.useQuery(
    { id: contentId },
    { enabled: !!id && !demoMode }
  );

  const { data: chapter, isLoading: isLoadingChapterQuery } = trpc.content.getChapter.useQuery(
    { contentId, chapterNumber: currentChapter },
    { enabled: !!id && !demoMode }
  );

  // Fetch word-level data for the current paragraph
  const { data: wordSeq } = trpc.wordLevel.getWordSeq.useQuery(
    { contentId, paragraphIndex: currentParagraph },
    { enabled: !!id && physicalMode && !demoMode }
  );

  const startSession = trpc.reading.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
    }
  });

  const updateProgress = trpc.reading.updateProgress.useMutation();
  const saveMicroLevel = trpc.wordLevel.saveMicroLevel.useMutation();

  // Get morphed text from word sequences
  const effectiveWordSeq = demoMode
    ? demoWordSequences[`${currentChapter}-${currentParagraph}`]
    : (wordSeq as WordSequenceEntry[] | undefined);
  const morphedText = useWordLevelMorph(effectiveWordSeq, microLevel);

  // Get typography CSS variables
  const typographyVars = getTypographyVars(microLevel);

  useEffect(() => {
    if (!isAuthenticated && !demoMode) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, demoMode]);

  const demoProfile = useMemo(() => {
    if (!demoMode || typeof window === "undefined") return null;
    try {
      const stored = JSON.parse(localStorage.getItem("manus-runtime-user-info") ?? "null");
      if (stored?.profile) {
        return {
          ...stored.profile,
          microLevel: stored.profile.microLevel ?? Math.min(4, Math.max(1, stored.profile.level ?? 2)),
        };
      }
    } catch {
      // ignore
    }
    return { level: 3, microLevel: 2 };
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) {
      setMicroLevel(demoProfile?.microLevel ?? 2);
      return;
    }

    if (content && profile && !sessionId) {
      const initialMicroLevel = profile.microLevel ?? Math.min(4, Math.max(1, profile.level));
      setMicroLevel(initialMicroLevel);

      startSession.mutate({
        contentId: content.id,
        difficultyLevel: Math.round(initialMicroLevel),
      });
    }
  }, [demoMode, content, profile, sessionId, demoProfile, startSession]);

  useEffect(() => {
    if (demoMode) {
      if (demoChapters && demoChapters[currentChapter]) {
        setChapterData(demoChapters[currentChapter]);
      }
      return;
    }

    if (chapter) {
      setChapterData(chapter);
    }
  }, [chapter, demoMode, demoChapters, currentChapter]);

  useEffect(() => {
    if (!demoMode) return;
    setDemoLoading(true);
    fetch("/demo-the-prince-variants.json")
      .then((resp) => resp.json())
      .then((data) => {
        const { chapters, wordSequences } = transformDemoVariants(data);
        setDemoChapters(chapters);
        setDemoWordSequences(wordSequences);
        setDemoContentMeta(data);
      })
      .catch((error) => console.error("[demo] Failed to load variants", error))
      .finally(() => setDemoLoading(false));
  }, [demoMode]);

  // Debounced save of microLevel
  const debouncedSaveMicroLevel = useMemo(
    () =>
      debounce((level: number) => {
        saveMicroLevel.mutate({ microLevel: level });
      }, 500),
    [saveMicroLevel]
  );

  useEffect(() => {
    return () => {
      debouncedSaveMicroLevel.cancel();
    };
  }, [debouncedSaveMicroLevel]);

  const handleMicroLevelChange = (value: number) => {
    setMicroLevel(value);
    
    // Trigger haptic feedback
    if (physicalMode) {
      triggerHaptic(value);
    }

    if (!demoMode) {
      debouncedSaveMicroLevel(value);
    } else if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("manus-runtime-user-info") ?? "{}");
        stored.profile = stored.profile ?? {};
        stored.profile.microLevel = value;
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(stored));
      } catch {
        // ignore
      }
    }

    if (sessionId && !demoMode) {
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
      
      if (sessionId && !demoMode) {
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

  const effectiveProfile = demoMode ? demoProfile : profile;
  const effectiveContent = demoMode ? demoContentMeta : content;
  const isLoadingChapter = demoMode ? demoLoading || !demoChapters?.[currentChapter] : isLoadingChapterQuery;

  if (!isAuthenticated || !effectiveProfile || !effectiveContent || (demoMode && !demoChapters?.[currentChapter] && demoLoading)) {
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
          <h1 className="text-3xl font-bold mb-2">{effectiveContent?.title ?? "Demo Book"}</h1>
          {effectiveContent?.author && (
            <p className="text-muted-foreground">by {effectiveContent.author}</p>
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
              disabled={currentChapter >= (demoMode ? (demoContentMeta?.totalChapters ?? 5) : 5)}
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
  let timeoutId: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced as ((...args: Parameters<T>) => void) & { cancel: () => void };
}

function transformDemoVariants(data: any) {
  const chapters: Record<number, { paragraphs: Array<{ levels: Record<number, string> }> }> = {};
  const wordSequences: Record<string, WordSequenceEntry[]> = {};

  const chapterMap = new Map<number, Map<number, { levels: Record<number, string> }>>();

  data.variants.forEach((variant: any) => {
    if (!chapterMap.has(variant.chapterNumber)) {
      chapterMap.set(variant.chapterNumber, new Map());
    }
    const paragraphMap = chapterMap.get(variant.chapterNumber)!;
    if (!paragraphMap.has(variant.paragraphIndex)) {
      paragraphMap.set(variant.paragraphIndex, { levels: {} });
    }
    const paragraph = paragraphMap.get(variant.paragraphIndex)!;
    paragraph.levels[variant.level] = variant.text;
  });

  chapterMap.forEach((paragraphMap, chapterNumber) => {
    const paragraphs = Array.from(paragraphMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([paragraphIndex, data]) => {
        const levels = {
          1: data.levels[1] ?? data.levels[4] ?? "",
          2: data.levels[2] ?? data.levels[4] ?? "",
          3: data.levels[3] ?? data.levels[4] ?? "",
          4: data.levels[4] ?? "",
        };

        const key = `${chapterNumber}-${paragraphIndex}`;
        wordSequences[key] = buildWordSequenceFromLevels(levels);

        return { levels };
      });

    chapters[chapterNumber] = { paragraphs };
  });

  return { chapters, wordSequences };
}

function buildWordSequenceFromLevels(levels: Record<number, string>): WordSequenceEntry[] {
  const tokens = [1, 2, 3, 4].map((level) =>
    levels[level] ? levels[level].split(/\s+/).filter(Boolean) : []
  );
  const maxLen = Math.max(...tokens.map((arr) => arr.length));

  const sequence: WordSequenceEntry[] = [];

  for (let i = 0; i < maxLen; i++) {
    sequence.push({
      word: tokens[3][i] ?? tokens[2][i] ?? tokens[1][i] ?? tokens[0][i] ?? "",
      level1: tokens[0][i] ?? tokens[3][i] ?? "",
      level2: tokens[1][i] ?? tokens[3][i] ?? "",
      level3: tokens[2][i] ?? tokens[3][i] ?? "",
      level4: tokens[3][i] ?? "",
    });
  }

  return sequence.filter((entry) => entry.word.length > 0);
}
