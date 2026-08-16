"use client";

/**
 * Signature Profile Setup Wizard
 * Sprint 2D — Verified Electronic Signature System
 *
 * Shown to panelists who have not yet registered an official signature.
 * This is a one-time setup that creates their `signature_profiles` record.
 *
 * Steps:
 * 1. Fill in professional details
 * 2. Draw or upload signature
 * 3. Submit to create profile
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenTool, Type, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveSignatureProfileAction } from "@/lib/signatures/actions";

interface SignatureProfileSetupProps {
  panelistName: string;
  panelistEmail: string;
  onComplete: (profileId: string) => void;
  onDismiss?: () => void;
}

export function SignatureProfileSetup({
  panelistName,
  panelistEmail,
  onComplete,
  onDismiss,
}: SignatureProfileSetupProps) {
  const [step, setStep] = useState<"details" | "signature" | "review">("details");
  const [fullName, setFullName] = useState(panelistName);
  const [academicRank, setAcademicRank] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [officialEmail, setOfficialEmail] = useState(panelistEmail);
  const [signatureTab, setSignatureTab] = useState("draw");
  const [typedText, setTypedText] = useState(panelistName);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureCapture, setSignatureCapture] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (step !== "signature" || signatureTab !== "draw") return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth || 480;
      canvas.height = canvas.offsetHeight || 160;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, canvas.height - 40);
      ctx.lineTo(canvas.width - 24, canvas.height - 40);
      ctx.stroke();
    }, 100);
    return () => clearTimeout(timer);
  }, [step, signatureTab]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    captureDrawn();
  };

  const captureDrawn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureCapture(canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Redraw the guide line
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, canvas.height - 40);
    ctx.lineTo(canvas.width - 24, canvas.height - 40);
    ctx.stroke();
    setSignatureCapture(null);
  };

  const captureTyped = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1e293b";
    ctx.font = "italic 42px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
    setSignatureCapture(canvas.toDataURL("image/png"));
  };

  const handleDetailsNext = () => {
    if (!fullName.trim() || !academicRank.trim() || !officialEmail.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setStep("signature");
  };

  const handleSignatureNext = () => {
    if (!signatureCapture) {
      toast.error("Please draw or type your signature before proceeding.");
      return;
    }
    setStep("review");
  };

  const handleSubmit = async () => {
    if (!signatureCapture) return;
    setSubmitting(true);
    try {
      const result = await saveSignatureProfileAction({
        fullName,
        academicRank,
        employeeNumber: employeeNumber || undefined,
        officialEmail,
        signatureImageBase64: signatureCapture,
      });
      toast.success("Signature profile registered successfully!");
      onComplete(result.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to register signature: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Register Official Signature</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-time setup required before signing evaluations
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { key: "details", label: "1. Details" },
              { key: "signature", label: "2. Signature" },
              { key: "review", label: "3. Review" },
            ].map((s) => (
              <Badge
                key={s.key}
                variant={step === s.key ? "default" : "outline"}
                className="text-[10px] font-bold"
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">

          {/* Step 1: Professional Details */}
          {step === "details" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Your signature profile is permanently linked to your account. Once verified by a coordinator, it cannot be changed without re-verification.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sig-full-name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="sig-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Juan Dela Cruz"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sig-rank">Academic Rank <span className="text-red-500">*</span></Label>
                  <Input
                    id="sig-rank"
                    value={academicRank}
                    onChange={(e) => setAcademicRank(e.target.value)}
                    placeholder="Assistant Professor II"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sig-empno">Employee Number</Label>
                  <Input
                    id="sig-empno"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="PSU-2026-0001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sig-email">Official Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="sig-email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="jdelacruz@parsu.edu.ph"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {onDismiss && (
                  <Button variant="outline" onClick={onDismiss}>Skip for now</Button>
                )}
                <Button onClick={handleDetailsNext}>Continue →</Button>
              </div>
            </div>
          )}

          {/* Step 2: Draw/Type Signature */}
          {step === "signature" && (
            <div className="space-y-4">
              <Tabs value={signatureTab} onValueChange={setSignatureTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw" className="gap-1.5">
                    <PenTool className="h-3.5 w-3.5" /> Draw
                  </TabsTrigger>
                  <TabsTrigger value="type" className="gap-1.5">
                    <Type className="h-3.5 w-3.5" /> Type
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="draw" className="mt-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Draw your signature using mouse or touch below:</p>
                    <div className="relative rounded-xl border-2 border-dashed border-border overflow-hidden bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-40 cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={clearCanvas}>Clear</Button>
                  </div>
                </TabsContent>
                <TabsContent value="type" className="mt-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Type your full name — it will be rendered in cursive font:</p>
                    <Input
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder="Full name..."
                      className="font-serif italic text-lg"
                    />
                    <Button variant="outline" size="sm" onClick={captureTyped}>
                      Preview Signature
                    </Button>
                    {signatureCapture && (
                      <div className="rounded-xl border border-border p-3 bg-white">
                        <img src={signatureCapture} alt="Typed signature preview" className="h-16 mx-auto" />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("details")}>← Back</Button>
                <Button onClick={handleSignatureNext}>Continue →</Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border divide-y divide-border">
                <div className="p-4 space-y-0.5">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Full Name</p>
                  <p className="font-bold text-sm">{fullName}</p>
                </div>
                <div className="p-4 space-y-0.5">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Academic Rank</p>
                  <p className="font-bold text-sm">{academicRank}</p>
                </div>
                <div className="p-4 space-y-0.5">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Official Email</p>
                  <p className="font-bold text-sm">{officialEmail}</p>
                </div>
                {signatureCapture && (
                  <div className="p-4 space-y-2">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Signature Preview</p>
                    <div className="rounded-lg border border-border bg-white p-2 flex items-center justify-center">
                      <img src={signatureCapture} alt="Signature preview" className="h-16" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-xs text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>By submitting, you confirm this is your official academic signature. It will be cryptographically fingerprinted and linked to your AURORA account.</p>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("signature")}>← Back</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...</>
                    : <><ShieldCheck className="h-4 w-4 mr-2" /> Register Signature</>
                  }
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
