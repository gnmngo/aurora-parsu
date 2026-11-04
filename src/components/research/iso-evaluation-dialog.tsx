"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  ISO_25010_CHARACTERISTICS,
  REVERSE_CODED_SUS_IDS,
  computeSingleSusScore,
  getSusAdjectiveRating,
} from "@/lib/analytics/iso25010";
import { submitIsoEvaluationAction } from "@/lib/research/actions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { SurveyDemographicProfile } from "@/types/research";

interface IsoEvaluationDialogProps {
  onEvaluationSubmitted?: () => void;
  triggerButton?: React.ReactNode;
}

const AGE_OPTIONS: SurveyDemographicProfile["ageGroup"][] = [
  "17 – 19",
  "20 – 22",
  "23 or Above",
];

const GENDER_OPTIONS: SurveyDemographicProfile["gender"][] = [
  "Male",
  "Female",
  "Prefer not to say",
];

export function IsoEvaluationDialog({
  onEvaluationSubmitted,
  triggerButton,
}: IsoEvaluationDialogProps) {
  const { profile, activeRole, roles } = useAuth();
  const [open, setOpen] = useState(false);
  // Step 0 = Demographic Profile, Steps 1..N = ISO_25010_CHARACTERISTICS[stepIndex - 1]
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [fullName, setFullName] = useState("");
  const [ageGroup, setAgeGroup] = useState<SurveyDemographicProfile["ageGroup"]>("20 – 22");
  const [gender, setGender] = useState<SurveyDemographicProfile["gender"]>("Prefer not to say");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = ISO_25010_CHARACTERISTICS.length + 1; // 1 Demographic step + 7 Construct steps
  const isDemographicStep = activeStepIndex === 0;
  const currentCategory = !isDemographicStep
    ? ISO_25010_CHARACTERISTICS[activeStepIndex - 1]
    : null;

  // Pre-fill optional name & default ratings when opened
  useEffect(() => {
    if (open) {
      if (profile && !fullName) {
        const defaultName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
        if (defaultName) setFullName(defaultName);
      }
      if (Object.keys(ratings).length === 0) {
        const initial: Record<string, number> = {};
        ISO_25010_CHARACTERISTICS.forEach((cat) => {
          cat.subCriteria.forEach((sub) => {
            // Even SUS items are negatively worded, so 1 (Strongly Disagree) is the positive usability default
            initial[sub.id] = REVERSE_CODED_SUS_IDS.has(sub.id) ? 1 : 5;
          });
        });
        setRatings(initial);
      }
    }
  }, [open, profile, fullName, ratings]);

  const handleScoreChange = (subId: string, score: number) => {
    setRatings((prev) => ({ ...prev, [subId]: score }));
  };

  const handleNext = () => {
    if (activeStepIndex < totalSteps - 1) {
      setActiveStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const effectiveRole = activeRole || roles[0] || "student";
      const demographicPrefix = `[Demographics | Name: ${fullName.trim() || "Anonymous"} | Age: ${ageGroup} | Gender: ${gender} | Role: ${effectiveRole}]`;
      const combinedComments = comments.trim()
        ? `${demographicPrefix} ${comments.trim()}`
        : demographicPrefix;

      const res = await submitIsoEvaluationAction({
        ratings,
        comments: combinedComments,
        activeRole: effectiveRole,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit evaluation.");
        return;
      }

      setSubmitted(true);
      toast.success(
        "Thank you! Your Objective 4 System Usability (SUS) & UTAUT Evaluation has been recorded."
      );
      if (onEvaluationSubmitted) {
        onEvaluationSubmitted();
      }
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setActiveStepIndex(0);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const liveSusScore = computeSingleSusScore(ratings);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" className="gap-2 font-bold shadow-sm bg-primary text-white">
            <Award className="h-4 w-4" />
            Evaluate AURORA (SUS &amp; UTAUT)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase text-primary border-primary/30"
            >
              Objective 4 • SUS &amp; UTAUT Survey
            </Badge>
            <span className="text-xs font-bold text-muted-foreground">
              Step {activeStepIndex + 1} of {totalSteps}
            </span>
          </div>
          <DialogTitle className="text-base font-bold flex items-center gap-2 pt-1 text-foreground">
            <Sparkles className="h-5 w-5 text-amber-500" />
            System Usability Scale (SUS) &amp; UTAUT Acceptability Survey
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assess the usability and technology acceptance of the AURORA platform based on Research Objective 4.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <h3 className="text-base font-bold text-foreground">
              Survey Response Successfully Recorded!
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your Demographic Profile, System Usability Scale (SUS), and UTAUT ratings have been saved to the Objective 4 research dataset.
            </p>
          </div>
        ) : isDemographicStep ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary text-white text-[10px] font-black px-2 py-0.5 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> PROFILE
                </span>
                <h4 className="text-sm font-bold text-foreground">Demographic Profile</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please provide your basic demographic information before proceeding to Part I (System Usability Scale) and Part II (UTAUT).
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name (Optional) */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <Label className="text-xs font-bold text-foreground">
                  Full Name <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name (optional)"
                  className="h-9 text-xs"
                />
              </div>

              {/* Age */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <Label className="text-xs font-bold text-foreground">Age</Label>
                <div className="grid grid-cols-3 gap-2">
                  {AGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAgeGroup(option)}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-xs font-bold transition-all text-center",
                        ageGroup === option
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <Label className="text-xs font-bold text-foreground">Gender</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-xs font-bold transition-all text-center",
                        gender === option
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : currentCategory ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Category Banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary text-white text-[10px] font-black px-2 py-0.5">
                    {currentCategory.code}
                  </span>
                  <h4 className="text-sm font-bold text-foreground">{currentCategory.name}</h4>
                </div>
                {currentCategory.partLabel && (
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {currentCategory.partLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentCategory.description}
              </p>
              {currentCategory.id === "sus" && typeof liveSusScore === "number" && (
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-primary">
                  <span>Computed SUS Score: {liveSusScore.toFixed(1)} / 100</span>
                  <Badge variant="outline" className="text-[9px] font-black border-primary/30 text-primary">
                    {getSusAdjectiveRating(liveSusScore)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Questions for this construct */}
            <div className="space-y-4">
              {currentCategory.subCriteria.map((sub) => {
                const defaultVal = REVERSE_CODED_SUS_IDS.has(sub.id) ? 1 : 5;
                const currentVal = ratings[sub.id] ?? defaultVal;
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {sub.name}.{" "}
                          <span className="font-medium text-foreground">{sub.question}</span>
                        </p>
                      </div>
                      {sub.isReverseCoded && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-semibold text-amber-600 border-amber-500/30 shrink-0"
                        >
                          Negatively Worded
                        </Badge>
                      )}
                    </div>

                    {/* 5-Point Likert Selector */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[5, 4, 3, 2, 1].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleScoreChange(sub.id, val)}
                          className={cn(
                            "flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center transition-all",
                            currentVal === val
                              ? "border-primary bg-primary text-white shadow-sm font-black"
                              : "border-border bg-background text-muted-foreground hover:bg-muted font-bold"
                          )}
                        >
                          <span className="text-sm">{val}</span>
                          <span className="text-[8px] truncate max-w-full opacity-80">
                            {val === 5
                              ? "Strongly Agree"
                              : val === 4
                              ? "Agree"
                              : val === 3
                              ? "Neutral"
                              : val === 2
                              ? "Disagree"
                              : "Strongly Disagree"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Qualitative Feedback on last category */}
            {activeStepIndex === totalSteps - 1 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold text-foreground">
                  Additional Comments / Suggestions (Optional)
                </Label>
                <textarea
                  value={comments}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setComments(e.target.value)
                  }
                  placeholder="Share any additional feedback regarding Aurora's usability and acceptance..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-20 resize-none"
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Navigation */}
        {!submitted && (
          <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={activeStepIndex === 0 || submitting}
              className="gap-1 font-bold text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-1.5">
              {activeStepIndex < totalSteps - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 font-bold text-xs"
                >
                  {isDemographicStep ? "Start Part I (SUS)" : "Next Section"}{" "}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Submit Survey
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
