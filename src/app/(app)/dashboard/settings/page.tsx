"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Building2,
  PenTool,
  Upload,
  CheckCircle2,
  RotateCcw,
  Wrench,
  BookOpen,
  Database,
} from "lucide-react";
import { getSignatureProfileAction, saveSignatureProfileAction } from "@/lib/signatures/actions";

export default function SettingsPage() {
  const { profile, roles, signOut, isLoading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [collegeInfo, setCollegeInfo] = useState<{ id: string; name: string; code: string } | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Electronic Signature Baseline State
  const [sigProfile, setSigProfile] = useState<any>(null);
  const [sigPreviewUrl, setSigPreviewUrl] = useState<string | null>(null);
  const [academicRank, setAcademicRank] = useState("Defense Panel Member");
  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [hasDrawnSig, setHasDrawnSig] = useState(false);
  const [uploadedSigBase64, setUploadedSigBase64] = useState<string | null>(null);
  const [isSavingSig, setIsSavingSig] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigFileInputRef = useRef<HTMLInputElement | null>(null);

  // Security / Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const isFacultyOrStaff = roles.some((r) =>
    ["adviser", "panelist", "coordinator", "college_dean", "sys_admin"].includes(r)
  );
  const canAccessAdminConsole = roles.some((r) =>
    ["coordinator", "college_dean", "sys_admin"].includes(r)
  );

  const initSigCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 420;
    const height = rect.height || 140;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    async function loadProfileAndDepartments() {
      if (!profile) return;
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setDepartmentId((profile as any).department_id || "");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("college_id, department_id, colleges(id, name, code)")
        .eq("id", profile.id)
        .maybeSingle();

      if (userProfile?.colleges) {
        setCollegeInfo(userProfile.colleges as any);
      }

      const { data: deptData } = await supabase
        .from("departments")
        .select("id, name, code, college_id, colleges(name, code)")
        .order("name");

      if (deptData) {
        setDepartments(deptData);
      }

      try {
        const sp = await getSignatureProfileAction();
        if (sp) {
          setSigProfile(sp);
          if (sp.academic_rank) setAcademicRank(sp.academic_rank);
          if (sp.signature_storage_path) {
            const cleanPath = sp.signature_storage_path.replace(/^signatures\//, "").replace(/^\/+/, "");
            const { data } = await supabase.storage.from("signatures").createSignedUrl(cleanPath, 7200);
            if (data?.signedUrl) {
              setSigPreviewUrl(data.signedUrl);
            } else {
              const { data: pubData } = supabase.storage.from("signatures").getPublicUrl(cleanPath);
              if (pubData?.publicUrl) setSigPreviewUrl(pubData.publicUrl);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load signature profile:", err);
      }
    }
    loadProfileAndDepartments();
  }, [profile, supabase]);

  useEffect(() => {
    if (sigMode === "draw") {
      const t = setTimeout(initSigCanvas, 100);
      return () => clearTimeout(t);
    }
  }, [sigMode, initSigCanvas]);

  const getSigCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startSigDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const coords = getSigCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawingSig(true);
    setHasDrawnSig(true);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    e.preventDefault();
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getSigCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopSigDraw = () => setIsDrawingSig(false);

  const clearSigCanvas = () => {
    initSigCanvas();
    setHasDrawnSig(false);
  };

  const handleSigFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Signature image must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedSigBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(f);
  };

  const handleSaveSignatureBaseline = async () => {
    if (!profile) return;
    let base64ToSave = "";
    if (sigMode === "draw") {
      if (!hasDrawnSig || !sigCanvasRef.current) {
        toast.error("Please draw your signature on the pad before saving.");
        return;
      }
      base64ToSave = sigCanvasRef.current.toDataURL("image/png");
    } else {
      if (!uploadedSigBase64) {
        toast.error("Please select a signature image file before saving.");
        return;
      }
      base64ToSave = uploadedSigBase64;
    }

    setIsSavingSig(true);
    try {
      const fullName = `${firstName || profile.first_name} ${lastName || profile.last_name}`.trim().toUpperCase();
      const res = await saveSignatureProfileAction({
        fullName,
        academicRank: academicRank.trim() || "Defense Panel Member",
        officialEmail: profile.email,
        departmentId: departmentId || undefined,
        signatureImageBase64: base64ToSave,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save signature baseline.");
        return;
      }

      setSigPreviewUrl(base64ToSave);
      setSigProfile((prev: any) => ({
        ...prev,
        public_signature_id: res.publicSignatureId,
        academic_rank: academicRank,
      }));
      toast.success("Official Electronic Signature Baseline saved!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save signature baseline.");
    } finally {
      setIsSavingSig(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const isCecFaculty =
    collegeInfo?.code === "CEC" ||
    (profile as any)?.college_id === "10000000-0000-0000-0000-000000000003" ||
    !collegeInfo;

  const cecDepartments = departments.filter(
    (d) =>
      d.colleges?.code === "CEC" ||
      d.college_id === "10000000-0000-0000-0000-000000000003"
  );

  const handleSaveChanges = async () => {
    if (!firstName || !lastName) {
      toast.error("First name and Last name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          department_id: departmentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      await supabase.rpc("log_auth_event", {
        p_user_email: profile.email,
        p_profile_id: profile.id,
        p_action: "UPDATE",
        p_description: `Updated profile details. Name: ${firstName} ${lastName}`,
        p_ip_address: "127.0.0.1",
        p_user_agent: window.navigator.userAgent,
      });

      toast.success("Profile updated successfully!");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword.trim(),
      });

      if (verifyErr) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateErr) throw updateErr;

      try {
        await supabase.rpc("log_auth_event", {
          p_user_email: profile.email,
          p_profile_id: profile.id,
          p_action: "UPDATE",
          p_description: "Password updated from Account Settings",
          p_ip_address: "127.0.0.1",
          p_user_agent: window.navigator.userAgent,
        });
      } catch {}

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, electronic signature baseline, security preferences, and troubleshooting guides
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input defaultValue={profile.email} className="mt-1" disabled />
          </div>
          {/* College and Department Settings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium">College</label>
              <div className="mt-1 flex items-center h-9 px-3 rounded-md border border-border bg-muted/40 text-xs font-semibold text-foreground">
                <Building2 className="h-3.5 w-3.5 mr-2 text-primary shrink-0" />
                <span className="truncate">
                  {collegeInfo
                    ? `${collegeInfo.name} (${collegeInfo.code})`
                    : "College of Engineering and Computational Sciences (CEC)"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-medium">
                  Department {isCecFaculty ? "(CEC Only)" : ""}
                </label>
                {isCecFaculty && (
                  <span className="text-[10px] text-primary font-bold">
                    CEC Faculty
                  </span>
                )}
              </div>

              {isCecFaculty ? (
                <>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Select CEC Department --</option>
                    {cecDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    Applicable for CEC faculty: Select either <strong>Department of Engineering (DOE)</strong> or <strong>Department of Computational Sciences (DCS)</strong>.
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-1 flex items-center h-9 px-3 rounded-md border border-dashed border-border bg-muted/20 text-xs text-muted-foreground italic">
                    Not applicable for non-CEC colleges
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Department assignment is currently only established for the College of Engineering and Computational Sciences (CEC).
                  </p>
                </>
              )}
            </div>
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Official Electronic Signature Baseline Card (Faculty / Committee / Admin) */}
      {isFacultyOrStaff && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Official Electronic Signature Baseline
              </CardTitle>
              {sigPreviewUrl && (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Registered Baseline
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Register or update your official institutional e-signature used when signing rubric evaluations and defense clearance certificates (RA 8792 compliant).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sigPreviewUrl && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Current Registered Signature</p>
                  <p className="text-[11px] text-muted-foreground">
                    ID: <span className="font-mono font-semibold">{sigProfile?.public_signature_id || "SIG-PSU-ACTIVE"}</span>
                  </p>
                </div>
                <div className="h-14 w-48 bg-white rounded-lg border border-border p-1.5 flex items-center justify-center">
                  <img
                    src={sigPreviewUrl}
                    alt="Registered Official Signature"
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-semibold">Academic Rank / Committee Title</label>
              <Input
                value={academicRank}
                onChange={(e) => setAcademicRank(e.target.value)}
                placeholder="e.g. Associate Professor IV / Defense Panel Member"
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={sigMode === "draw" ? "default" : "outline"}
                onClick={() => setSigMode("draw")}
                className="h-8 text-xs gap-1.5"
              >
                <PenTool className="h-3.5 w-3.5" /> Draw Signature
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sigMode === "upload" ? "default" : "outline"}
                onClick={() => setSigMode("upload")}
                className="h-8 text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload PNG/JPG
              </Button>
            </div>

            {sigMode === "draw" ? (
              <div className="space-y-2">
                <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10 h-36">
                  <canvas
                    ref={sigCanvasRef}
                    onMouseDown={startSigDraw}
                    onMouseMove={drawSig}
                    onMouseUp={stopSigDraw}
                    onMouseLeave={stopSigDraw}
                    onTouchStart={startSigDraw}
                    onTouchMove={drawSig}
                    onTouchEnd={stopSigDraw}
                    className="w-full h-full block touch-none cursor-crosshair relative z-10"
                  />
                  <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none z-0" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSigCanvas}
                    className="absolute bottom-2 right-2 h-7 text-[10px] rounded-lg px-2.5 z-20 gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Draw your signature above to register or replace your official signature baseline.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2 bg-muted/10">
                {uploadedSigBase64 ? (
                  <div className="space-y-2">
                    <div className="h-20 max-w-[220px] mx-auto bg-white rounded-lg border border-border p-2 flex items-center justify-center">
                      <img src={uploadedSigBase64} alt="Uploaded signature" className="max-h-full max-w-full object-contain" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedSigBase64(null)}
                      className="h-7 text-xs text-rose-600"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold">Upload Transparent PNG or JPG Signature</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sigFileInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      Browse Image
                    </Button>
                  </div>
                )}
                <input
                  ref={sigFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleSigFileUpload}
                  className="hidden"
                />
              </div>
            )}

            <Button onClick={handleSaveSignatureBaseline} disabled={isSavingSig}>
              {isSavingSig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Signature Baseline...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Save Official Signature Baseline
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Security &amp; Password
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ensure your account uses a secure password to protect academic evaluation integrity.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Current Password</label>
              <div className="relative mt-1">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground font-semibold">New Password</label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold">Confirm New Password</label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Maintenance, Troubleshooting & Data Backup Protection Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-primary" />
              Maintenance, Troubleshooting &amp; Data Backup Protection
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
              3-2-1 Backup • RTO ≤ 4h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Quick troubleshooting reference for your account and institutional data protection guarantees.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Quick User Troubleshooting Guide
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Role Switching:</strong> Use the role switcher pill in the top header bar to switch between Student, Adviser, Panelist, Coordinator, Dean, or Admin views.
              </li>
              <li>
                <strong>PDF Upload &amp; Checksum:</strong> Ensure uploaded manuscripts are valid PDFs under 50 MB; every upload automatically generates a SHA-256 tamper-evident hash and notifies your Adviser.
              </li>
              <li>
                <strong>Digital Signatures:</strong> Faculty and committee members can draw or upload their signature above so rubric evaluations and certificates can be cryptographically signed.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-emerald-600" /> Disaster Recovery &amp; Data Backup Guarantee
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All manuscripts, annotations, rubric scores, and digital signatures are protected by automated daily WAL backups, Point-in-Time Recovery (PITR), and SHA-256 verified institutional JSON snapshots.
            </p>
          </div>

          {canAccessAdminConsole && (
            <div className="pt-1">
              <Link href="/admin/system-health">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  Open Full Maintenance, Troubleshooting &amp; Disaster Recovery Console
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "New comments on manuscripts",
            "Defense schedule updates",
            "Grade releases",
            "Revision requests",
          ].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-sm">{item}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-red-200 bg-red-50/10">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            After signing out, you will need to re-authenticate to access your papers, annotation logs, or grades.
          </p>
          <Button variant="danger" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
