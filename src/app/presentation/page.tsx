"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  Shield, 
  Award, 
  Calendar, 
  HardDrive, 
  Loader2, 
  ArrowRight,
  Maximize2,
  Tv
} from "lucide-react";

export default function PresentationModePage() {
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const supabase = createClient();

  const presentationRoles = [
    { name: "Student", email: "student1@parsu.edu.ph", icon: Users, desc: "Submit paper, view timeline stepper, revise and check notes." },
    { name: "Adviser", email: "adviser1@parsu.edu.ph", icon: Shield, desc: "Check advisees directory, annotate text issues, write comments." },
    { name: "Panelist", email: "panelist1@parsu.edu.ph", icon: Award, desc: "View scheduling, complete grading rubric, sign evaluation cert." },
    { name: "Coordinator", email: "coordinator1@parsu.edu.ph", icon: Calendar, desc: "Create defenses calendar, check conflicts, publish stages." },
    { name: "System Admin", email: "admin1@parsu.edu.ph", icon: HardDrive, desc: "View system health, monitor active stats, trigger demo reset." }
  ];

  const handleRoleBypass = async (roleName: string, email: string) => {
    setLoggingIn(roleName);
    try {
      await supabase.auth.signOut();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "password123"
      });

      if (error) throw error;
      toast.success(`Presentation bypass successful: ${roleName}`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Bypass login failed.");
    } finally {
      setLoggingIn(null);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        toast.error("Fullscreen mode blocked by browser.");
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-8 text-xs font-semibold select-none">
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              AURORA Presentation Console
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Paperless Academic Defense Workflow System
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleToggleFullscreen} variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-200">
            <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
          </Button>
          <Badge className="bg-primary/20 text-primary border-0 text-[9px] uppercase px-3 py-1 font-extrabold">
            Jury Mode
          </Badge>
        </div>
      </div>

      {/* Main console content */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto space-y-8 w-full">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Select Journey Role</h2>
          <p className="text-xs text-slate-400 font-medium max-w-lg mx-auto">
            Click any account below to instantly authenticate and load their corresponding dashboard in presentation format.
          </p>
        </div>

        {/* Roles grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 justify-center">
          {presentationRoles.map((role) => {
            const Icon = role.icon;
            const isBypassing = loggingIn === role.name;

            return (
              <Card 
                key={role.name} 
                className="bg-slate-950 border border-slate-800 hover:border-primary/50 transition-all duration-200 p-6 flex flex-col justify-between text-left h-48 group cursor-pointer"
                onClick={() => !isBypassing && handleRoleBypass(role.name, role.email)}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="p-3 bg-slate-900 text-primary rounded-xl group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    {isBypassing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white group-hover:text-primary transition-colors">{role.name} Dashboard</h3>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {role.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-primary pt-2 group-hover:translate-x-1.5 transition-transform font-bold uppercase">
                  Launch <ArrowRight className="h-3 w-3" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-center text-slate-500 text-[10px] font-bold uppercase mt-8 border-t border-slate-800/60 pt-4">
        Partido State University – Goa Campus • Capstone Defense System 2026
      </div>
    </div>
  );
}
