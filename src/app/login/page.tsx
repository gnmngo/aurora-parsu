"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { session, profile, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "register" | "forgot">("signin");
  
  // Sign In States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Registration States
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("student"); // student, adviser, panelist
  const [regNumber, setRegNumber] = useState(""); // student/employee number
  const [regSpecialization, setRegSpecialization] = useState("General");
  
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

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Load campuses
  useEffect(() => {
    if (activeTab === "register") {
      supabase.from("campuses").select("id, name").order("name").then(({ data }) => {
        if (data) {
          setCampuses(data);
          if (data.length > 0 && !regCampusId) setRegCampusId(data[0].id);
        }
      });
    }
  }, [activeTab, regCampusId, supabase]);

  // Load colleges based on campus
  useEffect(() => {
    if (regCampusId) {
      supabase.from("colleges").select("id, name").eq("campus_id", regCampusId).order("name").then(({ data }) => {
        setColleges(data || []);
        if (data && data.length > 0) setRegCollegeId(data[0].id);
        else setRegCollegeId("");
      });
    } else {
      setColleges([]);
      setRegCollegeId("");
    }
  }, [regCampusId, supabase]);

  // Load departments based on college
  useEffect(() => {
    if (regCollegeId) {
      supabase.from("departments").select("id, name").eq("college_id", regCollegeId).order("name").then(({ data }) => {
        setDepartments(data || []);
        // Don't auto-select department if none exists (it's optional)
        if (data && data.length > 0) setRegDepartmentId(data[0].id);
        else setRegDepartmentId("");
      });
    } else {
      setDepartments([]);
      setRegDepartmentId("");
    }
  }, [regCollegeId, supabase]);

  // Load programs based on college AND department
  useEffect(() => {
    if (regCollegeId) {
      let query = supabase.from("programs").select("id, name").eq("college_id", regCollegeId);
      if (regDepartmentId) {
        query = query.eq("department_id", regDepartmentId);
      } else {
        query = query.is("department_id", null);
      }
      query.order("name").then(({ data }) => {
        setPrograms(data || []);
        if (data && data.length > 0) setRegProgramId(data[0].id);
        else setRegProgramId("");
      });
    } else {
      setPrograms([]);
      setRegProgramId("");
    }
  }, [regCollegeId, regDepartmentId, supabase]);

  // Load majors based on program
  useEffect(() => {
    if (regProgramId) {
      supabase.from("majors").select("id, name").eq("program_id", regProgramId).order("name").then(({ data }) => {
        setMajors(data || []);
        if (data && data.length > 0) setRegMajorId(data[0].id);
        else setRegMajorId("");
      });
    } else {
      setMajors([]);
      setRegMajorId("");
    }
  }, [regProgramId, supabase]);

  // Safe redirect only after session and profile are fully resolved
  useEffect(() => {
    if (!authLoading && session && profile) {
      console.log("LOGIN REDIRECT: Hydration confirmed. Redirecting to dashboard.");
      router.replace("/dashboard");
    }
  }, [session, profile, authLoading, router]);

  // Handle errors passed in URL
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      toast.error(`Access Denied: Account status is ${err}. Please contact administrator.`);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid credentials");
        return;
      }

      if (!data.session) {
        toast.error("Login failed: no session returned");
        return;
      }

      toast.success("Login successful");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Unexpected login error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regFirstName || !regLastName || !regNumber) {
      toast.error("Please fill in all required registration fields");
      return;
    }
    if (regRole === "student" && !regProgramId) {
      toast.error("Please select an academic program");
      return;
    }
    
    setLoading(true);

    try {
      const metaData: any = {
        first_name: regFirstName,
        last_name: regLastName,
        role: regRole,
      };

      if (regRole === "student") {
        metaData.student_number = regNumber;
        metaData.campus_id = regCampusId || null;
        metaData.college_id = regCollegeId || null;
        metaData.department_id = regDepartmentId || null;
        metaData.program_id = regProgramId || null;
        metaData.major_id = regMajorId || null;
      } else {
        metaData.employee_number = regNumber;
        metaData.specialization = regSpecialization;
      }

      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: metaData
        }
      });

      if (error) {
        toast.error(error.message || "Registration failed");
        return;
      }

      toast.success("Account created! Please wait for administrator approval or sign in if auto-approved.");
      
      // Auto-switch back to sign-in, but DO NOT auto sign-in to prevent hanging on pending accounts.
      setEmail(regEmail);
      setPassword(regPassword);
      setActiveTab("signin");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Unexpected registration error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/login?tab=reset`
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success("Reset link dispatched! Please check your email inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger reset flow.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (roleType: "student" | "adviser" | "panelist" | "coordinator" | "admin") => {
    setLoading(true);
    let targetEmail = "";
    let targetPass = "Panel123!";

    if (roleType === "student") {
      targetEmail = "student1@aurora.test";
    } else if (roleType === "adviser") {
      targetEmail = "adviser1@aurora.test";
    } else if (roleType === "panelist") {
      targetEmail = "panelist1@aurora.test";
    } else if (roleType === "coordinator") {
      targetEmail = "coord@aurora.test";
    } else if (roleType === "admin") {
      targetEmail = "admin@aurora.test";
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPass,
      });

      if (error) {
        toast.error(error.message || `Failed to login as ${roleType}`);
        return;
      }

      toast.success(`Logged in as ${roleType}`);
    } catch (err: any) {
      toast.error(err?.message || "Unexpected login error");
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || authLoading;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic abstract shapes for premium look */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-[420px] bg-card/80 backdrop-blur-xl border-border shadow-2xl relative z-10 overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-inner">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">AURORA</h1>
            <p className="text-sm text-muted-foreground">Academic Defense Workflow System</p>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-xl mb-6 relative">
            <button
              onClick={() => setActiveTab("signin")}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all duration-300 relative z-10 ${
                activeTab === "signin" ? "text-primary shadow-sm bg-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all duration-300 relative z-10 ${
                activeTab === "register" ? "text-primary shadow-sm bg-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {activeTab === "signin" && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider" htmlFor="email">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@parsu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isFormDisabled}
                  className="h-10 rounded-xl bg-background/50 border-border focus-visible:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider" htmlFor="password">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab("forgot")}
                    className="text-[10px] text-primary hover:underline font-medium"
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
                    className="h-10 rounded-xl bg-background/50 border-border focus-visible:ring-primary/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button disabled={isFormDisabled} className="w-full h-10 rounded-xl cursor-pointer" type="submit">
                {loading || authLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="mt-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">Demo Accounts</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("student")} disabled={isFormDisabled} className="text-xs h-8 rounded-lg bg-background/50">Student</Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("adviser")} disabled={isFormDisabled} className="text-xs h-8 rounded-lg bg-background/50">Adviser</Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("panelist")} disabled={isFormDisabled} className="text-xs h-8 rounded-lg bg-background/50">Panelist</Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => handleDemoLogin("coordinator")} disabled={isFormDisabled} className="text-xs h-8 rounded-lg bg-background/50">Coordinator</Button>
                </div>
              </div>
            </form>
          )}

          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="firstName">First Name</label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    disabled={isFormDisabled}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="lastName">Last Name</label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    disabled={isFormDisabled}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="regEmail">Email Address</label>
                <Input
                  id="regEmail"
                  type="email"
                  placeholder="name@parsu.edu.ph"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={isFormDisabled}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="regPassword">Password</label>
                <Input
                  id="regPassword"
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={isFormDisabled}
                  required
                  minLength={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="regRole">University Role</label>
                  <select
                    id="regRole"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-2.5 focus:outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="adviser">Research Adviser</option>
                    <option value="panelist">Defense Panelist</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="regNumber">
                    {regRole === "student" ? "Student ID" : "Employee ID"}
                  </label>
                  <Input
                    id="regNumber"
                    type="text"
                    placeholder={regRole === "student" ? "2022-xxxxx" : "EMP-xxxx"}
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    disabled={isFormDisabled}
                    required
                  />
                </div>
              </div>

              {regRole === "student" ? (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="campus">Campus</label>
                    <select
                      id="campus"
                      value={regCampusId}
                      onChange={(e) => setRegCampusId(e.target.value)}
                      className="w-full h-9 text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
                      disabled={campuses.length === 0}
                    >
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="college">College</label>
                    <select
                      id="college"
                      value={regCollegeId}
                      onChange={(e) => setRegCollegeId(e.target.value)}
                      className="w-full h-9 text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
                      disabled={colleges.length === 0}
                    >
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {departments.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="department">Department (Optional)</label>
                      <select
                        id="department"
                        value={regDepartmentId}
                        onChange={(e) => setRegDepartmentId(e.target.value)}
                        className="w-full h-9 text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
                      >
                        <option value="">-- No Department --</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="program">Academic Program</label>
                    <select
                      id="program"
                      value={regProgramId}
                      onChange={(e) => setRegProgramId(e.target.value)}
                      className="w-full h-9 text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
                      disabled={programs.length === 0}
                      required
                    >
                      <option value="">-- Select Program --</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {majors.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="major">Major (Optional)</label>
                      <select
                        id="major"
                        value={regMajorId}
                        onChange={(e) => setRegMajorId(e.target.value)}
                        className="w-full h-9 text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
                      >
                        <option value="">-- No Major --</option>
                        {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold" htmlFor="specialization">Field of Specialization</label>
                  <Input
                    id="specialization"
                    type="text"
                    placeholder="e.g. Software Engineering, AI, Data Science"
                    value={regSpecialization}
                    onChange={(e) => setRegSpecialization(e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
              )}

              <Button disabled={isFormDisabled} className="w-full h-10 rounded-xl cursor-pointer" type="submit">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Registering details...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {activeTab === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-center mb-6">
                <h3 className="text-sm font-semibold mb-1">Reset Password</h3>
                <p className="text-xs text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
              </div>

              {forgotSent ? (
                <div className="bg-primary/10 text-primary p-4 rounded-xl flex items-start gap-3 border border-primary/20">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider" htmlFor="forgotEmail">Email Address</label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="name@parsu.edu.ph"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={isFormDisabled}
                    className="h-10 rounded-xl bg-background/50 border-border focus-visible:ring-primary/20"
                    required
                  />
                </div>
              )}

              <Button disabled={isFormDisabled || forgotSent} className="w-full h-10 rounded-xl cursor-pointer" type="submit">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Sending link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 font-medium"
                disabled={isFormDisabled}
              >
                Back to Sign In
              </button>
            </form>
          )}

        </CardContent>
      </Card>
      
      {/* Brand Footer */}
      <div className="absolute bottom-6 text-center w-full text-xs text-muted-foreground/60 font-medium">
        <p>© 2026 Partido State University</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
