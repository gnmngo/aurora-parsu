"use client";

/**
 * VerificationQRCode — Sprint 2F/10
 *
 * Generates a real QR code linking to /verify/{certificateSerial}
 * Uses the `qrcode` package to produce a data URL, displayed as an img.
 *
 * Security: The QR encodes only the public verification URL — no private data.
 * Dependencies: qrcode (already installed, no new peer deps)
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface VerificationQRCodeProps {
  certificateSerial: string;
  /** Override base URL (default: window.location.origin) */
  baseUrl?: string;
  size?: number;
}

export function VerificationQRCode({
  certificateSerial,
  baseUrl,
  size = 80,
}: VerificationQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!certificateSerial) return;

    const origin = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    const verifyUrl = `${origin}/verify/${encodeURIComponent(certificateSerial)}`;

    QRCode.toDataURL(verifyUrl, {
      width: size * 2, // 2× for crisp rendering
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err: unknown) => {
        console.error("[VerificationQRCode] QR generation failed:", err);
        setError(true);
      });
  }, [certificateSerial, baseUrl, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="border border-slate-200 rounded flex items-center justify-center bg-slate-50"
      >
        <span className="text-[8px] text-slate-400 text-center px-1">QR N/A</span>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="border border-slate-100 rounded bg-slate-50 animate-pulse"
      />
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt={`QR code — verify certificate ${certificateSerial}`}
      width={size}
      height={size}
      className="rounded border border-slate-100 bg-white"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
