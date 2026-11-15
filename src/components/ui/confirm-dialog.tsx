"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const iconConfig = {
    danger: {
      icon: ShieldAlert,
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
      btn: "bg-rose-600 hover:bg-rose-700 text-white",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    success: {
      icon: CheckCircle2,
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    default: {
      icon: Info,
      bg: "bg-primary/10 border-primary/20 text-primary",
      btn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  }[variant];

  const Icon = iconConfig.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                iconConfig.bg
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-base font-bold text-foreground leading-snug">
                {title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {description}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl px-4 text-xs font-bold cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "h-9 rounded-xl px-4 text-xs font-bold gap-1.5 shadow-xs cursor-pointer",
              iconConfig.btn
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
