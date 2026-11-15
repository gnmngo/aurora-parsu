"use client";

/**
 * VerificationQRCode
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
  size = 104,
}: VerificationQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!certificateSerial) return;

    const rawOrigin =
      baseUrl ??
      (typeof window !== "undefined" ? window.location.origin : "https://aurora-parsu.vercel.app");
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const origin = isLocalhost
      ? process.env.NEXT_PUBLIC_SITE_URL || "https://aurora-parsu.vercel.app"
      : rawOrigin;
    const verifyUrl = `${origin.replace(/\/$/, "")}/verify/${encodeURIComponent(certificateSerial.trim())}`;

    QRCode.toDataURL(verifyUrl, {
      width: Math.max(size * 4, 360), // High-DPI crispness for phone cameras & print
      margin: 3, // Standard quiet zone required by mobile QR scanners
      color: {
        dark: "#000000",
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
        className="border border-slate-200 rounded flex items-center justify-center bg-white"
      >
        <span className="text-[8px] text-slate-400 text-center px-1">QR N/A</span>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="border border-slate-100 rounded bg-white animate-pulse"
      />
    );
  }

  return (
    <a
      href={`/verify/${encodeURIComponent(certificateSerial.trim())}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Scan with phone camera or click to verify ${certificateSerial}`}
      className="inline-block rounded-lg border border-slate-200 bg-white p-1 shadow-2xs hover:ring-2 hover:ring-primary/40 transition-all"
    >
      <img
        src={qrDataUrl}
        alt={`QR code — verify certificate ${certificateSerial}`}
        width={size}
        height={size}
        className="block bg-white"
        style={{ imageRendering: "pixelated", width: size, height: size }}
      />
    </a>
  );
}
