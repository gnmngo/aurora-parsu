import type { SupabaseClient } from "@supabase/supabase-js";

/** Compute SHA-256 checksum for uploaded PDF integrity */
export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Get a time-limited signed URL for private manuscript bucket */
export async function getManuscriptSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("manuscripts")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
  return data.signedUrl;
}

export interface PercentCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Convert pixel rect to percentage-based coordinates (zoom-independent) */
export function pixelsToPercentCoords(
  rect: DOMRect,
  containerRect: DOMRect
): PercentCoordinates {
  const pct = (v: number, total: number) =>
    Number(((v / total) * 100).toFixed(2));
  return {
    left: pct(rect.left - containerRect.left, containerRect.width),
    top: pct(rect.top - containerRect.top, containerRect.height),
    width: pct(rect.width, containerRect.width),
    height: pct(rect.height, containerRect.height),
  };
}

export function normalizePercentCoords(
  left: number,
  top: number,
  width: number,
  height: number
): PercentCoordinates {
  return {
    left: Number(left.toFixed(2)),
    top: Number(top.toFixed(2)),
    width: Number(Math.max(width, 1).toFixed(2)),
    height: Number(Math.max(height, 1).toFixed(2)),
  };
}
