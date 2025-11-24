import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function Library() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const demoMode =
    import.meta.env.VITE_ENABLE_AUTH === "false" ||
    !import.meta.env.VITE_ENABLE_AUTH;
  const [demoContent, setDemoContent] = useState<any>(null);

  const { data: profile } = trpc.profile.get.useQuery(undefined, {
    enabled: !demoMode,
  });
  const { data: content, isLoading } = trpc.content.list.useQuery(undefined, {
    enabled: !demoMode,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  const demoProfile = useMemo(() => {
    if (!demoMode || typeof window === "undefined") return null;
    try {
      const stored = JSON.parse(localStorage.getItem("manus-runtime-user-info") ?? "null");
      if (stored?.profile) {
        return stored.profile;
      }
    } catch {
      // ignore
    }
    return { level: 3 };
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    fetch("/demo-the-prince-variants.json")
      .then((resp) => resp.json())
      .then((data) => setDemoContent(data))
      .catch((error) => console.error("[demo] Failed to load content", error));
  }, [demoMode]);

  if (!demoMode && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Calibration Required</h2>
          <p className="text-muted-foreground mb-6">
            Please complete the calibration test before accessing the library.
          </p>
          <Button onClick={() => setLocation("/calibration")}>
            Take Calibration Test
          </Button>
        </Card>
      </div>
    );
  }

  const effectiveProfile = demoMode ? demoProfile : profile;

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (difficulty <= 4) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (difficulty <= 6) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Elementary";
    if (difficulty <= 4) return "Intermediate";
    if (difficulty <= 6) return "Advanced";
    return "Expert";
  };

  const effectiveContent = demoMode
    ? demoContent
      ? [
          {
            id: 1,
            title: demoContent.title,
            author: demoContent.author,
            baseDifficulty: 4,
            wordCount: demoContent.totalParagraphs * 100,
            category: "classic-literature",
            originalText: demoContent.variants.find((v: any) => v.level === 4)?.text ?? "",
          },
        ]
      : []
    : content;

  const isContentLoading = demoMode ? !demoContent : isLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")}>
              ← Home
            </Button>
            <h1 className="text-xl font-bold">Content Library</h1>
          </div>
          <div className="flex items-center gap-4">
            {effectiveProfile?.level && (
              <div className="text-sm text-muted-foreground">
                Your Level: <span className="font-bold text-primary">L{effectiveProfile.level}</span>
              </div>
            )}
            <Button variant="outline" onClick={() => setLocation("/upload")}>
              Upload PDF
            </Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>
              Profile
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-12">
        {/* Info Banner */}
        {effectiveProfile?.level && (
          <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <BookOpen className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Adaptive Reading</h3>
                <p className="text-sm text-muted-foreground">
                  All content will be automatically adapted to your Level {effectiveProfile.level}. 
                  Difficulty adjusts in real-time based on your comprehension.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Content Grid */}
        {isContentLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading library...</p>
          </div>
        ) : effectiveContent && effectiveContent.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {effectiveContent.map((item: any) => (
              <Card key={item.id} className="p-6 hover:border-primary/40 transition-colors">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{item.title}</h3>
                  </div>
                  {item.author && (
                    <p className="text-sm text-muted-foreground mb-3">by {item.author}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={getDifficultyColor(item.baseDifficulty)}>
                      {getDifficultyLabel(item.baseDifficulty)}
                    </Badge>
                    {item.category && (
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {item.wordCount} words
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {item.originalText.substring(0, 150)}...
                </p>

                <Button 
                  className="w-full" 
                  onClick={() => setLocation(`/reader/${item.id}`)}
                >
                  Start Reading
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
            <p className="text-muted-foreground">
              Check back soon for new reading materials.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
