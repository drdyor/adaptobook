import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Brain, TrendingUp, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated
  });

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (profile) {
      setLocation("/library");
    } else {
      setLocation("/calibration");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{APP_TITLE}</span>
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setLocation("/library")}>
                Library
              </Button>
              {profile && (
                <Button variant="ghost" onClick={() => setLocation("/profile")}>
                  Profile
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={() => window.location.href = getLoginUrl()}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Reading That Adapts to You
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Experience personalized reading with AI-powered difficulty adjustment. 
            Every paragraph adapts to your level, keeping you in the perfect flow state 
            for maximum learning and comprehension.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
              {profile ? "Continue Reading" : "Start 60-Second Test"}
            </Button>
            {profile && (
              <Button size="lg" variant="outline" onClick={() => setLocation("/profile")}>
                View Profile
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-card/50 backdrop-blur border-border/40">
            <Brain className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">60-Second Assessment</h3>
            <p className="text-muted-foreground">
              Quick calibration test determines your reading level, speed, and comprehension strengths.
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur border-border/40">
            <Zap className="h-10 w-10 text-accent mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-Time Adaptation</h3>
            <p className="text-muted-foreground">
              Content difficulty adjusts paragraph-by-paragraph based on your performance.
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur border-border/40">
            <TrendingUp className="h-10 w-10 text-chart-2 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Progressive Growth</h3>
            <p className="text-muted-foreground">
              Difficulty increases automatically when you're ready, ensuring continuous improvement.
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur border-border/40">
            <BookOpen className="h-10 w-10 text-chart-3 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Any Content</h3>
            <p className="text-muted-foreground">
              Read any book or article at your perfect difficulty level, from children's books to academic texts.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-24 bg-muted/30 -mx-4 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Take the Calibration Test</h3>
                <p className="text-muted-foreground">
                  Read a short passage and answer a few questions. We'll assess your reading speed, 
                  comprehension, and assign you to one of 7 difficulty levels.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Choose Your Content</h3>
                <p className="text-muted-foreground">
                  Select from our library or paste your own text. The AI will automatically 
                  adapt it to your current reading level.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Read and Grow</h3>
                <p className="text-muted-foreground">
                  As you read, difficulty adjusts in real-time. High comprehension? Level increases. 
                  Struggling? Level decreases. You're always in the optimal learning zone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Reading?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join readers who are experiencing personalized, adaptive learning that grows with them.
        </p>
        <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
          {isAuthenticated ? (profile ? "Go to Library" : "Take Calibration Test") : "Get Started Free"}
        </Button>
      </section>
    </div>
  );
}
