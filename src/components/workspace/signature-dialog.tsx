"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Type, ShieldCheck, Upload, X, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignComplete: (signatureData: {
    signatureType: "drawn" | "typed" | "uploaded";
    signatureImage: string;
    printedName: string;
    positionRole: string;
    password: string;
  }) => Promise<void>;
  totalScore: number;
  verdictLabel: string;
  panelistName: string;
  panelistRole: string;
}

export function SignatureDialog({
  open,
  onOpenChange,
  onSignComplete,
  totalScore,
  verdictLabel,
  panelistName,
  panelistRole,
}: SignatureDialogProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
  const [printedName, setPrintedName] = useState(panelistName);
  const [positionRole, setPositionRole] = useState(panelistRole || "Defense Panel Member");
  const [typedText, setTypedText] = useState(panelistName);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strokePointsRef = useRef<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dedicated canvas references to eliminate ref collisions across tabs
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep name synced if prop changes
  useEffect(() => {
    if (panelistName) {
      setPrintedName(panelistName);
      setTypedText(panelistName);
    }
    if (panelistRole) {
      setPositionRole(panelistRole);
    }
  }, [panelistName, panelistRole]);

  // High-DPI Draw Canvas Initialization
  const initDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 440;
    const height = rect.height || 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#1e3a8a"; // PSU Navy / Royal Blue
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // High-DPI Typed Canvas Renderer
  const renderTypedSignature = useCallback(() => {
    const canvas = typeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 440;
    const height = rect.height || 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.font = "italic 38px 'Great Vibes', 'Brush Script MT', cursive, Georgia, serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedText || "Sign Here", width / 2, height / 2);
  }, [typedText]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      if (activeTab === "draw") {
        initDrawCanvas();
      } else if (activeTab === "type") {
        renderTypedSignature();
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [open, activeTab, initDrawCanvas, renderTypedSignature]);

  // Handle Typed Text live re-render
  useEffect(() => {
    if (open && activeTab === "type") {
      renderTypedSignature();
    }
  }, [typedText, open, activeTab, renderTypedSignature]);

  // Drawing Coordinate Helper
  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    strokePointsRef.current += 1;
    if (strokePointsRef.current >= 12) {
      setHasDrawn(true);
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    strokePointsRef.current += 1;
    if (strokePointsRef.current >= 12) {
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    strokePointsRef.current = 0;
    setHasDrawn(false);
  };

  // Upload signature handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Signature image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setUploadedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSignSubmit = async () => {
    if (!printedName.trim()) {
      toast.error("Please enter your printed full name.");
      return;
    }

    if (!positionRole.trim()) {
      toast.error("Please specify your position or academic role.");
      return;
    }

    if (!isAgreed) {
      toast.error("You must accept the institutional signature policy certification.");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter your account password to verify your identity under RA 8792.");
      return;
    }

    let finalSignatureImage = "";

    if (activeTab === "draw") {
      const canvas = drawCanvasRef.current;
      if (!canvas || !hasDrawn || strokePointsRef.current < 12) {
        toast.error("Please draw a complete signature before submitting.");
        return;
      }
      finalSignatureImage = canvas.toDataURL("image/png");
    } else if (activeTab === "type") {
      const canvas = typeCanvasRef.current;
      if (!canvas || !typedText.trim()) {
        toast.error("Please enter text for your stylized signature.");
        return;
      }
      finalSignatureImage = canvas.toDataURL("image/png");
    } else if (activeTab === "upload") {
      if (!uploadedImage) {
        toast.error("Please select a signature image to upload.");
        return;
      }
      finalSignatureImage = uploadedImage;
    }

    if (!finalSignatureImage) {
      toast.error("Missing signature image.");
      return;
    }

    setSubmitting(true);
    try {
      await onSignComplete({
        signatureType: activeTab === "draw" ? "drawn" : activeTab === "type" ? "typed" : "uploaded",
        signatureImage: finalSignatureImage,
        printedName: printedName.trim(),
        positionRole: positionRole.trim(),
        password: password.trim(),
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply electronic signature.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verified Electronic Signature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Grade Summary Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Evaluation Verdict</p>
              <h4 className="text-xs font-bold text-foreground mt-0.5">{verdictLabel}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Score</p>
              <h4 className="text-2xl font-black text-primary">{totalScore.toFixed(1)}</h4>
            </div>
          </div>

          {/* Printed Name & Role Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="printed-name" className="text-xs font-semibold">Printed Full Name</Label>
              <Input
                id="printed-name"
                value={printedName}
                onChange={(e) => {
                  setPrintedName(e.target.value);
                  if (activeTab === "type" && typedText === printedName) {
                    setTypedText(e.target.value);
                  }
                }}
                className="h-8 text-xs"
                placeholder="e.g. Dr. Maria Santos"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="position-role" className="text-xs font-semibold">Position / Role</Label>
              <Input
                id="position-role"
                value={positionRole}
                onChange={(e) => setPositionRole(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Panel Chair"
                required
              />
            </div>
          </div>

          {/* Signature Type Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="draw" className="text-xs gap-1.5 py-1">
                <PenTool className="h-3.5 w-3.5" /> Draw
              </TabsTrigger>
              <TabsTrigger value="type" className="text-xs gap-1.5 py-1">
                <Type className="h-3.5 w-3.5" /> Type
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs gap-1.5 py-1">
                <Upload className="h-3.5 w-3.5" /> Upload
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DRAW SIGNATURE */}
            <TabsContent value="draw" className="mt-2 space-y-2">
              <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10 h-36">
                <canvas
                  ref={drawCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block touch-none cursor-crosshair relative z-10"
                />
                {/* Visual guideline (rendered as CSS element so it does not bake into signature PNG) */}
                <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none z-0" />
                <span className="absolute bottom-2 left-6 text-[9px] text-muted-foreground pointer-events-none select-none z-0">
                  Signature Line
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 h-6 text-[10px] rounded-lg px-2 z-20"
                >
                  Clear
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Draw your signature on the canvas area above using your mouse, trackpad, or touch screen.
              </p>
            </TabsContent>

            {/* TAB 2: TYPE SIGNATURE */}
            <TabsContent value="type" className="mt-2 space-y-2">
              <div className="space-y-2">
                <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10 h-36 flex items-center justify-center">
                  <canvas ref={typeCanvasRef} className="w-full h-full" />
                  <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none" />
                </div>
                <Input
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Enter name to stylize as electronic signature..."
                />
              </div>
            </TabsContent>

            {/* TAB 3: UPLOAD SIGNATURE */}
            <TabsContent value="upload" className="mt-2 space-y-2">
              <div className="relative border border-dashed border-border rounded-xl p-4 bg-muted/10 min-h-[144px] flex flex-col items-center justify-center text-center">
                {uploadedImage ? (
                  <div className="space-y-2 w-full">
                    <div className="h-24 max-w-[240px] mx-auto p-2 bg-white rounded-lg border border-border flex items-center justify-center">
                      <img
                        src={uploadedImage}
                        alt="Uploaded Signature Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <X className="h-3 w-3 mr-1" /> Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-7 w-7 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">Upload Scanned Signature</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, or WebP with transparent background recommended (max 2MB)</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-[10px] rounded-lg mt-1"
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Legal Consent Checkbox */}
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning-foreground leading-relaxed">
            <input
              type="checkbox"
              id="legal-checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-warning text-primary focus:ring-primary/20 accent-amber-600 cursor-pointer"
            />
            <Label htmlFor="legal-checkbox" className="text-[11px] text-amber-900 font-medium select-none cursor-pointer">
              I certify that these scores and comments represent my authentic academic evaluation under Partido State University policies. I understand that submitting this verified electronic signature permanently locks this evaluation sheet from further modification.
            </Label>
          </div>

          {/* Password Re-Authentication Field (RA 8792 Legal Non-Repudiation) */}
          <div className="space-y-2 rounded-xl border border-primary/20 bg-slate-50/80 p-3.5 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="sig-password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Confirm ParSU Password
              </Label>
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                RA 8792 Non-Repudiation
              </span>
            </div>
            <div className="relative">
              <Input
                id="sig-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password to confirm..."
                className="h-9 pr-9 text-xs font-mono"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Re-entering your password legally certifies your identity at the moment of signing and prevents unauthorized submissions from unattended sessions.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-xl" disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSignSubmit}
            className="h-9 text-xs rounded-xl shadow-lg shadow-primary/15"
            disabled={submitting || !isAgreed || !password.trim()}
          >
            {submitting ? "Verifying & Signing..." : "Sign & Submit Grade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
