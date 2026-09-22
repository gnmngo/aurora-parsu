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
import { Label } from "@/components/ui/label";
import { Award, Check, ChevronLeft, ChevronRight, Loader2, Star, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ISO_25010_CHARACTERISTICS } from "@/lib/analytics/iso25010";
import { submitIsoEvaluationAction } from "@/lib/research/actions";
import { cn } from "@/lib/utils";

interface IsoEvaluationDialogProps {
  onEvaluationSubmitted?: () => void;
  triggerButton?: React.ReactNode;
}

export function IsoEvaluationDialog({ onEvaluationSubmitted, triggerButton }: IsoEvaluationDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentCategory = ISO_25010_CHARACTERISTICS[activeCategoryIndex];
  const totalCategories = ISO_25010_CHARACTERISTICS.length;

  // Initialize default ratings with 5 if unset
  useEffect(() => {
    if (open && Object.keys(ratings).length === 0) {
      const initial: Record<string, number> = {};
      ISO_25010_CHARACTERISTICS.forEach((cat) => {
        cat.subCriteria.forEach((sub) => {
          initial[sub.id] = 5;
        });
      });
      setRatings(initial);
    }
  }, [open, ratings]);

  const handleScoreChange = (subId: string, score: number) => {
    setRatings((prev) => ({ ...prev, [subId]: score }));
  };

  const handleNext = () => {
    if (activeCategoryIndex < totalCategories - 1) {
      setActiveCategoryIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeCategoryIndex > 0) {
      setActiveCategoryIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitIsoEvaluationAction({
        ratings,
        comments,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit evaluation.");
        return;
      }

      setSubmitted(true);
      toast.success("Thank you! Your ISO 25010 Software Quality Evaluation has been recorded.");
      if (onEvaluationSubmitted) {
        onEvaluationSubmitted();
      }
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setActiveCategoryIndex(0);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const scoreLabels: Record<number, string> = {
    5: "5 - Strongly Agree (Highly Acceptable)",
    4: "4 - Agree (Acceptable)",
    3: "3 - Neutral (Moderately Acceptable)",
    2: "2 - Disagree (Slightly Acceptable)",
    1: "1 - Strongly Disagree (Not Acceptable)",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" className="gap-2 font-bold shadow-sm bg-primary text-white">
            <Award className="h-4 w-4" />
            Evaluate AURORA (ISO 25010)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/30">
              ISO/IEC 25010 Quality Model
            </Badge>
            <span className="text-xs font-bold text-muted-foreground">
              Characteristic {activeCategoryIndex + 1} of {totalCategories}
            </span>
          </div>
          <DialogTitle className="text-base font-bold flex items-center gap-2 pt-1 text-foreground">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Software Quality &amp; Acceptability Evaluation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Evaluate AURORA against international software quality standards for the undergraduate capstone defense study.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <h3 className="text-base font-bold text-foreground">Evaluation Successfully Recorded!</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your empirical ratings have been incorporated into the Research Objective 3 statistical dataset.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Category Banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary text-white text-[10px] font-black px-2 py-0.5">
                  {currentCategory.code}
                </span>
                <h4 className="text-sm font-bold text-foreground">{currentCategory.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentCategory.description}
              </p>
            </div>

            {/* Questions for this category */}
            <div className="space-y-4">
              {currentCategory.subCriteria.map((sub, sIdx) => {
                const currentVal = ratings[sub.id] || 5;
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-primary/40"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {sIdx + 1}. {sub.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                        {sub.question}
                      </p>
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
                            {val === 5 ? "Strongly Agree" : val === 4 ? "Agree" : val === 3 ? "Neutral" : val === 2 ? "Disagree" : "Strongly Dis"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Qualitative Feedback on last category */}
            {activeCategoryIndex === totalCategories - 1 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold text-foreground">
                  Qualitative Feedback &amp; Recommendations (Optional)
                </Label>
                <textarea
                  value={comments}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                  placeholder="Share specific observations regarding system usability, split-screen annotations, or defense deliberations..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-20 resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        {!submitted && (
          <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={activeCategoryIndex === 0 || submitting}
              className="gap-1 font-bold text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-1.5">
              {activeCategoryIndex < totalCategories - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 font-bold text-xs"
                >
                  Next Category <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Submit Evaluation
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
