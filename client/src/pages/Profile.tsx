import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Profile() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = trpc.profile.get.useQuery();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Profile Yet</h2>
          <p className="text-muted-foreground mb-6">
            Take the calibration test to create your personalized reading profile.
          </p>
          <Button onClick={() => setLocation("/calibration")}>
            Take Calibration Test
          </Button>
        </Card>
      </div>
    );
  }

  const levelDescriptions = [
    "",
    "Elementary (Grade 1-2)",
    "Early Elementary (Grade 3-4)",
    "Upper Elementary (Grade 5-6)",
    "Middle School (Grade 7-8)",
    "High School (Grade 9-10)",
    "Advanced High School (Grade 11-12)",
    "College/Adult (Grade 13+)"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Reading Profile</h1>
          <Button onClick={() => setLocation("/library")}>
            Library
          </Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        {/* Level Overview */}
        <Card className="p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
              <span className="text-5xl font-bold text-primary">L{profile.level}</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Level {profile.level}</h2>
            <p className="text-lg text-muted-foreground">{levelDescriptions[profile.level]}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{profile.readingSpeed}</div>
              <div className="text-sm text-muted-foreground">Words Per Minute</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{profile.comprehensionAccuracy}%</div>
              <div className="text-sm text-muted-foreground">Comprehension</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {new Date(profile.lastCalibrated).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Last Calibrated</div>
            </div>
          </div>
        </Card>

        {/* Strengths and Challenges */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Strengths</h3>
            </div>
            {profile.strengths && profile.strengths.length > 0 ? (
              <ul className="space-y-3">
                {profile.strengths.map((strength: string, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="capitalize">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Continue reading to identify your strengths</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h3 className="text-xl font-semibold">Growth Areas</h3>
            </div>
            {profile.challenges && profile.challenges.length > 0 ? (
              <ul className="space-y-3">
                {profile.challenges.map((challenge: string, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="capitalize">{challenge}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No specific challenges identified yet</p>
            )}
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Reading Level Scale</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <div key={level} className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  level === profile.level 
                    ? 'bg-primary text-primary-foreground' 
                    : level < profile.level
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {level}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{levelDescriptions[level]}</div>
                </div>
                {level === profile.level && (
                  <div className="text-sm font-medium text-primary">Current Level</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button size="lg" className="flex-1" onClick={() => setLocation("/library")}>
            Continue Reading
          </Button>
          <Button size="lg" variant="outline" onClick={() => setLocation("/calibration")}>
            Recalibrate
          </Button>
        </div>
      </div>
    </div>
  );
}
