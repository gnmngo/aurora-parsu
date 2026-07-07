"use client";

import React, { useRef, useState, useEffect } from "react";
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
import { PenTool, Type, FileImage, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignComplete: (signatureData: {
    signatureType: "drawn" | "typed" | "uploaded";
    signatureImage: string;
    printedName: string;
    positionRole: string;
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
  const [activeTab, setActiveTab] = useState<string>("draw");
  const [printedName, setPrintedName] = useState(panelistName);
  const [positionRole, setPositionRole] = useState(panelistRole || "Panel Member");
  const [typedText, setTypedText] = useState(panelistName);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Canvas settings
  useEffect(() => {
    if (!open || activeTab !== "draw") return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size matching display size
      canvas.width = canvas.offsetWidth || 400;
      canvas.height = canvas.offsetHeight || 150;

      // Draw background grid lines/line helper
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 40);
      ctx.lineTo(canvas.width - 20, canvas.height - 40);
      ctx.stroke();
    }, 100);

    return () => clearTimeout(timer);
  }, [open, activeTab]);

  // Handle Typed Signature rendering on canvas
  useEffect(() => {
    if (!open || activeTab !== "type") return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 400;
      canvas.height = 150;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "italic 36px cursive, 'Brush Script MT', 'Great Vibes', sans-serif";
      ctx.fillStyle = "#1e3a8a"; // Royal blue color
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedText || "Sign Here", canvas.width / 2, canvas.height / 2);
    }, 100);

    return () => clearTimeout(timer);
  }, [open, activeTab, typedText]);

  // Drawing event coords helper
  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1e3a8a"; // Royal Blue
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (activeTab === "draw") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 40);
      ctx.lineTo(canvas.width - 20, canvas.height - 40);
      ctx.stroke();
    }
  };

  const handleSignSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!printedName.trim()) {
      toast.error("Please enter your printed name.");
      return;
    }

    if (!isAgreed) {
      toast.error("You must agree to the electronic signature policy check.");
      return;
    }

    setSubmitting(true);
    try {
      // Export signature as PNG Base64 data URL
      const signatureImage = canvas.toDataURL("image/png");

      await onSignComplete({
        signatureType: activeTab as "drawn" | "typed" | "uploaded",
        signatureImage,
        printedName: printedName.trim(),
        positionRole: positionRole.trim(),
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit signature.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verified Electronic Signature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Grade Summary Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Evaluation Verdict</p>
              <h4 className="text-sm font-bold text-foreground mt-0.5">{verdictLabel}</h4>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Total Score</p>
              <h4 className="text-2xl font-black text-primary">{totalScore.toFixed(1)}</h4>
            </div>
          </div>

          {/* Printed Name & Role Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="printed-name" className="text-xs">Printed Full Name</Label>
              <Input
                id="printed-name"
                value={printedName}
                onChange={(e) => {
                  setPrintedName(e.target.value);
                  setTypedText(e.target.value);
                }}
                className="h-8 text-xs"
                placeholder="e.g. Dr. Juan Dela Cruz"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="position-role" className="text-xs">Position / Academic Role</Label>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw" className="text-xs gap-1.5 py-1">
                <PenTool className="h-3.5 w-3.5" /> Draw Signature
              </TabsTrigger>
              <TabsTrigger value="type" className="text-xs gap-1.5 py-1">
                <Type className="h-3.5 w-3.5" /> Type Signature
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="mt-2 space-y-2">
              <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10 h-36">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block touch-none cursor-crosshair"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 h-6 text-[10px] rounded-lg px-2"
                >
                  Clear
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Draw your signature on the canvas area above using your mouse, trackpad, or touch screen.
              </p>
            </TabsContent>

            <TabsContent value="type" className="mt-2 space-y-2">
              <div className="space-y-2">
                <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10 h-36 flex items-center justify-center">
                  <canvas ref={canvasRef} className="hidden" />
                  <p className="italic text-4xl text-primary text-center select-none font-serif font-medium" style={{ fontFamily: "cursive, 'Brush Script MT', serif" }}>
                    {typedText || "Sign Here"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    className="absolute bottom-2 right-2 h-6 text-[10px] rounded-lg px-2"
                  >
                    Reset
                  </Button>
                </div>
                <Input
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Enter text to stylize..."
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Legal Consent Checkbox */}
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/5 p-3.5 text-xs text-warning-foreground leading-relaxed">
            <input
              type="checkbox"
              id="legal-checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-warning text-primary focus:ring-primary/20 accent-amber-600 cursor-pointer"
            />
            <Label htmlFor="legal-checkbox" className="text-[11px] text-amber-900 font-medium select-none cursor-pointer">
              I authorize this electronic signature to be permanently locked to this evaluation sheet. I certify that these scores and feedback comments represent my authentic review of the research manuscript and are legally binding under Partido State University policies.
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-xl" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSignSubmit} className="h-9 text-xs rounded-xl shadow-lg shadow-primary/15" disabled={submitting || !isAgreed}>
            {submitting ? "Signing & Submitting..." : "Sign & Submit Grade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
