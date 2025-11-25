import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const DEMO_PASSAGE = {
  text: "Adaptive reading keeps you in flow by matching text difficulty to your skill. When passages are too easy you lose focus; when too hard you feel overwhelmed. The sweet spot—called the Goldilocks zone—creates the perfect blend of challenge and confidence. Our engine senses this zone paragraph by paragraph, making sure the next section always feels achievable yet stimulating.",
  fleschKincaid: 6,
  questions: [
    {
      question: "What happens when reading is too easy?",
      options: [
        "You lose focus and drift",
        "You feel overwhelmed",
        "You learn faster",
        "You read more carefully"
      ],
      correctAnswer: 0
    },
    {
      question: "What is the Goldilocks zone?",
      options: [
        "A place to study",
        "A perfect challenge level",
        "A grading scale",
        "A reading technique"
      ],
      correctAnswer: 1
    }
  ]
};

const DEMO_RESULTS = {
  level: 3,
  readingSpeed: 220,
  comprehensionAccuracy: 85,
  strengths: ["focus", "pacing"],
  challenges: ["advanced vocabulary"]
};
const demoProfile = {
  level: DEMO_RESULTS.level,
  readingSpeed: DEMO_RESULTS.readingSpeed,
  comprehensionAccuracy: DEMO_RESULTS.comprehensionAccuracy,
  strengths: DEMO_RESULTS.strengths,
  challenges: DEMO_RESULTS.challenges,
};

export default function Calibration() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'intro' | 'reading' | 'questions' | 'results'>('intro');
  const [passage, setPassage] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [readingTime, setReadingTime] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<any>(null);

  const demoMode =
    import.meta.env.VITE_ENABLE_AUTH === "false" ||
    !import.meta.env.VITE_ENABLE_AUTH;

  console.log('[Calibration] demoMode:', demoMode, 'isAuthenticated:', isAuthenticated, 'loading:', loading, 'step:', step);

  const { data: passageData } = trpc.calibration.getPassage.useQuery(undefined, {
    enabled: !demoMode && step === 'intro'
  });

  const submitTest = trpc.calibration.submitTest.useMutation({
    onSuccess: (data) => {
      setResults(data);
      setStep('results');
    }
  });

  useEffect(() => {
    // Don't redirect if still loading or if in demo mode
    if (loading || demoMode) {
      return;
    }
    
    // Only redirect if auth is required and user is not authenticated
    if (!isAuthenticated) {
      console.log('[Calibration] Redirecting to login...');
      const loginUrl = getLoginUrl();
      // If getLoginUrl returns homepage (OAuth not configured), don't redirect
      if (loginUrl !== window.location.origin) {
        window.location.href = loginUrl;
      } else {
        // OAuth not configured, but auth is enabled - this shouldn't happen
        // Fall back to demo mode behavior
        console.warn('[Calibration] OAuth not configured but auth enabled, allowing access');
      }
    }
  }, [isAuthenticated, demoMode, loading]);

  useEffect(() => {
    if (passageData) {
      setPassage(passageData);
      setAnswers(new Array(passageData.questions.length).fill(-1));
    }
  }, [passageData]);

  useEffect(() => {
    if (demoMode && step === 'intro') {
      setPassage(DEMO_PASSAGE);
      setAnswers(new Array(DEMO_PASSAGE.questions.length).fill(-1));
    }
  }, [demoMode, step]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'reading' && startTime > 0) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimer(elapsed);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [step, startTime]);

  const handleStartReading = () => {
    setStartTime(Date.now());
    setStep('reading');
  };

  const handleFinishReading = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setReadingTime(elapsed);
    setStep('questions');
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (!passage) return;

    if (demoMode) {
      setResults({
        ...DEMO_RESULTS,
        readingSpeed: Math.max(
          150,
          Math.round((passage.text.split(/\s+/).length / Math.max(readingTime || 1, 1)) * 60)
        ),
      });
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify({
          id: "demo-user",
          name: "Demo Reader",
          email: "demo@adaptive-reader.local",
          profile: demoProfile,
        })
      );
      setStep('results');
      return;
    }

    submitTest.mutate({
      passageText: passage.text,
      passageDifficulty: passage.fleschKincaid,
      readingTime,
      answers
    });
  };

  const allAnswered = answers.every(a => a !== -1);

  // Show loading state while checking auth
  if (loading && !demoMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only block if auth is required, not loading, and user is not authenticated
  if (!isAuthenticated && !demoMode && !loading) {
    return null;
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Reading Level Calibration</h1>
            <p className="text-muted-foreground">
              This quick 60-second test will determine your reading level and create your personalized profile.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Read a short passage</p>
                <p className="text-sm text-muted-foreground">Take your time to understand the content</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Answer comprehension questions</p>
                <p className="text-sm text-muted-foreground">Test your understanding of what you read</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Get your reading profile</p>
                <p className="text-sm text-muted-foreground">See your level, speed, and personalized strengths</p>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleStartReading}
            disabled={!passage}
          >
            Start Calibration Test
          </Button>
        </Card>
      </div>
    );
  }

  if (step === 'reading') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Read the passage below</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg">{timer}s</span>
            </div>
          </div>

          <Card className="p-8 mb-6">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="leading-relaxed text-lg">{passage?.text}</p>
            </div>
          </Card>

          <Button size="lg" className="w-full" onClick={handleFinishReading}>
            I've Finished Reading
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'questions') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Comprehension Questions</h2>
            <p className="text-muted-foreground">Answer the following questions about the passage you just read.</p>
            <Progress value={(answers.filter(a => a !== -1).length / answers.length) * 100} className="mt-4" />
          </div>

          <div className="space-y-6">
            {passage?.questions.map((q: any, qIndex: number) => (
              <Card key={qIndex} className="p-6">
                <h3 className="font-semibold mb-4 text-lg">
                  {qIndex + 1}. {q.question}
                </h3>
                <RadioGroup
                  value={answers[qIndex]?.toString()}
                  onValueChange={(value) => handleAnswerChange(qIndex, parseInt(value))}
                >
                  <div className="space-y-3">
                    {q.options.map((option: string, oIndex: number) => (
                      <div key={oIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                        <Label htmlFor={`q${qIndex}-o${oIndex}`} className="cursor-pointer flex-1">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </Card>
            ))}
          </div>

          <Button 
            size="lg" 
            className="w-full mt-8" 
            onClick={handleSubmit}
            disabled={!allAnswered || submitTest.isPending}
          >
            {submitTest.isPending ? "Analyzing..." : "Submit Answers"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'results' && results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <span className="text-4xl font-bold text-primary">L{results.level}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Your Reading Profile</h1>
            <p className="text-muted-foreground">
              Level {results.level} of 7 • {results.readingSpeed} WPM • {results.comprehensionAccuracy}% Accuracy
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-3 text-lg">Strengths</h3>
              {results.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {results.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="capitalize">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Continue practicing to identify strengths</p>
              )}
            </Card>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-3 text-lg">Areas to Improve</h3>
              {results.challenges.length > 0 ? (
                <ul className="space-y-2">
                  {results.challenges.map((c: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      <span className="capitalize">{c}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Great job! No major challenges identified</p>
              )}
            </Card>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-2">What This Means</h3>
            <p className="text-sm text-muted-foreground">
              Content will be adapted to Level {results.level}, keeping you challenged but not overwhelmed. 
              As you demonstrate mastery, difficulty will automatically increase to help you grow.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              if (demoMode) {
                setLocation("/reader/1");
              } else {
                setLocation("/library");
              }
            }}
          >
            Start Reading
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
