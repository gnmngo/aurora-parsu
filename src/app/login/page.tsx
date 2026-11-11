"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  ShieldAlert, 
  Shield, 
  Info,
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  Crown,
  ArrowLeft,
  Sun,
  Moon
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUserAction } from "@/lib/auth/register-action";
import { getDemoCredentialsAction } from "@/lib/auth/demo-actions";
import { prepareLoginAction, resetPasswordDirectAction } from "@/lib/auth/login-actions";
import { useGlobalLoading } from "@/providers/loading-provider";
import { APP_ACRONYM_MEANING, INSTITUTION_CAMPUS } from "@/constants/app";

const DEMO_ROLES = [
  { id: "student", label: "Student Proponent", icon: GraduationCap },
  { id: "adviser", label: "Research Adviser", icon: BookOpen },
  { id: "panelist", label: "Defense Panelist", icon: Users },
  { id: "coordinator", label: "Research Coordinator", icon: ShieldCheck },
  { id: "dean", label: "College Dean", icon: Crown },
  { id: "admin", label: "System Administrator", icon: Shield },
] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { session, profile, isLoading: authLoading } = useAuth();
  const { startLoading, stopLoading } = useGlobalLoading();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<"signin" | "register" | "forgot">("signin");
  
  // Sign In States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration States
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState("student");
  const [regNumber, setRegNumber] = useState("");
  
  // Dynamic Academic Structure States
  const [campuses, setCampuses] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);

  const [regCampusId, setRegCampusId] = useState("");
  const [regCollegeId, setRegCollegeId] = useState("");
  const [regDepartmentId, setRegDepartmentId] = useState("");
  const [regProgramId, setRegProgramId] = useState("");
  const [regMajorId, setRegMajorId] = useState("");
  const [regYearLevel, setRegYearLevel] = useState<number>(4);
  const [regSection, setRegSection] = useState<string>("A");

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const hasFetchedCampuses = useRef(false);

  // Load campuses
  useEffect(() => {
    if (activeTab === "register" && !hasFetchedCampuses.current) {
      hasFetchedCampuses.current = true;
      supabase.from("campuses").select("id, name").order("name").then(({ data }) => {
        if (data) {
          setCampuses(data);
          if (data.length > 0) setRegCampusId((prev) => prev || data[0].id);
        }
      });
    }
  }, [activeTab, supabase]);

  // Load colleges based on campus
  useEffect(() => {
    if (!regCampusId) {
      setColleges([]);
      return;
    }
    supabase.from("colleges").select("id, name, code").eq("campus_id", regCampusId).order("name").then(({ data }) => {
      if (data) {
        setColleges(data);
        if (data.length > 0) setRegCollegeId((prev) => (data.some(c => c.id === prev) ? prev : data[0].id));
      }
    });
  }, [regCampusId, supabase]);

  // Load departments & programs based on college
  useEffect(() => {
    if (!regCollegeId) {
      setDepartments([]);
      setPrograms([]);
      return;
    }
    supabase.from("departments").select("id, name, code").eq("college_id", regCollegeId).order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });

    supabase.from("programs").select("id, name, code, department_id").eq("college_id", regCollegeId).order("name").then(({ data }) => {
      if (data) {
        setPrograms(data);
        if (data.length > 0) {
          setRegProgramId((prev) => (data.some(p => p.id === prev) ? prev : data[0].id));
        } else {
          setRegProgramId("");
        }
      }
    });
  }, [regCollegeId, supabase]);

  // Load majors based on program
  useEffect(() => {
    if (!regProgramId) {
      setMajors([]);
      return;
    }
    supabase.from("majors").select("id, name, code").eq("program_id", regProgramId).order("name").then(({ data }) => {
      if (data) setMajors(data);
    });
  }, [regProgramId, supabase]);

  // If already logged in, redirect to dashboard or redirect target
  useEffect(() => {
    if (session && profile && !authLoading) {
      const redirectParam = searchParams.get("redirect");
      const targetUrl =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : "/dashboard";
      window.location.assign(targetUrl);
    }
  }, [session, profile, authLoading, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (trimmedPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    startLoading("Verifying institutional credentials & decrypting docket...");

    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("aurora_active_role");
        localStorage.removeItem("aurora_active_role");
      }

      const prep = await prepareLoginAction(trimmedEmail, password);
      if (!prep.success || !prep.email || !prep.password) {
        stopLoading();
        toast.error(prep.error || "Invalid credentials");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: prep.email,
        password: prep.password,
      });

      if (error) {
        stopLoading();
        toast.error(error.message || "Invalid credentials");
        return;
      }

      if (!data.session) {
        stopLoading();
        toast.error("Login failed: no session returned");
        return;
      }

      const redirectParam = searchParams.get("redirect");
      const targetUrl =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : "/dashboard";

      toast.success("Login successful! Entering AURORA Portal...");
      startLoading("Entering AURORA Portal...");

      setTimeout(() => {
        window.location.assign(targetUrl);
      }, 150);
    } catch (err: any) {
      stopLoading();
      console.error(err);
      toast.error(err?.message || "Unexpected login error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanRegEmail = regEmail.trim().toLowerCase();
    const cleanRegPassword = regPassword.trim();

    if (!cleanRegEmail || !cleanRegPassword || !regFirstName || !regLastName) {
      toast.error("Please fill in your name, email, and password");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanRegEmail)) {
      toast.error("Please enter a valid institutional email address");
      return;
    }
    if (cleanRegPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (!regNumber?.trim()) {
      toast.error("Please enter your Student ID number (e.g. 2022-xxxxx)");
      return;
    }
    if (!regProgramId) {
      toast.error("Please select your academic program");
      return;
    }
    
    setLoading(true);
    startLoading("Registering student record & provisioning college permissions...");

    try {
      if (session) {
        await supabase.auth.signOut();
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("aurora_active_role", "student");
        localStorage.setItem("aurora_active_role", "student");
      }

      const selectedProg = programs.find((p) => p.id === regProgramId);
      const departmentId = regDepartmentId || (selectedProg as { department_id?: string | null })?.department_id || null;

      const result = await registerUserAction({
        email: cleanRegEmail,
        password: cleanRegPassword,
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        role: "student",
        number: regNumber.trim(),
        campusId: regCampusId || null,
        collegeId: regCollegeId || null,
        departmentId,
        programId: regProgramId || null,
        majorId: regMajorId || null,
        yearLevel: regYearLevel,
        section: regSection,
      });

      if (!result.success) {
        stopLoading();
        toast.error(result.error || "Registration failed");
        return;
      }

      toast.success("Student account created successfully! Signing in...");
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanRegEmail,
        password: cleanRegPassword,
      });

      if (signInError) {
        stopLoading();
        setEmail(cleanRegEmail);
        setPassword(cleanRegPassword);
        setActiveTab("signin");
        toast.info("Account created. Please sign in with your credentials.");
      } else {
        toast.success("Account created! Entering AURORA Portal...");
        startLoading("Entering AURORA Portal...");
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 150);
      }
    } catch (err: unknown) {
      stopLoading();
      const message = err instanceof Error ? err.message : "Unexpected registration error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      toast.error("Please enter your email or Student ID");
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    startLoading("Verifying account identity & updating credentials...");

    try {
      const result = await resetPasswordDirectAction(trimmed, forgotNewPassword.trim());

      if (!result.success) {
        stopLoading();
        toast.error(result.error || "Failed to update password");
        return;
      }

      setForgotSent(true);
      toast.success("Password updated successfully!");

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email || trimmed.toLowerCase(),
        password: forgotNewPassword.trim(),
      });

      if (!signInError && data.session) {
        toast.success("Signed in with your new password!");
        startLoading("Entering AURORA Portal...");
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 150);
      } else {
        stopLoading();
        setTimeout(() => {
          setEmail(result.email || trimmed);
          setPassword(forgotNewPassword.trim());
          setActiveTab("signin");
          setForgotSent(false);
        }, 1200);
      }
    } catch (err: any) {
      stopLoading();
      toast.error(err?.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (roleType: "student" | "adviser" | "panelist" | "coordinator" | "dean" | "admin") => {
    setLoading(true);
    startLoading(`Authenticating as ${roleType.toUpperCase()} & configuring permissions...`);

    try {
      const targetRole =
        roleType === "dean"
          ? "college_dean"
          : roleType === "admin"
          ? "sys_admin"
          : roleType;

      if (typeof window !== "undefined") {
        sessionStorage.setItem("aurora_active_role", targetRole);
        localStorage.setItem("aurora_active_role", targetRole);
      }

      const creds = await getDemoCredentialsAction(roleType);
      if (!creds.success || !creds.email || !creds.password) {
        stopLoading();
        toast.error(creds.error || `Demo credentials for ${roleType} unavailable.`);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      if (error) {
        stopLoading();
        toast.error(error.message || `Failed to login as ${roleType}`);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("aurora_active_role", targetRole);
        localStorage.setItem("aurora_active_role", targetRole);
      }

      toast.success(`Logged in as ${roleType}`);
      startLoading(`Entering AURORA as ${roleType.toUpperCase()}...`);

      setTimeout(() => {
        window.location.assign("/dashboard");
      }, 150);
    } catch (err: any) {
      stopLoading();
      toast.error(err?.message || "Unexpected login error");
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || authLoading;

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#050505] dark:text-[#F5F5F5] antialiased selection:bg-blue-600 selection:text-white font-sans flex flex-col items-center justify-between py-8 px-4 relative overflow-y-auto transition-colors duration-200">
      
      {/* Subtle architectural ambient background grid matching Landing Page */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Navigation & Theme Toggle Bar */}
      <div className="w-full max-w-[440px] flex items-center justify-between relative z-10 px-1 mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Home</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-zinc-200 dark:border-[#252525] bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-600 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5] transition-colors cursor-pointer"
          aria-label="Toggle theme"
          title={mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          )}
        </button>
      </div>

      {/* Central Login Card */}
      <div className="w-full max-w-[440px] my-auto relative z-10">
        <Card className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#252525] shadow-2xl relative overflow-hidden rounded-2xl transition-colors">
          <CardContent className="p-7 sm:p-8">
            
            {/* Header: Official Geometric A Symbol + Wordmark */}
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="relative h-14 w-14 mb-3 flex items-center justify-center">
                <Image
                  src="/aurora-symbol-transparent.png"
                  alt="Official AURORA Geometric Symbol"
                  width={48}
                  height={48}
                  priority
                  className="object-contain dark:brightness-100 brightness-0 transition-all duration-200 drop-shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_16px_rgba(255,255,255,0.08)] select-none"
                />
              </div>

              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-xl font-black tracking-[0.25em] uppercase font-display text-zinc-900 dark:text-[#F5F5F5]">
                    AURORA
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                    Paperless
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-[#929292] uppercase tracking-widest">
                  {INSTITUTION_CAMPUS}
                </p>
              </div>

              <p className="text-xs text-zinc-600 dark:text-[#929292] max-w-xs mx-auto leading-relaxed">
                Paperless Academic Defense Workflow System for Research, Capstone, Thesis &amp; Dissertation Papers
              </p>
            </div>

            {/* Mode Switcher Tabs (Sign In / Register) */}
            <div className="flex bg-zinc-100 dark:bg-[#121212] p-1 rounded-xl mb-6 border border-zinc-200 dark:border-[#202020]">
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === "signin"
                    ? "bg-white dark:bg-[#050505] text-zinc-900 dark:text-[#F5F5F5] shadow-xs"
                    : "text-zinc-500 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === "register"
                    ? "bg-white dark:bg-[#050505] text-zinc-900 dark:text-[#F5F5F5] shadow-xs"
                    : "text-zinc-500 dark:text-[#929292] hover:text-zinc-900 dark:hover:text-[#F5F5F5]"
                }`}
              >
                Student Registration
              </button>
            </div>

            {/* SIGN IN TAB */}
            {activeTab === "signin" && (
              <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-300">
                {searchParams.get("error") === "pending" && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Faculty Account Pending Verification</p>
                      <p className="text-[11px] text-amber-900/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        Your faculty registration is awaiting institutional approval by the University Research Coordinator.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold tracking-wider" htmlFor="email">
                    Institutional Email or Student ID
                  </label>
                  <Input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="name@parsu.edu.ph or Student ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-10.5 rounded-xl bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525] text-zinc-900 dark:text-[#F5F5F5] text-xs focus-visible:ring-blue-600/30"
                    required
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold tracking-wider" htmlFor="password">
                      Password
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab("forgot")}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                      disabled={isFormDisabled}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isFormDisabled}
                      className="h-10.5 rounded-xl bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525] text-zinc-900 dark:text-[#F5F5F5] text-xs focus-visible:ring-blue-600/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  disabled={isFormDisabled} 
                  className="w-full h-10.5 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-[#F5F5F5] dark:text-[#050505] dark:hover:bg-white text-xs font-bold transition-all shadow-sm cursor-pointer" 
                  type="submit"
                >
                  {loading || authLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4" />
                      Authenticating...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* DEMO ACCOUNTS SECTION (Maintained & Sleekly Styled) */}
                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-[#202020]">
                  <div className="text-center mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-[#929292]">
                      Instant Demo Role Access
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ROLES.map((role) => {
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleDemoLogin(role.id)}
                          disabled={isFormDisabled}
                          className="h-9 rounded-xl bg-zinc-50 dark:bg-[#050505] hover:bg-zinc-100 dark:hover:bg-[#141414] border border-zinc-200 dark:border-[#252525] text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-start px-3 gap-2 transition-all shadow-2xs hover:border-blue-500/40 cursor-pointer group"
                        >
                          <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover:scale-110" />
                          <span className="truncate">{role.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* REGISTRATION TAB */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-3.5 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="firstName">First Name</label>
                    <Input
                      id="firstName"
                      placeholder="Juan"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      disabled={isFormDisabled}
                      className="h-9.5 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="lastName">Last Name</label>
                    <Input
                      id="lastName"
                      placeholder="Dela Cruz"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      disabled={isFormDisabled}
                      className="h-9.5 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="regEmail">Institutional Email</label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="jdelacruz@parsu.edu.ph"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-9.5 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="regPassword">Password</label>
                  <div className="relative">
                    <Input
                      id="regPassword"
                      type={showRegPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={isFormDisabled}
                      className="h-9.5 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525] pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="regNumber">
                    Student ID Number
                  </label>
                  <Input
                    id="regNumber"
                    type="text"
                    placeholder="e.g. 2022-10492"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-9.5 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525]"
                    required
                  />
                </div>

                <div className="space-y-2.5 p-3 bg-zinc-50 dark:bg-[#050505] rounded-xl border border-zinc-200 dark:border-[#252525]">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="campus">Campus</label>
                    <select
                      id="campus"
                      value={regCampusId}
                      onChange={(e) => setRegCampusId(e.target.value)}
                      className="w-full h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] px-2 text-zinc-900 dark:text-zinc-100"
                      disabled={campuses.length === 0}
                    >
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="college">College</label>
                    <select
                      id="college"
                      value={regCollegeId}
                      onChange={(e) => setRegCollegeId(e.target.value)}
                      className="w-full h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] px-2 text-zinc-900 dark:text-zinc-100"
                      disabled={colleges.length === 0}
                    >
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="program">Academic Program</label>
                    <select
                      id="program"
                      value={regProgramId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setRegProgramId(selId);
                        const selProg = programs.find((p) => p.id === selId);
                        if (selProg?.department_id) {
                          setRegDepartmentId(selProg.department_id);
                        }
                      }}
                      className="w-full h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] px-2 text-zinc-900 dark:text-zinc-100"
                      disabled={programs.length === 0}
                      required
                    >
                      <option value="">{programs.length === 0 ? "-- Loading Programs... --" : "-- Select Program --"}</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ""}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200 dark:border-[#202020]">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="yearLevel">Year Level</label>
                      <select
                        id="yearLevel"
                        value={regYearLevel}
                        onChange={(e) => setRegYearLevel(Number(e.target.value))}
                        className="w-full h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] px-2 text-zinc-900 dark:text-zinc-100"
                      >
                        <option value={4}>4th Year (Capstone / Thesis)</option>
                        <option value={3}>3rd Year (Methods of Research)</option>
                        <option value={2}>2nd Year</option>
                        <option value={1}>1st Year</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold" htmlFor="section">Class Section</label>
                      <select
                        id="section"
                        value={regSection}
                        onChange={(e) => setRegSection(e.target.value)}
                        className="w-full h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-[#252525] bg-white dark:bg-[#0A0A0A] px-2 text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button disabled={isFormDisabled} className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-[#F5F5F5] dark:text-[#050505] font-bold text-xs cursor-pointer shadow-sm" type="submit">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4" />
                      Creating student account...
                    </span>
                  ) : (
                    "Create Student Account"
                  )}
                </Button>
              </form>
            )}

            {/* FORGOT PASSWORD TAB */}
            {activeTab === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4 animate-in fade-in duration-300">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Reset Account Password</h3>
                  <p className="text-xs text-zinc-500 dark:text-[#929292]">Enter your institutional email and set a new password.</p>
                </div>

                {forgotSent ? (
                  <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-xs">Password updated successfully. Signing you in...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold tracking-wider" htmlFor="forgotEmail">Email or Student ID</label>
                      <Input
                        id="forgotEmail"
                        type="text"
                        placeholder="name@parsu.edu.ph"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={isFormDisabled}
                        className="h-10 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 dark:text-[#929292] uppercase font-bold tracking-wider" htmlFor="forgotNewPassword">New Password</label>
                      <div className="relative">
                        <Input
                          id="forgotNewPassword"
                          type={showForgotPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          disabled={isFormDisabled}
                          className="h-10 text-xs bg-zinc-50 dark:bg-[#050505] border-zinc-200 dark:border-[#252525] pr-10"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(!showForgotPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <Button disabled={isFormDisabled || forgotSent} className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-[#F5F5F5] dark:text-[#050505] font-bold text-xs cursor-pointer shadow-sm" type="submit">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4" />
                      Updating password...
                    </span>
                  ) : (
                    "Update Password & Sign In"
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    setActiveTab("signin");
                  }}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium cursor-pointer"
                  disabled={isFormDisabled}
                >
                  Back to Sign In
                </button>
              </form>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center w-full text-[11px] text-zinc-400 dark:text-zinc-600 font-medium shrink-0 pt-4">
        <p>&copy; {new Date().getFullYear()} Partido State University · San Juan Bautista, Goa, Camarines Sur</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505]"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
