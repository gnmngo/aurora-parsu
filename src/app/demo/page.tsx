"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Play, 
  ArrowRight, 
  UserCheck, 
  CheckCircle, 
  Loader2, 
  ShieldAlert, 
  Eye, 
  FileText, 
  CheckSquare, 
  Award,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

interface Step {
  title: string;
  role: string;
  email: string;
  description: string;
  targetPath: string;
  icon: any;
  badge: string;
}

export default function DemoGuidedFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [loggingIn, setLoggingIn] = useState(false);
  const supabase = createClient();

  const steps: Step[] = [
    {
      title: "1. Student Project Creation & Submission",
      role: "Student",
      email: "student1@parsu.edu.ph",
      description: "Log in as student to set up research topics, view the defense stages progression stepper, upload the jsPDF manuscript draft, and track comments.",
      targetPath: "/dashboard",
      icon: UserCheck,
      badge: "Student Role"
    },
    {
      title: "2. Coordinator Defense Scheduling",
      role: "Coordinator",
      email: "coordinator1@parsu.edu.ph",
      description: "Log in as Coordinator to publish evaluation rubrics, schedule defense rooms and timeslots on the interactive calendar grid, and resolve panel conflicts.",
      targetPath: "/dashboard/defenses/schedule",
      icon: Play,
      badge: "Coordinator Role"
    },
    {
      title: "3. Adviser Annotation Workspace",
      role: "Adviser",
      email: "adviser1@parsu.edu.ph",
      description: "Log in as Guidance Adviser. Open the split-screen PDF annotation panel to mark text concerns, reply to reviews, and track progress.",
      targetPath: "/dashboard",
      icon: Eye,
      badge: "Adviser Role"
    },
    {
      title: "4. Panelist Evaluation & E-Signature",
      role: "Panelist",
      email: "panelist1@parsu.edu.ph",
      description: "Log in as Defense Panelist. View assigned defenses, score significance criteria on the active rubric template, and sign with an immutable certificate serial.",
      targetPath: "/dashboard",
      icon: Award,
      badge: "Panelist Role"
    },
    {
      title: "5. Public Certificate Verification",
      role: "Public Guest",
      email: "",
      description: "Verify digital certificate serial codes without logging in. View verified metadata, total scores, verdicts, and cryptographic timestamp logs.",
      targetPath: "/verify",
      icon: CheckCircle,
      badge: "Public Access"
    },
    {
      title: "6. SysAdmin Monitoring & Reset",
      role: "System Administrator",
      email: "admin1@parsu.edu.ph",
      description: "Log in as SysAdmin to check diagnostic health parameters (database online indicators, storage usage) and trigger a full demonstration reset back to clean seeded states.",
      targetPath: "/admin/system-health",
      icon: ShieldAlert,
      badge: "Administrator"
    }
  ];

  const handleQuickLogin = async (step: Step) => {
    if (!step.email) {
      // Direct navigate if guest
      window.location.href = step.targetPath;
      return;
    }

    setLoggingIn(true);
    try {
      // Sign out first to clean session
      await supabase.auth.signOut();
      
      const { error } = await supabase.auth.signInWithPassword({
        email: step.email,
        password: "password123"
      });

      if (error) throw error;
      
      toast.success(`Logged in successfully as ${step.role}!`);
      setTimeout(() => {
        window.location.href = step.targetPath;
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Bypass login failed.");
    } finally {
      setLoggingIn(false);
    }
  };

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-xs font-semibold text-slate-800">
      {/* Side Stepper Navigation */}
      <div className="w-full md:w-80 bg-card border-r border-border/80 p-6 space-y-6 shrink-0 flex flex-col">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Guided Capstone Flow</h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Presentation Walkthroughs</p>
        </div>

        <div className="flex-1 space-y-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${idx === activeStep ? "border-primary/30 bg-primary/5 text-primary shadow-sm" : "border-border/60 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === activeStep ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold truncate text-[11px]">{s.title.substring(3)}</p>
                  <p className="text-[9px] text-muted-foreground">{s.role}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-border pt-4 text-center">
          <Link href="/presentation">
            <Button variant="outline" size="sm" className="w-full rounded-xl gap-1">
              Launch Presentation Mode <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Slide Card Detail */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-6">
        <Card className="w-full border border-border/80 shadow-lg p-8 space-y-6 bg-card">
          <div className="flex items-center justify-between">
            <Badge variant="info" className="text-[9px] font-extrabold uppercase px-2.5 py-0.5">
              {currentStep.badge}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-bold">Step {activeStep + 1} of {steps.length}</span>
          </div>

          <div className="flex gap-4 items-start">
            <div className="p-4 rounded-2xl bg-primary/5 text-primary shrink-0">
              <StepIcon className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 leading-snug">{currentStep.title}</h1>
              <p className="text-xs text-muted-foreground font-semibold">Role Account: {currentStep.email || "Public Guest Access"}</p>
            </div>
          </div>

          <p className="text-sm font-medium text-slate-600 leading-relaxed pt-2">
            {currentStep.description}
          </p>

          <div className="border-t border-border pt-6 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-1.5">
              {activeStep > 0 && (
                <Button 
                  onClick={() => setActiveStep(activeStep - 1)} 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 rounded-xl"
                >
                  Previous
                </Button>
              )}
              {activeStep < steps.length - 1 && (
                <Button 
                  onClick={() => setActiveStep(activeStep + 1)} 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 rounded-xl"
                >
                  Next
                </Button>
              )}
            </div>

            <Button
              onClick={() => handleQuickLogin(currentStep)}
              disabled={loggingIn}
              size="sm"
              className="h-9 px-5 rounded-xl gap-1.5 font-bold"
            >
              {loggingIn ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  {currentStep.email ? `Login as ${currentStep.role}` : "Proceed"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
